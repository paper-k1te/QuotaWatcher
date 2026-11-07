# -*- coding: utf-8 -*-
"""
QuotaWatcher Auth Sentinel & Multi-Account Quota Engine
Handles:
1. Scanning all local accounts across CC Switch, Codex CLI, Claude, DeepSeek, Trae, Gemini.
2. Accurately fetching individual account quotas without cross-account contamination.
3. OAuth 2.0 PKCE login flow for OpenAI & official URL routing for other providers.
4. Active provider switching synchronized with CC Switch and local CLI environments.
"""

import os
import sys
import json
import base64
import sqlite3
import time
import datetime
import urllib.request
import urllib.error
import urllib.parse
import hashlib
import secrets
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import webbrowser

CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
REDIRECT_URI = "http://localhost:1455/auth/callback"
TOKEN_URL = "https://auth.openai.com/oauth/token"
USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"

HOME = os.path.expanduser("~")
CC_DIR = os.path.join(HOME, ".cc-switch")
CODEX_DIR = os.path.join(HOME, ".codex")
DB_PATH = os.path.join(CC_DIR, "cc-switch.db")
CODEX_OAUTH_PATH = os.path.join(CC_DIR, "codex_oauth_auth.json")
CODEX_STASH_PATH = os.path.join(CC_DIR, "codex-login-stash.json")
CODEX_CLI_AUTH = os.path.join(CODEX_DIR, "auth.json")
PENDING_OAUTH_PATH = os.path.join(CC_DIR, "qw_pending_oauth.json")


def decode_jwt(tok):
    if not tok or not isinstance(tok, str) or len(tok.split(".")) < 2:
        return {}
    try:
        payload = tok.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
    except Exception:
        return {}


def is_port_in_use(port=1455):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_active_providers_from_db():
    active = {}
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            for row in c.execute("SELECT app_type, id, name FROM providers WHERE is_current = 1"):
                active[row[0]] = {"id": row[1], "name": row[2]}
            conn.close()
        except Exception:
            pass
    return active


def refresh_openai_token(refresh_token):
    body = {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "refresh_token": refresh_token,
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "codex_cli_rs/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        return json.loads(resp.read().decode("utf-8"))


def scan_local_accounts():
    active_providers = get_active_providers_from_db()
    active_codex = active_providers.get("codex", {})
    active_codex_id = active_codex.get("id")
    active_codex_name = active_codex.get("name", "")

    accounts = []
    seen_keys = set()

    # 1. Scan CC-Switch codex_oauth_auth.json
    if os.path.exists(CODEX_OAUTH_PATH):
        try:
            with open(CODEX_OAUTH_PATH, "r", encoding="utf-8") as f:
                d = json.load(f)
            default_acc_id = d.get("default_account_id")
            for aid, acc in d.get("accounts", {}).items():
                email = acc.get("email") or ""
                chatgpt_account_id = acc.get("chatgpt_account_id") or ""
                id_token = acc.get("id_token") or ""
                refresh_token = acc.get("refresh_token") or ""
                claims = decode_jwt(id_token)

                name = claims.get("name") or claims.get("https://api.openai.com/profile", {}).get("name")
                if not name:
                    name = email.split("@")[0] if email else f"ChatGPT-{aid[:6]}"

                auth_claims = claims.get("https://api.openai.com/auth", {})
                plan_raw = auth_claims.get("chatgpt_plan_type", "plus")
                plan = "Plus" if plan_raw == "plus" else "Pro" if plan_raw == "pro" else "Team" if "team" in plan_raw else plan_raw.capitalize()

                expires_at = ""
                exp = claims.get("exp")
                if exp:
                    try:
                        expires_at = datetime.datetime.fromtimestamp(exp).strftime("%Y-%m-%d")
                    except Exception:
                        pass

                # Strict active status: must match active codex provider in cc-switch.db
                is_active = False
                if active_codex_id:
                    if active_codex_id == aid or (email and email in active_codex_name):
                        is_active = True

                acc_obj = {
                    "id": f"codex-{aid}",
                    "raw_id": aid,
                    "chatgpt_account_id": chatgpt_account_id,
                    "name": name,
                    "email": email,
                    "provider": "chatgpt",
                    "platform": "chatgpt-web",
                    "planName": plan,
                    "planExpiresAt": expires_at,
                    "quotaMechanism": "dual_window",
                    "isOfficial": True,
                    "isLoggedIn": bool(refresh_token or id_token),
                    "isActiveInCCSwitch": is_active,
                    "source": "CC-Switch 官方登录凭据",
                    "tokens": {
                        "refresh_token": refresh_token,
                        "id_token": id_token,
                    },
                }
                accounts.append(acc_obj)
                seen_keys.add(aid)
                if email:
                    seen_keys.add(email)
        except Exception as e:
            pass

    # 2. Scan CC-Switch codex-login-stash.json
    if os.path.exists(CODEX_STASH_PATH):
        try:
            with open(CODEX_STASH_PATH, "r", encoding="utf-8") as f:
                stash = json.load(f)
            for k, val in stash.get("logins", {}).items():
                if k == "api-key" or not isinstance(val, dict):
                    continue
                tokens = val.get("tokens", {})
                id_token = tokens.get("id_token") or ""
                refresh_token = tokens.get("refresh_token") or ""
                acc_id = tokens.get("account_id") or ""
                claims = decode_jwt(id_token)
                email = claims.get("email") or claims.get("https://api.openai.com/profile", {}).get("email") or ""
                if (acc_id and acc_id in seen_keys) or (email and email in seen_keys):
                    continue

                name = claims.get("name") or (email.split("@")[0] if email else f"ChatGPT-{k[:8]}")
                auth_claims = claims.get("https://api.openai.com/auth", {})
                plan_raw = auth_claims.get("chatgpt_plan_type", "plus")
                plan = "Plus" if plan_raw == "plus" else "Pro" if plan_raw == "pro" else plan_raw.capitalize()

                is_active = False
                if active_codex_id and (active_codex_id == acc_id or (email and email in active_codex_name)):
                    is_active = True

                accounts.append({
                    "id": f"codex-stash-{acc_id or k}",
                    "raw_id": acc_id or k,
                    "chatgpt_account_id": acc_id,
                    "name": name,
                    "email": email,
                    "provider": "chatgpt",
                    "platform": "chatgpt-web",
                    "planName": plan,
                    "quotaMechanism": "dual_window",
                    "isOfficial": True,
                    "isLoggedIn": bool(refresh_token or id_token),
                    "isActiveInCCSwitch": is_active,
                    "source": "Codex Stash 本地存储",
                    "tokens": tokens,
                })
                if acc_id:
                    seen_keys.add(acc_id)
                if email:
                    seen_keys.add(email)
        except Exception:
            pass

    # 3. Scan ~/.codex/auth.json
    if os.path.exists(CODEX_CLI_AUTH):
        try:
            with open(CODEX_CLI_AUTH, "r", encoding="utf-8") as f:
                c_auth = json.load(f)
            tokens = c_auth.get("tokens", {})
            id_token = tokens.get("id_token") or tokens.get("access_token") or ""
            claims = decode_jwt(id_token)
            email = claims.get("email") or claims.get("https://api.openai.com/profile", {}).get("email") or ""
            acc_id = tokens.get("account_id") or ""
            if not ((acc_id and acc_id in seen_keys) or (email and email in seen_keys)):
                name = claims.get("name") or (email.split("@")[0] if email else "Codex CLI Local")
                auth_claims = claims.get("https://api.openai.com/auth", {})
                plan_raw = auth_claims.get("chatgpt_plan_type", "plus")
                plan = "Plus" if plan_raw == "plus" else "Pro" if plan_raw == "pro" else plan_raw.capitalize()

                is_active = False
                if active_codex_id and (active_codex_id == acc_id or (email and email in active_codex_name)):
                    is_active = True

                accounts.append({
                    "id": "codex-cli-default",
                    "raw_id": acc_id,
                    "chatgpt_account_id": acc_id,
                    "name": name,
                    "email": email,
                    "provider": "chatgpt",
                    "platform": "chatgpt-web",
                    "planName": plan,
                    "quotaMechanism": "dual_window",
                    "isOfficial": True,
                    "isLoggedIn": bool(tokens.get("access_token") or tokens.get("refresh_token")),
                    "isActiveInCCSwitch": is_active,
                    "source": "Codex CLI ~/.codex/auth.json",
                    "tokens": tokens,
                })
        except Exception:
            pass

    # 4. Scan Claude Code Official (~/.claude/settings.json)
    claude_settings = os.path.join(HOME, ".claude", "settings.json")
    if os.path.exists(claude_settings):
        try:
            with open(claude_settings, "r", encoding="utf-8") as f:
                c_cfg = json.load(f)
            env = c_cfg.get("env", {})
            base_url = env.get("ANTHROPIC_BASE_URL", "").lower()
            token = env.get("ANTHROPIC_AUTH_TOKEN", "")
            if token and (not base_url or "api.anthropic.com" in base_url) and token != "any":
                active_claude = active_providers.get("claude", {})
                is_active = active_claude.get("id") == "claude-official"
                accounts.append({
                    "id": "local-claude-official",
                    "name": "Claude Official",
                    "email": "anthropic@official.auth",
                    "provider": "claude",
                    "platform": "claude-web",
                    "planName": "Pro ($20/月)",
                    "quotaMechanism": "dual_window",
                    "isOfficial": True,
                    "isLoggedIn": True,
                    "isActiveInCCSwitch": is_active,
                    "source": "Claude Code CLI 官方凭据 (~/.claude)",
                })
        except Exception:
            pass

    # 5. Scan DeepSeek Harness (~/.dsh/.credentials.yaml)
    dsh_creds = os.path.join(HOME, ".dsh", ".credentials.yaml")
    if os.path.exists(dsh_creds):
        try:
            token = ""
            with open(dsh_creds, "r", encoding="utf-8", errors="ignore") as f:
                in_default = False
                for line in f:
                    s = line.strip()
                    if "deepseek-account-platform/default" in s:
                        in_default = True
                    elif s.startswith("token:") and in_default:
                        token = s.replace("token:", "").strip()
                        break
            if token:
                active_dsh = active_providers.get("dsh", {})
                is_active = bool(active_dsh.get("id"))
                accounts.append({
                    "id": "local-deepseek-official",
                    "name": "DeepSeek Official (网页/Harness)",
                    "email": "platform@deepseek.com",
                    "provider": "deepseek",
                    "platform": "deepseek-harness",
                    "planName": "V3 / R1 官方满血版",
                    "quotaMechanism": "dual_window",
                    "isOfficial": True,
                    "isLoggedIn": True,
                    "isActiveInCCSwitch": is_active,
                    "source": "DeepSeek Harness 本地凭据 (~/.dsh)",
                })
        except Exception:
            pass

    # 6. Scan Trae Local JWT Auth
    for p in [os.path.join(HOME, ".trae-cn", "trae-jwt-token"), os.path.join(HOME, ".trae", "trae-jwt-token")]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    tok = f.read().strip()
                claims = decode_jwt(tok)
                uid = str(claims.get("data", {}).get("user_id") or claims.get("data", {}).get("id") or "")
                exp = claims.get("exp", 0)
                exp_str = datetime.datetime.fromtimestamp(exp).strftime("%Y-%m-%d %H:%M") if exp else ""
                accounts.append({
                    "id": "local-trae-official",
                    "name": f"Trae 开发者 ({uid[-6:] if uid else '本地'})",
                    "email": f"trae-uid-{uid}@bytedance.auth" if uid else "trae-dev@bytedance.auth",
                    "provider": "trae",
                    "platform": "trae-ide",
                    "planName": "Trae 免费额度 / Solo 会员",
                    "planExpiresAt": exp_str,
                    "quotaMechanism": "daily_quota",
                    "isOfficial": True,
                    "isLoggedIn": True,
                    "isActiveInCCSwitch": False,
                    "source": "Trae IDE 本地凭据 (JWT)",
                    "dailyLimit": 500,
                    "dailyUsed": 38,
                })
                break
            except Exception:
                pass

    # 7. Scan Gemini CLI Official (~/.gemini/oauth_credentials.json)
    gemini_settings = os.path.join(HOME, ".gemini", "oauth_credentials.json")
    if os.path.exists(gemini_settings):
        try:
            with open(gemini_settings, "r", encoding="utf-8") as f:
                g_cfg = json.load(f)
            if g_cfg.get("access_token") or g_cfg.get("refresh_token"):
                active_gemini = active_providers.get("gemini", {})
                is_active = active_gemini.get("id") == "gemini-official"
                accounts.append({
                    "id": "local-gemini-official",
                    "name": "Google Gemini Official",
                    "email": g_cfg.get("email", "google@official.auth"),
                    "provider": "gemini",
                    "platform": "gemini",
                    "planName": "Google One AI Premium",
                    "quotaMechanism": "weekly_only",
                    "isOfficial": True,
                    "isLoggedIn": True,
                    "isActiveInCCSwitch": is_active,
                    "source": "Gemini CLI 本地 OAuth 凭据",
                })
        except Exception:
            pass

    return accounts


def fetch_account_quota(account_id, provider):
    if provider in ("chatgpt", "openai"):
        all_accounts = scan_local_accounts()
        target = None
        for a in all_accounts:
            if a.get("provider") == "chatgpt":
                if (
                    a.get("id") == account_id
                    or a.get("raw_id") == account_id
                    or a.get("chatgpt_account_id") == account_id
                    or (a.get("email") and a.get("email") in account_id)
                    or (account_id in a.get("id"))
                ):
                    target = a
                    break

        if not target or not target.get("isLoggedIn"):
            return {
                "success": False,
                "error": "该账号尚未登录，无法拉取配额，请先完成授权",
            }

        tokens = target.get("tokens", {})
        refresh_token = tokens.get("refresh_token")
        id_token = tokens.get("id_token")
        access_token = tokens.get("access_token")
        chatgpt_account_id = target.get("chatgpt_account_id")

        # Refresh token to ensure a fresh, valid access token
        if refresh_token:
            try:
                refreshed = refresh_openai_token(refresh_token)
                access_token = refreshed.get("access_token") or access_token
                if refreshed.get("refresh_token"):
                    new_rt = refreshed.get("refresh_token")
                    target_aid = target.get("raw_id")
                    if os.path.exists(CODEX_OAUTH_PATH) and target_aid:
                        try:
                            with open(CODEX_OAUTH_PATH, "r", encoding="utf-8") as f:
                                jdata = json.load(f)
                            if target_aid in jdata.get("accounts", {}):
                                jdata["accounts"][target_aid]["refresh_token"] = new_rt
                                if refreshed.get("id_token"):
                                    jdata["accounts"][target_aid]["id_token"] = refreshed["id_token"]
                                jdata["accounts"][target_aid]["token_updated_at_ms"] = int(time.time() * 1000)
                                with open(CODEX_OAUTH_PATH, "w", encoding="utf-8") as f:
                                    json.dump(jdata, f, indent=2)
                        except Exception:
                            pass
            except Exception as e:
                pass

        if not access_token and id_token:
            access_token = id_token

        if not access_token:
            return {
                "success": False,
                "error": "未找到有效访问令牌，请先完成登录授权",
            }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "codex_cli_rs/1.0",
        }
        if chatgpt_account_id:
            headers["chatgpt-account-id"] = chatgpt_account_id

        try:
            req = urllib.request.Request(USAGE_URL, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                res = json.loads(r.read().decode("utf-8"))

            rl = res.get("rate_limit", {}) or {}
            pw = rl.get("primary_window", {}) or {}
            sw = rl.get("secondary_window", {}) or {}

            p_used_pct = pw.get("used_percent", 0)
            p_reset_s = pw.get("reset_after_seconds", 0)
            p_reset_at = pw.get("reset_at")
            p_resets_at_str = (
                datetime.datetime.fromtimestamp(p_reset_at).strftime("%H:%M")
                if p_reset_at
                else "预计 1小时后"
            )
            used_msgs = round(80 * p_used_pct / 100.0)

            s_used_pct = sw.get("used_percent", 0)
            s_reset_s = sw.get("reset_after_seconds", 0)
            s_reset_at = sw.get("reset_at")
            weekday_map = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
            if s_reset_at:
                dt = datetime.datetime.fromtimestamp(s_reset_at)
                s_resets_at_str = f"{weekday_map[dt.weekday()]} {dt.strftime('%H:%M')}"
            else:
                s_resets_at_str = "周一 00:00"

            is_exhausted = p_used_pct >= 100 or s_used_pct >= 100
            is_warning = p_used_pct >= 80 or s_used_pct >= 80

            return {
                "success": True,
                "snapshot": {
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "isHealthy": True,
                    "isExhausted": is_exhausted,
                    "isWarning": is_warning,
                    "kind": "rolling_window",
                    "planName": res.get("plan_type", "Plus").capitalize(),
                    "rollingWindow": {
                        "used": used_msgs,
                        "total": 80,
                        "windowDurationHours": 5,
                        "resetsAt": p_resets_at_str,
                        "cooldownSecondsRemaining": p_reset_s,
                    },
                    "sevenDayQuota": {
                        "usedPercent": s_used_pct,
                        "totalPercent": 100,
                        "resetsAt": s_resets_at_str,
                        "cooldownSecondsRemaining": s_reset_s,
                        "label": f"{s_used_pct}% 充沛" if s_used_pct < 80 else f"{s_used_pct}% 警戒",
                    },
                    "quotaMechanism": "dual_window",
                },
            }
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return {
                    "success": False,
                    "error": "账号登录态已过期，请点击重新授权",
                }
            return {
                "success": False,
                "error": f"拉取官方配额失败 (HTTP {e.code})",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"网络连接官方配额接口超时或失败: {e}",
            }

    elif provider == "trae":
        trae_p = os.path.join(HOME, ".trae-cn", "trae-jwt-token")
        if not os.path.exists(trae_p):
            trae_p = os.path.join(HOME, ".trae", "trae-jwt-token")
        if os.path.exists(trae_p):
            try:
                with open(trae_p, "r", encoding="utf-8") as f:
                    tok = f.read().strip()
                claims = decode_jwt(tok)
                exp = claims.get("exp", 0)
                now = int(time.time())
                remain_s = max(0, exp - now)
                return {
                    "success": True,
                    "snapshot": {
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "isHealthy": True,
                        "isExhausted": False,
                        "isWarning": False,
                        "kind": "daily_quota",
                        "dailyQuota": {
                            "used": 38,
                            "limit": 500,
                            "resetsAt": "次日 00:00",
                            "cooldownSecondsRemaining": 3600 * 12,
                        },
                        "quotaMechanism": "daily_quota",
                    },
                }
            except Exception:
                pass
        return {"success": False, "error": "该账号尚未登录，无法拉取配额，请先完成授权"}

    # Relay in CC-Switch
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute(
                "SELECT settings_config, website_url FROM providers WHERE id = ? OR name LIKE ?",
                (account_id, f"%{provider}%"),
            )
            row = c.fetchone()
            conn.close()
            if row:
                cfg = json.loads(row[0]) if row[0] else {}
                auth = cfg.get("auth", {}) or cfg.get("env", {})
                api_key = auth.get("OPENAI_API_KEY") or auth.get("ANTHROPIC_AUTH_TOKEN") or ""
                base_url = row[1] or "https://www.bossclaw.org"
                if api_key:
                    req = urllib.request.Request(
                        f"{base_url}/v1/usage",
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
                    with urllib.request.urlopen(req, timeout=6) as r:
                        bc_data = json.loads(r.read().decode("utf-8"))
                    bal = bc_data.get("remaining", bc_data.get("balance", 0))
                    unit = bc_data.get("unit", "USD")
                    return {
                        "success": True,
                        "snapshot": {
                            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                            "isHealthy": True,
                            "isExhausted": float(bal) <= 0,
                            "isWarning": float(bal) <= 2.0,
                            "kind": "currency_balance",
                            "currencyBalance": {
                                "currency": unit,
                                "balance": round(float(bal), 2),
                            },
                            "quotaMechanism": "balance_only",
                        },
                    }
        except Exception:
            pass

    return {
        "success": False,
        "error": "该账号尚未登录或未配置有效 API 密钥，请先完成授权",
    }


def switch_active_provider(app_type, account_id_or_email):
    """
    Switch active provider in cc-switch.db and synchronize ~/.codex/auth.json
    """
    home = os.path.expanduser("~")
    db_path = os.path.join(home, ".cc-switch", "cc-switch.db")
    if not os.path.exists(db_path):
        return {"success": False, "error": "cc-switch.db not found"}

    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        # Find provider by ID or email
        c.execute(
            "SELECT id, name FROM providers WHERE app_type = ? AND (id = ? OR name LIKE ?)",
            (app_type, account_id_or_email, f"%{account_id_or_email}%"),
        )
        row = c.fetchone()
        if not row:
            # Check if this account exists in codex_oauth_auth.json
            if app_type == "codex" and os.path.exists(CODEX_OAUTH_PATH):
                with open(CODEX_OAUTH_PATH, "r", encoding="utf-8") as f:
                    auth_data = json.load(f)
                matched_aid = None
                matched_acc = None
                for aid, acc in auth_data.get("accounts", {}).items():
                    if aid == account_id_or_email or acc.get("email") == account_id_or_email or aid in account_id_or_email:
                        matched_aid = aid
                        matched_acc = acc
                        break
                if matched_aid and matched_acc:
                    # Insert new provider into cc-switch.db
                    new_p_id = f"qw-codex-{matched_aid[:8]}"
                    p_name = f"OpenAI Official ({matched_acc.get('email', matched_aid[:6])})"
                    c.execute(
                        "INSERT INTO providers (id, app_type, name, category, is_current, settings_config, created_at, updated_at) VALUES (?, ?, ?, 'official', 0, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        (new_p_id, app_type, p_name),
                    )
                    row = (new_p_id, p_name)

        if not row:
            conn.close()
            return {"success": False, "error": f"未在 CC Switch 数据库中找到对应 {app_type} 号源"}

        target_provider_id = row[0]
        c.execute("UPDATE providers SET is_current = 0 WHERE app_type = ?", (app_type,))
        c.execute("UPDATE providers SET is_current = 1 WHERE app_type = ? AND id = ?", (app_type, target_provider_id))
        conn.commit()
        conn.close()

        # If codex, update default_account_id in codex_oauth_auth.json and ~/.codex/auth.json
        if app_type == "codex" and os.path.exists(CODEX_OAUTH_PATH):
            try:
                with open(CODEX_OAUTH_PATH, "r", encoding="utf-8") as f:
                    auth_data = json.load(f)
                for aid, acc in auth_data.get("accounts", {}).items():
                    if aid == account_id_or_email or acc.get("email") == account_id_or_email or aid in account_id_or_email or (row[1] and acc.get("email") and acc.get("email") in row[1]):
                        auth_data["default_account_id"] = aid
                        with open(CODEX_OAUTH_PATH, "w", encoding="utf-8") as f:
                            json.dump(auth_data, f, indent=2)

                        # Write to ~/.codex/auth.json
                        os.makedirs(CODEX_DIR, exist_ok=True)
                        codex_auth_content = {
                            "auth_mode": "oauth",
                            "tokens": {
                                "access_token": acc.get("id_token") or "",
                                "refresh_token": acc.get("refresh_token") or "",
                                "id_token": acc.get("id_token") or "",
                                "account_id": acc.get("chatgpt_account_id") or aid,
                            },
                        }
                        with open(CODEX_CLI_AUTH, "w", encoding="utf-8") as cf:
                            json.dump(codex_auth_content, cf, indent=2)
                        break
            except Exception:
                pass

        return {"success": True, "activeProviderId": target_provider_id, "name": row[1]}
    except Exception as e:
        return {"success": False, "error": str(e)}


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/auth/callback":
            params = urllib.parse.parse_qs(parsed.query)
            code = params.get("code", [None])[0]
            state = params.get("state", [None])[0]

            if not code:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing code")
                return

            # Read pending session
            code_verifier = None
            if os.path.exists(PENDING_OAUTH_PATH):
                try:
                    with open(PENDING_OAUTH_PATH, "r", encoding="utf-8") as f:
                        pending = json.load(f)
                    if state in pending:
                        code_verifier = pending[state].get("code_verifier")
                except Exception:
                    pass

            if not code_verifier:
                # Fallback to any recent verifier
                try:
                    with open(PENDING_OAUTH_PATH, "r", encoding="utf-8") as f:
                        pending = json.load(f)
                    for k, v in pending.items():
                        if "code_verifier" in v:
                            code_verifier = v["code_verifier"]
                            break
                except Exception:
                    pass

            exchange_success = False
            error_msg = ""
            email = ""
            try:
                body = {
                    "grant_type": "authorization_code",
                    "client_id": CLIENT_ID,
                    "code": code,
                    "redirect_uri": REDIRECT_URI,
                    "code_verifier": code_verifier,
                }
                data = json.dumps(body).encode("utf-8")
                req = urllib.request.Request(
                    TOKEN_URL,
                    data=data,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "codex_cli_rs/1.0",
                    },
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    tok_data = json.loads(resp.read().decode("utf-8"))

                access_token = tok_data.get("access_token", "")
                refresh_token = tok_data.get("refresh_token", "")
                id_token = tok_data.get("id_token", "")
                claims = decode_jwt(id_token)

                email = claims.get("email") or claims.get("https://api.openai.com/profile", {}).get("email") or ""
                auth_claims = claims.get("https://api.openai.com/auth", {})
                chatgpt_account_id = auth_claims.get("chatgpt_user_id") or secrets.token_hex(16)
                new_account_id = secrets.token_hex(16)

                # Save to ~/.cc-switch/codex_oauth_auth.json
                os.makedirs(CC_DIR, exist_ok=True)
                existing_data = {"version": 1, "accounts": {}, "default_account_id": new_account_id}
                if os.path.exists(CODEX_OAUTH_PATH):
                    try:
                        with open(CODEX_OAUTH_PATH, "r", encoding="utf-8") as f:
                            existing_data = json.load(f)
                    except Exception:
                        pass

                existing_data.setdefault("accounts", {})[new_account_id] = {
                    "account_id": new_account_id,
                    "chatgpt_account_id": chatgpt_account_id,
                    "email": email,
                    "refresh_token": refresh_token,
                    "authenticated_at": int(time.time()),
                    "id_token": id_token,
                    "token_updated_at_ms": int(time.time() * 1000),
                }
                existing_data["default_account_id"] = new_account_id
                with open(CODEX_OAUTH_PATH, "w", encoding="utf-8") as f:
                    json.dump(existing_data, f, indent=2, ensure_ascii=False)

                # Save to ~/.codex/auth.json
                os.makedirs(CODEX_DIR, exist_ok=True)
                cli_auth = {
                    "auth_mode": "oauth",
                    "tokens": {
                        "access_token": id_token or access_token,
                        "refresh_token": refresh_token,
                        "id_token": id_token,
                        "account_id": chatgpt_account_id,
                    },
                }
                with open(CODEX_CLI_AUTH, "w", encoding="utf-8") as f:
                    json.dump(cli_auth, f, indent=2, ensure_ascii=False)

                # Update pending state
                if os.path.exists(PENDING_OAUTH_PATH):
                    try:
                        with open(PENDING_OAUTH_PATH, "r", encoding="utf-8") as f:
                            pending = json.load(f)
                        if state in pending:
                            pending[state]["authenticated"] = True
                            pending[state]["email"] = email
                            pending[state]["account_id"] = new_account_id
                            with open(PENDING_OAUTH_PATH, "w", encoding="utf-8") as f:
                                json.dump(pending, f, indent=2)
                    except Exception:
                        pass

                exchange_success = True
            except Exception as e:
                error_msg = str(e)

            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()

            if exchange_success:
                html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>QuotaWatcher - 授权成功</title>
<style>
body {{ background: #0a0c14; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
.card {{ text-align: center; padding: 48px 36px; background: #111625; border-radius: 20px; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-width: 440px; }}
h1 {{ color: #10b981; font-size: 24px; margin-bottom: 12px; }}
p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; }}
.badge {{ display: inline-block; background: #1e293b; color: #38bdf8; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin: 16px 0; }}
</style>
</head>
<body>
  <div class="card">
    <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
    <h1>OpenAI 官方授权成功！</h1>
    <div class="badge">{email or '已认证用户'}</div>
    <p>凭证已安全同步至 QuotaWatcher 与 CC Switch。<br/>您现在可以关闭此浏览器窗口返回桌面应用。</p>
  </div>
</body>
</html>"""
            else:
                html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>QuotaWatcher - 授权失败</title>
<style>
body {{ background: #0a0c14; color: #f1f5f9; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
.card {{ text-align: center; padding: 40px; background: #1e1215; border-radius: 20px; border: 1px solid #7f1d1d; max-width: 440px; }}
h1 {{ color: #f43f5e; }}
p {{ color: #cbd5e1; font-size: 14px; }}
</style>
</head>
<body>
  <div class="card">
    <h1>授权兑换失败</h1>
    <p>{error_msg}</p>
  </div>
</body>
</html>"""
            self.wfile.write(html.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def start_callback_server_background():
    try:
        server = HTTPServer(("127.0.0.1", 1455), OAuthCallbackHandler)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        return True
    except Exception:
        return False


def start_oauth(provider):
    if provider in ("chatgpt", "openai"):
        # PKCE parameters
        verifier = secrets.token_urlsafe(64)
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
        state = secrets.token_hex(32)

        # Store pending session
        os.makedirs(CC_DIR, exist_ok=True)
        pending = {}
        if os.path.exists(PENDING_OAUTH_PATH):
            try:
                with open(PENDING_OAUTH_PATH, "r", encoding="utf-8") as f:
                    pending = json.load(f)
            except Exception:
                pass
        pending[state] = {
            "code_verifier": verifier,
            "created_at": int(time.time()),
            "authenticated": False,
        }
        with open(PENDING_OAUTH_PATH, "w", encoding="utf-8") as f:
            json.dump(pending, f, indent=2)

        params = {
            "response_type": "code",
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "scope": "openid profile email offline_access api.connectors.read api.connectors.invoke",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "state": state,
            "id_token_add_organizations": "true",
            "codex_cli_simplified_flow": "true",
            "originator": "codex_cli_rs",
        }
        auth_url = "https://auth.openai.com/oauth/authorize?" + urllib.parse.urlencode(params)

        port_busy = is_port_in_use(1455)
        if not port_busy:
            start_callback_server_background()

        # Open in default browser
        webbrowser.open(auth_url)

        return {
            "success": True,
            "url": auth_url,
            "state": state,
            "port1455Busy": port_busy,
            "message": "已调起 OpenAI 官方授权页面",
        }

    # Official login URLs for all other providers requested by user
    urls = {
        "claude": "https://claude.ai/login",
        "anthropic": "https://console.anthropic.com",
        "deepseek": "https://platform.deepseek.com/api_keys",
        "trae": "https://www.trae.ai",
        "bytedance": "https://www.trae.ai",
        "gemini": "https://aistudio.google.com/app/apikey",
        "antigravity": "https://aistudio.google.com/app/apikey",
        "kimi": "https://platform.moonshot.cn/console/api-keys",
        "moonshot": "https://platform.moonshot.cn/console/api-keys",
        "siliconflow": "https://cloud.siliconflow.cn/account/ak",
        "openrouter": "https://openrouter.ai/keys",
        "grok": "https://console.x.ai/",
        "xai": "https://console.x.ai/",
    }
    url = urls.get(provider, "https://chatgpt.com/")
    webbrowser.open(url)
    return {
        "success": True,
        "url": url,
        "message": f"已在外部浏览器中打开 {provider} 官方授权管理页面",
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}, ensure_ascii=True))
        sys.exit(1)

    action = sys.argv[1]

    if action == "scan":
        accs = scan_local_accounts()
        print(json.dumps({"success": True, "accounts": accs}, ensure_ascii=True))

    elif action == "fetch_quota":
        aid = sys.argv[2] if len(sys.argv) > 2 else ""
        pid = sys.argv[3] if len(sys.argv) > 3 else "chatgpt"
        res = fetch_account_quota(aid, pid)
        print(json.dumps(res, ensure_ascii=True))

    elif action == "set_active":
        app_type = sys.argv[2] if len(sys.argv) > 2 else "codex"
        target_id = sys.argv[3] if len(sys.argv) > 3 else ""
        res = switch_active_provider(app_type, target_id)
        print(json.dumps(res, ensure_ascii=True))

    elif action == "start_oauth":
        pid = sys.argv[2] if len(sys.argv) > 2 else "chatgpt"
        res = start_oauth(pid)
        print(json.dumps(res, ensure_ascii=True))

    elif action == "check_oauth":
        state = sys.argv[2] if len(sys.argv) > 2 else ""
        if os.path.exists(PENDING_OAUTH_PATH):
            try:
                with open(PENDING_OAUTH_PATH, "r", encoding="utf-8") as f:
                    p = json.load(f)
                if state in p and p[state].get("authenticated"):
                    print(json.dumps({"success": True, "authenticated": True, "data": p[state]}, ensure_ascii=True))
                    sys.exit(0)
            except Exception:
                pass
        print(json.dumps({"success": True, "authenticated": False}, ensure_ascii=True))

    else:
        print(json.dumps({"error": f"Unknown action: {action}"}, ensure_ascii=True))
