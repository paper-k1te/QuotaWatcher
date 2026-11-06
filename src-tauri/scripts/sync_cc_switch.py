import sqlite3
import json
import os
import sys

def get_cc_switch_data():
    home = os.path.expanduser("~")
    db_path = os.path.join(home, ".cc-switch", "cc-switch.db")
    if not os.path.exists(db_path):
        appdata = os.environ.get("APPDATA", "")
        db_path = os.path.join(appdata, "cc-switch", "cc-switch.db")
        if not os.path.exists(db_path):
            return {"success": False, "error": "cc-switch.db not found"}

    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        # 1. Query providers
        providers = []
        for r in c.execute("SELECT id, app_type, name, category, is_current, settings_config FROM providers"):
            cfg = {}
            try:
                cfg = json.loads(r[5]) if r[5] else {}
            except:
                pass
            providers.append({
                "id": r[0],
                "appType": r[1],
                "name": r[2],
                "category": r[3] or "relay",
                "isCurrent": bool(r[4]),
                "apiUrl": cfg.get("apiUrl") or cfg.get("baseUrl") or "",
                "model": cfg.get("model") or ""
            })

        # 2. Query today's usage rollup
        today_usage = {"costUsd": 0.0, "totalTokens": 0, "requestCount": 0}
        try:
            # Query sum of today's cost & tokens
            res = c.execute("""
                SELECT 
                    COALESCE(SUM(CAST(total_cost_usd AS REAL)), 0),
                    COALESCE(SUM(input_tokens + output_tokens), 0)
                FROM usage_daily_rollups 
                WHERE date = CURRENT_DATE
            """).fetchone()
            if res:
                today_usage["costUsd"] = round(float(res[0]), 2)
                today_usage["totalTokens"] = int(res[1])

            # If today has no records, fetch the latest day's records
            if today_usage["costUsd"] == 0:
                latest = c.execute("""
                    SELECT 
                        date,
                        COALESCE(SUM(CAST(total_cost_usd AS REAL)), 0),
                        COALESCE(SUM(input_tokens + output_tokens), 0)
                    FROM usage_daily_rollups 
                    GROUP BY date
                    ORDER BY date DESC 
                    LIMIT 1
                """).fetchone()
                if latest:
                    today_usage["costUsd"] = round(float(latest[1]), 2)
                    today_usage["totalTokens"] = int(latest[2])
                    today_usage["latestDate"] = latest[0]
        except Exception as e:
            today_usage["error"] = str(e)

        conn.close()
        return {
            "success": True,
            "dbPath": db_path,
            "providers": providers,
            "usage": today_usage
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "read"
    if action == "read":
        print(json.dumps(get_cc_switch_data(), ensure_ascii=False))
    elif action == "set_active" and len(sys.argv) > 3:
        app_type = sys.argv[2]
        provider_id = sys.argv[3]
        home = os.path.expanduser("~")
        db_path = os.path.join(home, ".cc-switch", "cc-switch.db")
        try:
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("UPDATE providers SET is_current = 0 WHERE app_type = ?", (app_type,))
            c.execute("UPDATE providers SET is_current = 1 WHERE app_type = ? AND id = ?", (app_type, provider_id))
            conn.commit()
            conn.close()
            print(json.dumps({"success": True, "active": provider_id}))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
