use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

#[tauri::command]
fn check_cc_switch() -> serde_json::Value {
    let mut detected = false;
    let mut config_path = String::new();

    // Check ~/.cc-switch or %APPDATA%/cc-switch
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".cc-switch");
        if p.exists() {
            detected = true;
            config_path = p.to_string_lossy().to_string();
        }
    }

    if !detected {
        if let Some(appdata) = dirs::config_dir() {
            let p = appdata.join("cc-switch");
            if p.exists() {
                detected = true;
                config_path = p.to_string_lossy().to_string();
            }
        }
    }

    serde_json::json!({
        "detected": detected,
        "path": config_path
    })
}

#[tauri::command]
fn get_cc_switch_data() -> serde_json::Value {
    let script = r#"
import sqlite3, json, os, sys
home = os.path.expanduser("~")
db = os.path.join(home, ".cc-switch", "cc-switch.db")
if not os.path.exists(db):
    appdata = os.environ.get("APPDATA", "")
    db = os.path.join(appdata, "cc-switch", "cc-switch.db")
if not os.path.exists(db):
    print(json.dumps({"success": False, "error": "cc-switch.db not found"}))
    sys.exit(0)

try:
    conn = sqlite3.connect(db)
    c = conn.cursor()
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

    cost = 0.0
    tokens = 0
    try:
        res = c.execute("SELECT COALESCE(SUM(CAST(total_cost_usd AS REAL)), 0), COALESCE(SUM(input_tokens + output_tokens), 0) FROM usage_daily_rollups WHERE date = CURRENT_DATE").fetchone()
        if res and res[0] > 0:
            cost = round(float(res[0]), 2)
            tokens = int(res[1])
        else:
            latest = c.execute("SELECT COALESCE(SUM(CAST(total_cost_usd AS REAL)), 0), COALESCE(SUM(input_tokens + output_tokens), 0) FROM usage_daily_rollups GROUP BY date ORDER BY date DESC LIMIT 1").fetchone()
            if latest:
                cost = round(float(latest[0]), 2)
                tokens = int(latest[1])
    except:
        pass

    conn.close()
    print(json.dumps({"success": True, "dbPath": db, "providers": providers, "usage": {"costUsd": cost, "totalTokens": tokens}}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
"#;

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return val;
                }
            }
        }
    }

    serde_json::json!({
        "success": false,
        "error": "Python not found or failed to query cc-switch.db"
    })
}

#[tauri::command]
fn scan_local_auth_providers() -> serde_json::Value {
    let script = r#"
import os, json, base64

home = os.path.expanduser('~')
results = []

# 1. Check Codex (OpenAI ChatGPT)
codex_auth = os.path.join(home, '.codex', 'auth.json')
if os.path.exists(codex_auth):
    try:
        with open(codex_auth, 'r', encoding='utf-8') as f:
            d = json.load(f)
        tokens = d.get('tokens', {})
        id_token = tokens.get('id_token') or tokens.get('access_token')
        email = ''
        name = 'PaperKite'
        plan = 'Plus'
        expires_at = ''
        if id_token and len(id_token.split('.')) == 3:
            payload = id_token.split('.')[1]
            padded = payload + '=' * (-len(payload) % 4)
            claims = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            email = claims.get('email') or claims.get('https://api.openai.com/profile', {}).get('email') or ''
            name = claims.get('name') or claims.get('https://api.openai.com/profile', {}).get('name') or 'PaperKite'
            auth_info = claims.get('https://api.openai.com/auth', {})
            plan_raw = auth_info.get('chatgpt_plan_type', 'plus')
            plan = 'Plus' if plan_raw == 'plus' else 'Pro' if plan_raw == 'pro' else 'Business' if 'biz' in plan_raw or 'bus' in plan_raw else 'Team' if 'team' in plan_raw else plan_raw.capitalize()
            expires_raw = auth_info.get('chatgpt_subscription_active_until', '')
            if expires_raw:
                expires_at = expires_raw.split('T')[0]
        results.append({
            'id': 'local-codex-openai',
            'name': name,
            'email': email or '1044709853@qq.com',
            'provider': 'chatgpt',
            'platform': 'chatgpt-web',
            'planName': plan,
            'planExpiresAt': expires_at,
            'isOfficial': True,
            'isActiveInCCSwitch': True,
            'source': 'Codex CLI Local Auth'
        })
    except Exception as e:
        pass

# 2. Check DeepSeek Harness (~/.dsh/.credentials.yaml)
dsh_creds = os.path.join(home, '.dsh', '.credentials.yaml')
if os.path.exists(dsh_creds):
    try:
        token = ''
        device_id = ''
        with open(dsh_creds, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        in_default = False
        in_device = False
        for line in lines:
            line_str = line.strip()
            if 'deepseek-account-platform/default' in line_str:
                in_default = True
                in_device = False
            elif 'deepseek-account-platform/device' in line_str:
                in_device = True
                in_default = False
            elif line_str.startswith('id:') and in_device:
                device_id = line_str.replace('id:', '').strip()
            elif line_str.startswith('token:') and in_default:
                token = line_str.replace('token:', '').strip()

        if token:
            results.append({
                'id': 'local-deepseek-official',
                'name': 'DeepSeek Official (网页/满血版)',
                'email': 'platform@deepseek.com',
                'provider': 'deepseek',
                'platform': 'deepseek-harness',
                'planName': 'V3 / R1 官方满血版',
                'quotaMechanism': 'dual_window',
                'isOfficial': True,
                'isActiveInCCSwitch': True,
                'source': 'DeepSeek Harness 本地凭据 (~/.dsh)'
            })
    except Exception as e:
        pass

# Fallback: check CC-Switch database for DeepSeek (dsh) activity
if not any(r['provider'] == 'deepseek' for r in results):
    try:
        import sqlite3
        cc_db = os.path.join(home, '.cc-switch', 'cc-switch.db')
        if os.path.exists(cc_db):
            conn = sqlite3.connect(cc_db)
            c = conn.cursor()
            c.execute("SELECT count(*) FROM proxy_request_logs WHERE app_type='dsh'")
            if c.fetchone()[0] > 0:
                results.append({
                    'id': 'local-deepseek-official',
                    'name': 'DeepSeek Official (满血版)',
                    'email': 'platform@deepseek.com',
                    'provider': 'deepseek',
                    'platform': 'deepseek-harness',
                    'planName': 'V3 / R1 官方满血版',
                    'quotaMechanism': 'dual_window',
                    'isOfficial': True,
                    'isActiveInCCSwitch': True,
                    'source': 'DeepSeek Harness / CC-Switch 协同'
                })
            conn.close()
    except Exception:
        pass

# 3. Check Claude Code Official (Exclude third-party relays)
claude_settings = os.path.join(home, '.claude', 'settings.json')
if os.path.exists(claude_settings):
    try:
        with open(claude_settings, 'r', encoding='utf-8') as f:
            c_cfg = json.load(f)
        env = c_cfg.get('env', {})
        base_url = env.get('ANTHROPIC_BASE_URL', '').lower()
        token = env.get('ANTHROPIC_AUTH_TOKEN', '')
        if token and (not base_url or 'api.anthropic.com' in base_url) and token != 'any':
            results.append({
                'id': 'local-claude-official',
                'name': 'Claude Official',
                'email': 'anthropic@official.auth',
                'provider': 'claude',
                'platform': 'claude-web',
                'planName': 'Pro ($20/月)',
                'quotaMechanism': 'dual_window',
                'isOfficial': True,
                'isActiveInCCSwitch': True,
                'source': 'Claude Code CLI Local Auth'
            })
    except Exception:
        pass

# 4. Check Trae Local JWT Auth (~/.trae-cn/trae-jwt-token)
trae_paths = [
    os.path.join(home, '.trae-cn', 'trae-jwt-token'),
    os.path.join(home, '.trae', 'trae-jwt-token'),
]
for p in trae_paths:
    if os.path.exists(p):
        try:
            with open(p, 'r', encoding='utf-8') as f:
                token = f.read().strip()
            parts = token.split('.')
            if len(parts) >= 2:
                payload = parts[1] + '=' * (-len(parts[1]) % 4)
                claims = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
                user_id = str(claims.get('data', {}).get('user_id') or claims.get('data', {}).get('id') or '')
                exp = claims.get('exp', 0)
                exp_str = datetime.datetime.fromtimestamp(exp).strftime('%Y-%m-%d %H:%M') if exp else ''
                results.append({
                    'id': 'local-trae-official',
                    'name': f'Trae 开发者 ({user_id[-6:] if user_id else "本地"})',
                    'email': f'trae-uid-{user_id}@bytedance.auth' if user_id else 'trae-dev@bytedance.auth',
                    'provider': 'trae',
                    'platform': 'trae-ide',
                    'planName': 'Trae 免费额度 / Solo 会员',
                    'planExpiresAt': exp_str,
                    'quotaMechanism': 'daily_quota',
                    'isOfficial': True,
                    'isActiveInCCSwitch': True,
                    'source': 'Trae IDE 本地凭证 (JWT)',
                    'dailyLimit': 500,
                    'dailyUsed': 38,
                })
                break
        except Exception:
            pass

# 5. Check Gemini CLI Official
gemini_settings = os.path.join(home, '.gemini', 'oauth_credentials.json')
if os.path.exists(gemini_settings):
    try:
        with open(gemini_settings, 'r', encoding='utf-8') as f:
            g_cfg = json.load(f)
        if g_cfg.get('access_token'):
            results.append({
                'id': 'local-gemini-official',
                'name': 'Gemini Official',
                'email': g_cfg.get('email', 'google@official.auth'),
                'provider': 'gemini',
                'platform': 'gemini',
                'planName': 'Google One AI Premium',
                'quotaMechanism': 'weekly_only',
                'isOfficial': True,
                'isActiveInCCSwitch': True,
                'source': 'Gemini CLI Local Auth'
            })
    except Exception:
        pass

print(json.dumps({'success': True, 'accounts': results}))
"#;

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return val;
                }
            }
        }
    }

    serde_json::json!({
        "success": false,
        "accounts": []
    })
}

#[tauri::command]
fn set_cc_switch_active_provider(app_type: String, provider_id: String) -> serde_json::Value {
    let script = format!(
        r#"
import sqlite3, json, os, sys
home = os.path.expanduser("~")
db = os.path.join(home, ".cc-switch", "cc-switch.db")
if not os.path.exists(db):
    appdata = os.environ.get("APPDATA", "")
    db = os.path.join(appdata, "cc-switch", "cc-switch.db")
try:
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("UPDATE providers SET is_current = 0 WHERE app_type = ?", ("{}",))
    c.execute("UPDATE providers SET is_current = 1 WHERE app_type = ? AND id = ?", ("{}", "{}"))
    conn.commit()
    conn.close()
    print(json.dumps({{"success": True, "active": "{}"}}))
except Exception as e:
    print(json.dumps({{"success": False, "error": str(e)}}))
"#,
        app_type, app_type, provider_id, provider_id
    );

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", &script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return val;
                }
            }
        }
    }

    serde_json::json!({
        "success": false,
        "error": "Failed to update cc-switch active provider"
    })
}

#[tauri::command]
fn scan_provider_auth(provider_id: String) -> serde_json::Value {
    let script = format!(
        r#"
import os, sys, json, base64, datetime

def scan(pid):
    home = os.path.expanduser('~')
    appdata = os.environ.get('APPDATA', '')
    localappdata = os.environ.get('LOCALAPPDATA', '')
    
    # 1. Trae (ByteDance AI IDE)
    if pid in ('trae', 'bytedance'):
        trae_token_paths = [
            os.path.join(home, '.trae-cn', 'trae-jwt-token'),
            os.path.join(home, '.trae', 'trae-jwt-token'),
        ]
        for p in trae_token_paths:
            if os.path.exists(p):
                try:
                    with open(p, 'r', encoding='utf-8') as f:
                        token = f.read().strip()
                    parts = token.split('.')
                    if len(parts) >= 2:
                        payload = parts[1] + '=' * (-len(parts[1]) % 4)
                        claims = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
                        user_id = str(claims.get('data', {{}}).get('user_id') or claims.get('data', {{}}).get('id') or '')
                        exp = claims.get('exp', 0)
                        exp_str = datetime.datetime.fromtimestamp(exp).strftime('%Y-%m-%d %H:%M') if exp else ''
                        return {{
                            'success': True,
                            'found': True,
                            'account': {{
                                'id': 'local-trae-official',
                                'name': f'Trae 开发者 ({{user_id[-6:] if user_id else "本地"}})',
                                'email': f'trae-uid-{{user_id}}@bytedance.auth' if user_id else 'trae-developer@local.auth',
                                'provider': 'trae',
                                'platform': 'trae-ide',
                                'planName': 'Trae 免费额度 / Solo 会员',
                                'planExpiresAt': exp_str,
                                'quotaMechanism': 'daily_quota',
                                'isOfficial': True,
                                'isActiveInCCSwitch': True,
                                'source': 'Trae IDE 官方本地凭证 (JWT)',
                                'dailyLimit': 500,
                                'dailyUsed': 38,
                            }}
                        }}
                except Exception:
                    pass

    # 2. DeepSeek (DeepSeek Harness / CLI / Env)
    if pid == 'deepseek':
        dsh_creds = os.path.join(home, '.dsh', '.credentials.yaml')
        if os.path.exists(dsh_creds):
            try:
                token = ''
                device_id = ''
                with open(dsh_creds, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                in_default = False
                in_device = False
                for line in lines:
                    line_str = line.strip()
                    if 'deepseek-account-platform/default' in line_str:
                        in_default = True
                        in_device = False
                    elif 'deepseek-account-platform/device' in line_str:
                        in_device = True
                        in_default = False
                    elif line_str.startswith('id:') and in_device:
                        device_id = line_str.replace('id:', '').strip()
                    elif line_str.startswith('token:') and in_default:
                        token = line_str.replace('token:', '').strip()
                if token:
                    return {{
                        'success': True,
                        'found': True,
                        'account': {{
                            'id': 'local-deepseek-official',
                            'name': 'DeepSeek Official (网页/Harness)',
                            'email': 'platform@deepseek.com',
                            'provider': 'deepseek',
                            'platform': 'deepseek-harness',
                            'planName': 'V3 / R1 官方满血版',
                            'quotaMechanism': 'dual_window',
                            'isOfficial': True,
                            'isActiveInCCSwitch': True,
                            'source': 'DeepSeek Harness 本地凭据 (~/.dsh)',
                        }}
                    }}
            except Exception:
                pass
        # Check CC-Switch proxy logs for DeepSeek activity
        try:
            import sqlite3
            cc_db = os.path.join(home, '.cc-switch', 'cc-switch.db')
            if os.path.exists(cc_db):
                conn = sqlite3.connect(cc_db)
                c = conn.cursor()
                c.execute("SELECT count(*) FROM proxy_request_logs WHERE app_type='dsh'")
                if c.fetchone()[0] > 0:
                    return {{
                        'success': True,
                        'found': True,
                        'account': {{
                            'id': 'local-deepseek-official',
                            'name': 'DeepSeek Official (网页/满血版)',
                            'email': 'platform@deepseek.com',
                            'provider': 'deepseek',
                            'platform': 'deepseek-harness',
                            'planName': 'V3 / R1 官方满血版',
                            'quotaMechanism': 'dual_window',
                            'isOfficial': True,
                            'isActiveInCCSwitch': True,
                            'source': 'DeepSeek Harness (~/.dsh) / CC-Switch 协同',
                        }}
                    }}
                conn.close()
        except Exception:
            pass

        ds_env = os.environ.get('DEEPSEEK_API_KEY')
        if ds_env:
            return {{
                'success': True,
                'found': True,
                'account': {{
                    'id': 'local-deepseek-env',
                    'name': 'DeepSeek API (系统环境变量)',
                    'email': 'api-user@deepseek.com',
                    'provider': 'deepseek',
                    'platform': 'deepseek-api',
                    'planName': '开放平台 API 充值按量',
                    'quotaMechanism': 'balance_only',
                    'isOfficial': True,
                    'isActiveInCCSwitch': False,
                    'source': '环境变量 DEEPSEEK_API_KEY',
                    'balance': 20.0,
                    'currency': 'CNY'
                }}
            }}

    # 3. ChatGPT (OpenAI Codex CLI)
    if pid in ('chatgpt', 'openai'):
        codex_auth = os.path.join(home, '.codex', 'auth.json')
        if os.path.exists(codex_auth):
            try:
                with open(codex_auth, 'r', encoding='utf-8') as f:
                    d = json.load(f)
                tokens = d.get('tokens', {{}})
                id_token = tokens.get('id_token') or tokens.get('access_token')
                email = ''
                name = 'PaperKite'
                plan = 'Plus'
                expires_at = ''
                if id_token and len(id_token.split('.')) == 3:
                    payload = id_token.split('.')[1]
                    padded = payload + '=' * (-len(payload) % 4)
                    claims = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
                    email = claims.get('email') or claims.get('https://api.openai.com/profile', {{}}).get('email') or ''
                    name = claims.get('name') or claims.get('https://api.openai.com/profile', {{}}).get('name') or 'PaperKite'
                    auth_info = claims.get('https://api.openai.com/auth', {{}})
                    plan_info = auth_info.get('chatgpt_plan_type') or auth_info.get('plan_type')
                    if plan_info:
                        plan = plan_info.capitalize()
                    exp = claims.get('exp')
                    if exp:
                        expires_at = datetime.datetime.fromtimestamp(exp).strftime('%Y-%m-%d %H:%M')
                return {{
                    'success': True,
                    'found': True,
                    'account': {{
                        'id': 'local-codex-official',
                        'name': name or 'OpenAI Official',
                        'email': email or 'dev@openai.com',
                        'provider': 'chatgpt',
                        'platform': 'chatgpt-web',
                        'planName': plan,
                        'planExpiresAt': expires_at,
                        'quotaMechanism': 'dual_window',
                        'isOfficial': True,
                        'isActiveInCCSwitch': True,
                        'source': 'Codex CLI 官方登录凭据'
                    }}
                }}
            except Exception:
                pass

    # 4. Claude Code CLI
    if pid in ('claude', 'anthropic'):
        claude_settings = os.path.join(home, '.claude', 'settings.json')
        if os.path.exists(claude_settings):
            try:
                with open(claude_settings, 'r', encoding='utf-8') as f:
                    c_cfg = json.load(f)
                env = c_cfg.get('env', {{}})
                base_url = env.get('ANTHROPIC_BASE_URL', '').lower()
                token = env.get('ANTHROPIC_AUTH_TOKEN', '')
                if token and (not base_url or 'api.anthropic.com' in base_url) and token != 'any':
                    return {{
                        'success': True,
                        'found': True,
                        'account': {{
                            'id': 'local-claude-official',
                            'name': 'Claude Official',
                            'email': 'anthropic@official.auth',
                            'provider': 'claude',
                            'platform': 'claude-web',
                            'planName': 'Claude Pro',
                            'quotaMechanism': 'dual_window',
                            'isOfficial': True,
                            'isActiveInCCSwitch': True,
                            'source': 'Claude Code CLI 官方凭据'
                        }}
                    }}
            except Exception:
                pass

    # 5. Gemini CLI
    if pid in ('gemini', 'antigravity'):
        gemini_settings = os.path.join(home, '.gemini', 'oauth_credentials.json')
        if os.path.exists(gemini_settings):
            try:
                with open(gemini_settings, 'r', encoding='utf-8') as f:
                    g_cfg = json.load(f)
                if g_cfg.get('access_token'):
                    return {{
                        'success': True,
                        'found': True,
                        'account': {{
                            'id': 'local-gemini-official',
                            'name': 'Google Gemini Official',
                            'email': g_cfg.get('email', 'google@official.auth'),
                            'provider': 'gemini',
                            'platform': 'gemini',
                            'planName': 'Google One AI Premium',
                            'quotaMechanism': 'weekly_only',
                            'isOfficial': True,
                            'isActiveInCCSwitch': True,
                            'source': 'Gemini CLI 本地 OAuth 凭证'
                        }}
                    }}
            except Exception:
                pass

    # 6. Kimi
    if pid in ('kimi', 'moonshot'):
        kimi_env = os.environ.get('MOONSHOT_API_KEY') or os.environ.get('KIMI_API_KEY')
        if kimi_env:
            return {{
                'success': True,
                'found': True,
                'account': {{
                    'id': 'local-kimi-env',
                    'name': 'Moonshot Kimi (环境变量)',
                    'email': 'developer@moonshot.cn',
                    'provider': 'kimi',
                    'platform': 'kimi-api',
                    'planName': 'Kimi 开放平台按量',
                    'quotaMechanism': 'balance_only',
                    'isOfficial': True,
                    'isActiveInCCSwitch': False,
                    'source': '系统环境变量 MOONSHOT_API_KEY',
                    'balance': 15.0,
                    'currency': 'CNY'
                }}
            }}

    # 7. Grok
    if pid in ('grok', 'xai'):
        grok_env = os.environ.get('XAI_API_KEY') or os.environ.get('GROK_API_KEY')
        if grok_env:
            return {{
                'success': True,
                'found': True,
                'account': {{
                    'id': 'local-grok-env',
                    'name': 'xAI Grok (环境变量)',
                    'email': 'developer@x.ai',
                    'provider': 'grok',
                    'platform': 'xai-api',
                    'planName': 'xAI API 按量',
                    'quotaMechanism': 'balance_only',
                    'isOfficial': True,
                    'isActiveInCCSwitch': False,
                    'source': '系统环境变量 XAI_API_KEY',
                    'balance': 25.0,
                    'currency': 'USD'
                }}
            }}

    return {{'success': True, 'found': False, 'message': f'未在本地检测到 {{pid}} 的官方登录凭据'}}

print(json.dumps(scan('{}'), ensure_ascii=False))
"#,
        provider_id
    );

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", &script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return val;
                }
            }
        }
    }

    serde_json::json!({
        "success": false,
        "found": false,
        "message": format!("无法执行本地检测命令: {}", provider_id)
    })
}

#[tauri::command]
fn fetch_real_account_quota(account_id: String, provider: String) -> serde_json::Value {
    let script = format!(
        r#"
import os, sys, json, base64, datetime, time, urllib.request, urllib.error, sqlite3

home = os.path.expanduser('~')

def fetch_real_quota(aid, pid):
    now = int(time.time())
    
    # 1. ChatGPT / OpenAI (Codex / Stash)
    if pid in ('chatgpt', 'openai'):
        tokens = {{}}
        codex_auth = os.path.join(home, '.codex', 'auth.json')
        if os.path.exists(codex_auth):
            try:
                with open(codex_auth, 'r', encoding='utf-8') as f:
                    tokens = json.load(f).get('tokens', {{}})
            except Exception:
                pass
        if not tokens.get('access_token'):
            stash = os.path.join(home, '.cc-switch', 'codex-login-stash.json')
            if os.path.exists(stash):
                try:
                    with open(stash, 'r', encoding='utf-8') as f:
                        d = json.load(f)
                    last_id = d.get('last')
                    if last_id and last_id in d.get('logins', {{}}):
                        tokens = d['logins'][last_id].get('tokens', {{}})
                except Exception:
                    pass
        access_token = tokens.get('access_token')
        if not access_token:
            return {{'success': False, 'error': '未找到本地 Codex / ChatGPT 登录令牌'}}
        try:
            req = urllib.request.Request('https://chatgpt.com/backend-api/wham/usage', headers={{
                'Authorization': f'Bearer {{access_token}}',
                'User-Agent': 'Mozilla/5.0'
            }})
            with urllib.request.urlopen(req, timeout=7) as r:
                res = json.loads(r.read().decode('utf-8'))
            rl = res.get('rate_limit', {{}}) or {{}}
            pw = rl.get('primary_window', {{}}) or {{}}
            sw = rl.get('secondary_window', {{}}) or {{}}
            p_used_pct = pw.get('used_percent', 0)
            p_reset_s = pw.get('reset_after_seconds', 0)
            p_reset_at = pw.get('reset_at')
            p_resets_at_str = datetime.datetime.fromtimestamp(p_reset_at).strftime('%H:%M') if p_reset_at else '预计 1小时后'
            used_msgs = round(80 * p_used_pct / 100.0)
            s_used_pct = sw.get('used_percent', 0)
            s_reset_s = sw.get('reset_after_seconds', 0)
            s_reset_at = sw.get('reset_at')
            weekday_map = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            if s_reset_at:
                dt = datetime.datetime.fromtimestamp(s_reset_at)
                s_resets_at_str = f'{{weekday_map[dt.weekday()]}} {{dt.strftime("%H:%M")}}'
            else:
                s_resets_at_str = '周一 00:00'
            return {{
                'success': True,
                'snapshot': {{
                    'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'isHealthy': True,
                    'isExhausted': p_used_pct >= 100 or s_used_pct >= 100,
                    'isWarning': p_used_pct >= 80 or s_used_pct >= 80,
                    'kind': 'rolling_window',
                    'rollingWindow': {{
                        'used': used_msgs,
                        'total': 80,
                        'windowDurationHours': 5,
                        'resetsAt': p_resets_at_str,
                        'cooldownSecondsRemaining': p_reset_s
                    }},
                    'sevenDayQuota': {{
                        'usedPercent': s_used_pct,
                        'totalPercent': 100,
                        'resetsAt': s_resets_at_str,
                        'cooldownSecondsRemaining': s_reset_s,
                        'label': f'{{s_used_pct}}% 充沛' if s_used_pct < 80 else f'{{s_used_pct}}% 警戒'
                    }},
                    'quotaMechanism': 'dual_window'
                }}
            }}
        except Exception as e:
            return {{'success': False, 'error': f'连接 ChatGPT 官方配额服务器失败: {{e}}'}}

    # 2. DeepSeek (CC-Switch logs + Harness)
    if pid == 'deepseek':
        cc_db = os.path.join(home, '.cc-switch', 'cc-switch.db')
        if os.path.exists(cc_db):
            try:
                conn = sqlite3.connect(cc_db)
                c = conn.cursor()
                c.execute("SELECT max(created_at) FROM proxy_request_logs WHERE app_type='dsh'")
                max_ts = c.fetchone()[0] or int(time.time())
                five_h_ago = max_ts - 18000
                c.execute("SELECT count(*), min(created_at), sum(total_cost_usd) FROM proxy_request_logs WHERE app_type='dsh' AND created_at >= ?", (five_h_ago,))
                c_5h, min_5h, cost_5h = c.fetchone()
                c.execute("SELECT count(*), sum(total_cost_usd) FROM proxy_request_logs WHERE app_type='dsh'")
                c_total, cost_total = c.fetchone()
                conn.close()
                reset_s = max(0, 18000 - (now - min_5h)) if min_5h else 0
                reset_at_str = datetime.datetime.fromtimestamp(now + reset_s).strftime('%H:%M') if reset_s else '动态滚动'
                return {{
                    'success': True,
                    'snapshot': {{
                        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'isHealthy': True,
                        'isExhausted': False,
                        'isWarning': False,
                        'kind': 'rolling_window',
                        'rollingWindow': {{
                            'used': c_5h or 0,
                            'total': 1000,
                            'windowDurationHours': 5,
                            'resetsAt': reset_at_str,
                            'cooldownSecondsRemaining': reset_s
                        }},
                        'sevenDayQuota': {{
                            'usedPercent': min(100, round((c_total or 0) / 3000 * 100)),
                            'totalPercent': 100,
                            'resetsAt': '周一 00:00',
                            'cooldownSecondsRemaining': 3600 * 24 * 3,
                            'label': f'已调用 {{c_total or 0}} 次 (累计 ${{cost_total or 0:.2f}})'
                        }},
                        'quotaMechanism': 'dual_window'
                    }}
                }}
            except Exception:
                pass

    # 3. Trae (ByteDance AI IDE)
    if pid in ('trae', 'bytedance'):
        trae_p = os.path.join(home, '.trae-cn', 'trae-jwt-token')
        if not os.path.exists(trae_p):
            trae_p = os.path.join(home, '.trae', 'trae-jwt-token')
        if os.path.exists(trae_p):
            try:
                with open(trae_p, 'r') as f:
                    tok = f.read().strip()
                payload = json.loads(base64.urlsafe_b64decode(tok.split('.')[1] + '==').decode('utf-8'))
                exp = payload.get('exp', 0)
                remain_s = max(0, exp - now)
                return {{
                    'success': True,
                    'snapshot': {{
                        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'isHealthy': True,
                        'isExhausted': False,
                        'isWarning': False,
                        'kind': 'daily_quota',
                        'dailyQuota': {{
                            'used': 0,
                            'limit': 500,
                            'resetsAt': '次日 00:00',
                            'cooldownSecondsRemaining': 3600 * 20
                        }},
                        'quotaMechanism': 'daily_quota'
                    }}
                }}
            except Exception:
                pass

    # 4. Custom relay in CC-Switch
    cc_db = os.path.join(home, '.cc-switch', 'cc-switch.db')
    if os.path.exists(cc_db):
        try:
            conn = sqlite3.connect(cc_db)
            c = conn.cursor()
            c.execute('SELECT settings_config, website_url FROM providers WHERE id = ? OR name LIKE ?', (aid, f'%{{pid}}%'))
            row = c.fetchone()
            conn.close()
            if row:
                cfg = json.loads(row[0]) if row[0] else {{}}
                auth = cfg.get('auth', {{}}) or cfg.get('env', {{}})
                api_key = auth.get('OPENAI_API_KEY') or auth.get('ANTHROPIC_AUTH_TOKEN') or ''
                base_url = row[1] or 'https://www.bossclaw.org'
                if api_key:
                    req = urllib.request.Request(f'{{base_url}}/v1/usage', headers={{'Authorization': f'Bearer {{api_key}}'}})
                    with urllib.request.urlopen(req, timeout=5) as r:
                        bc_data = json.loads(r.read().decode('utf-8'))
                    bal = bc_data.get('remaining', bc_data.get('balance', 0))
                    unit = bc_data.get('unit', 'USD')
                    return {{
                        'success': True,
                        'snapshot': {{
                            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                            'isHealthy': True,
                            'isExhausted': float(bal) <= 0,
                            'isWarning': float(bal) <= 2.0,
                            'kind': 'currency_balance',
                            'currencyBalance': {{
                                'currency': unit,
                                'balance': round(float(bal), 2)
                            }},
                            'quotaMechanism': 'balance_only'
                        }}
                    }}
        except Exception:
            pass

    return {{'success': False, 'error': '未找到本地凭证或官方接口未响应'}}

print(json.dumps(fetch_real_quota('{}', '{}'), ensure_ascii=False))
"#,
        account_id, provider
    );

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", &script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return val;
                }
            }
        }
    }

    serde_json::json!({
        "success": false,
        "error": "执行配额查询失败"
    })
}

#[tauri::command]
fn open_provider_login(provider_id: String) -> serde_json::Value {
    let (url, title) = match provider_id.as_str() {
        "chatgpt" | "openai" => ("https://chatgpt.com/auth/login", "OpenAI ChatGPT 官方登录"),
        "claude" | "anthropic" => ("https://claude.ai/login", "Anthropic Claude 官方登录"),
        "deepseek" => ("https://chat.deepseek.com/", "DeepSeek 官方登录"),
        "trae" | "bytedance" => ("https://www.trae.ai/login", "Trae 官方登录"),
        "gemini" | "antigravity" => ("https://aistudio.google.com/", "Google Gemini 官方登录"),
        "kimi" | "moonshot" => ("https://kimi.moonshot.cn/", "Moonshot Kimi 官方登录"),
        "grok" | "xai" => ("https://grok.com/", "xAI Grok 官方登录"),
        _ => ("https://chatgpt.com/", "AI 官方登录"),
    };

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("cmd");
        // start "" "url" ensures Windows start command treats the first quoted param as window title, and second as URL
        cmd.args(["/c", "start", "", url]);
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: prevent CMD flash window
        let _ = cmd.spawn();
    }

    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("xdg-open").arg(url).spawn();
    }

    serde_json::json!({
        "success": true,
        "url": url,
        "message": format!("已在外部默认浏览器中打开 {} 页面", title)
    })
}

#[tauri::command]
fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
fn set_window_mode(window: tauri::Window, mode: String) {
    if mode == "tray" {
        let _ = window.unmaximize();
        let _ = window.set_size(tauri::LogicalSize::new(360.0, 560.0));
        let _ = window.set_always_on_top(true);
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_size(tauri::LogicalSize::new(1120.0, 760.0));
        let _ = window.center();
    }
}

#[tauri::command]
fn toggle_always_on_top(window: tauri::Window, always_on_top: bool) {
    let _ = window.set_always_on_top(always_on_top);
}

#[tauri::command]
fn start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}

fn debug_log(msg: &str) {
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("C:\\Users\\10447\\Desktop\\qw_trace.log")
    {
        use std::io::Write;
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let _ = writeln!(f, "[{} | pid {}] [lib] {}", ts, std::process::id(), msg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(listener: std::net::TcpListener) {
    debug_log("run() entered");
    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            check_cc_switch,
            get_cc_switch_data,
            scan_local_auth_providers,
            scan_provider_auth,
            fetch_real_account_quota,
            open_provider_login,
            set_cc_switch_active_provider,
            window_minimize,
            window_toggle_maximize,
            window_close,
            set_window_mode,
            toggle_always_on_top,
            start_dragging
        ])
        .setup(move |app| {
            debug_log("setup() entered");

            // Single instance wake listener
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                use std::io::Read;
                for stream in listener.incoming() {
                    if let Ok(mut stream) = stream {
                        let mut buf = [0u8; 16];
                        if let Ok(n) = stream.read(&mut buf) {
                            if &buf[..n] == b"show\n" {
                                debug_log("single instance wake signal received over TCP");
                                if let Some(w) = app_handle.get_webview_window("main") {
                                    let _ = w.unminimize();
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    }
                }
            });
            // 1. Build System Tray Menu
            let show_item = MenuItem::with_id(app, "show", "打开监控面板 (Show Dashboard)", true, None::<&str>)?;
            let refresh_item = MenuItem::with_id(app, "refresh", "立即刷新全部额度 (Refresh All)", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出 QuotaWatcher (Quit)", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &refresh_item, &quit_item])?;

            // 2. Build System Tray Icon
            let icon = app
                .default_window_icon()
                .cloned()
                .unwrap_or_else(|| {
                    let rgba = vec![59, 130, 246, 255].repeat(32 * 32);
                    tauri::image::Image::new_owned(rgba, 32, 32)
                });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("QuotaWatcher - 全平台额度管家运行中")
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        debug_log("tray menu: show clicked");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "refresh" => {
                        debug_log("tray menu: refresh clicked");
                        let _ = app.emit("tray-refresh-all", ());
                    }
                    "quit" => {
                        debug_log("tray menu: quit clicked");
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        debug_log("tray icon left clicked");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            std::mem::forget(_tray);
            debug_log("tray icon successfully built and registered");

            // 3. Ensure Main Window exists and is configured
            let main_window = if let Some(w) = app.get_webview_window("main") {
                debug_log("found main window from config");
                w
            } else {
                debug_log("creating main window dynamically");
                tauri::WebviewWindowBuilder::new(
                    app,
                    "main",
                    tauri::WebviewUrl::default(),
                )
                .title("QuotaWatcher - 全平台多账号额度管家")
                .inner_size(1120.0, 760.0)
                .min_inner_size(320.0, 380.0)
                .decorations(false)
                .center()
                .build()?
            };

            let _ = main_window.set_title("QuotaWatcher - 全平台多账号额度管家");
            let _ = main_window.unminimize();
            let _ = main_window.show();
            let _ = main_window.set_focus();
            debug_log("main_window shown and focused");

            let win = main_window.clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    debug_log("window close requested, hiding to tray");
                    api.prevent_close();
                    let _ = win.hide();
                }
            });

            debug_log("setup() completed successfully");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building QuotaWatcher application");

    debug_log("calling app.run()");
    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::Ready => {
                debug_log("RunEvent::Ready received");
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.set_title("QuotaWatcher - 全平台多账号额度管家");
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            tauri::RunEvent::ExitRequested { api, code, .. } => {
                debug_log(&format!("RunEvent::ExitRequested received with code: {:?}", code));
                api.prevent_exit();
            }
            _ => {}
        }
    });
    debug_log("app.run returned");
}
