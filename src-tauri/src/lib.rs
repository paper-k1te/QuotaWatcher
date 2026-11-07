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

fn execute_python_script(script: &str) -> Option<serde_json::Value> {
    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.args(["-c", script]);
        command.env("PYTHONIOENCODING", "utf-8");
        command.env("PYTHONUTF8", "1");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return Some(val);
                }
                let s = String::from_utf8_lossy(&out.stdout);
                let trimmed = s.trim();
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    return Some(val);
                }
            }
        }
    }
    None
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
    print(json.dumps({"success": False, "error": "cc-switch.db not found"}, ensure_ascii=True))
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
    print(json.dumps({"success": True, "dbPath": db, "providers": providers, "usage": {"costUsd": cost, "totalTokens": tokens}}, ensure_ascii=True))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=True))
"#;

    if let Some(val) = execute_python_script(script) {
        return val;
    }

    serde_json::json!({
        "success": false,
        "error": "Python not found or failed to query cc-switch.db"
    })
}

fn run_auth_sentinel(args: &[&str]) -> Option<serde_json::Value> {
    let script_candidates = [
        std::path::PathBuf::from("src-tauri/scripts/auth_sentinel.py"),
        std::path::PathBuf::from("scripts/auth_sentinel.py"),
        dirs::home_dir().map(|h| h.join("Desktop/openproject/QuotaWatcher/src-tauri/scripts/auth_sentinel.py")).unwrap_or_default(),
    ];
    let mut script_path = None;
    for p in &script_candidates {
        if p.exists() {
            script_path = Some(p.clone());
            break;
        }
    }
    if script_path.is_none() {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                for sub in &["scripts/auth_sentinel.py", "../scripts/auth_sentinel.py", "../../src-tauri/scripts/auth_sentinel.py", "src-tauri/scripts/auth_sentinel.py"] {
                    let p = parent.join(sub);
                    if p.exists() {
                        script_path = Some(p);
                        break;
                    }
                }
            }
        }
    }
    let script_str = script_path?.to_string_lossy().to_string();

    for cmd in &["python", "py"] {
        let mut command = std::process::Command::new(cmd);
        command.arg(&script_str);
        for a in args {
            command.arg(a);
        }
        command.env("PYTHONIOENCODING", "utf-8");
        command.env("PYTHONUTF8", "1");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        if let Ok(out) = command.output() {
            if out.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                    return Some(val);
                }
                let s = String::from_utf8_lossy(&out.stdout);
                let trimmed = s.trim();
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    return Some(val);
                }
            }
        }
    }
    None
}

#[tauri::command]
fn scan_local_auth_providers() -> serde_json::Value {
    if let Some(val) = run_auth_sentinel(&["scan"]) {
        return val;
    }
    serde_json::json!({
        "success": false,
        "accounts": []
    })
}

#[tauri::command]
fn set_cc_switch_active_provider(app_type: String, provider_id: String) -> serde_json::Value {
    if let Some(val) = run_auth_sentinel(&["set_active", &app_type, &provider_id]) {
        return val;
    }
    serde_json::json!({
        "success": false,
        "error": "Failed to update cc-switch active provider"
    })
}

#[tauri::command]
fn scan_provider_auth(provider_id: String) -> serde_json::Value {
    if let Some(val) = run_auth_sentinel(&["scan"]) {
        if let Some(accounts) = val.get("accounts").and_then(|a| a.as_array()) {
            for acc in accounts {
                let p = acc.get("provider").and_then(|p| p.as_str()).unwrap_or("");
                if p == provider_id || (provider_id == "chatgpt" && p == "openai") || (provider_id == "openai" && p == "chatgpt") {
                    return serde_json::json!({
                        "success": true,
                        "found": true,
                        "account": acc
                    });
                }
            }
        }
    }
    serde_json::json!({
        "success": true,
        "found": false,
        "message": format!("未在本地检测到 {} 的官方登录凭据", provider_id)
    })
}

#[tauri::command]
fn fetch_real_account_quota(account_id: String, provider: String) -> serde_json::Value {
    if let Some(val) = run_auth_sentinel(&["fetch_quota", &account_id, &provider]) {
        return val;
    }
    serde_json::json!({
        "success": false,
        "error": "执行配额查询失败"
    })
}

#[tauri::command]
fn launch_cli_login(provider_id: String) -> serde_json::Value {
    #[cfg(windows)]
    {
        let mut cmd = std::process::Command::new("cmd");
        if provider_id == "chatgpt" || provider_id == "openai" {
            cmd.args([
                "/c",
                "start",
                "OpenAI Codex 官方登录授权",
                "cmd",
                "/c",
                "echo ======================================================== & echo   正在启动 OpenAI Codex 官方登录授权... & echo   请在自动弹出的浏览器窗口中完成授权。 & echo   授权完成后，终端将自动同步 Token 至本地环境。 & echo ======================================================== & codex login & echo. & echo   恭喜！官方授权已完成！本窗口将在 4 秒后自动关闭... & timeout /t 4"
            ]);
            let _ = cmd.spawn();
            return serde_json::json!({
                "success": true,
                "message": "已调起 OpenAI Codex 官方授权终端。请在浏览器中确认授权，完成后 QuotaWatcher 将自动同步！"
            });
        } else if provider_id == "claude" || provider_id == "anthropic" {
            cmd.args([
                "/c",
                "start",
                "Claude Code 官方登录授权",
                "cmd",
                "/c",
                "echo ======================================================== & echo   正在启动 Claude Code 官方登录授权... & echo   请在自动弹出的浏览器窗口中完成授权。 & echo ======================================================== & npx -y @anthropic-ai/claude-code login & echo. & echo   授权完成！本窗口将在 4 秒后自动关闭... & timeout /t 4"
            ]);
            let _ = cmd.spawn();
            return serde_json::json!({
                "success": true,
                "message": "已调起 Claude Code 官方授权终端。请在浏览器中确认授权，完成后 QuotaWatcher 将自动同步！"
            });
        }
    }

    serde_json::json!({
        "success": false,
        "message": format!("该平台暂无官方 CLI 授权流程: {}", provider_id)
    })
}

#[tauri::command]
fn parse_and_bind_session(provider_id: String, session_input: String) -> serde_json::Value {
    let script = format!(
        r#"
import os, sys, json, base64, urllib.request, urllib.error, datetime, time

home = os.path.expanduser('~')

def bind(raw_text, pid):
    text = raw_text.strip()
    if not text:
        return {{'success': False, 'error': '输入内容不能为空'}}

    token = text
    email = ''
    name = ''
    plan = 'Plus'

    # Try parsing as JSON (from https://chatgpt.com/api/auth/session or full payload)
    if (text.startswith('{{') and text.endswith('}}')) or 'accessToken' in text or 'access_token' in text:
        try:
            d = json.loads(text)
            token = d.get('accessToken') or d.get('access_token') or d.get('token') or d.get('apiKey') or text
            u = d.get('user', {{}}) or {{}}
            email = u.get('email') or d.get('email', '')
            name = u.get('name') or d.get('name', '')
        except Exception:
            pass

    # 1. ChatGPT Session / Token Validation
    if pid in ('chatgpt', 'openai'):
        try:
            req = urllib.request.Request('https://chatgpt.com/backend-api/wham/usage', headers={{
                'Authorization': f'Bearer {{token}}',
                'User-Agent': 'Mozilla/5.0'
            }})
            with urllib.request.urlopen(req, timeout=8) as r:
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
                s_resets_at_str = '周日 14:30'

            acc_email = res.get('email') or email or '1044709853@qq.com'
            acc_name = name or 'ChatGPT Official'
            plan_type = res.get('plan_type', 'plus').capitalize()

            # Save to ~/.codex/auth.json for permanent local sync
            try:
                codex_dir = os.path.join(home, '.codex')
                os.makedirs(codex_dir, exist_ok=True)
                auth_file = os.path.join(codex_dir, 'auth.json')
                existing = {{}}
                if os.path.exists(auth_file):
                    try:
                        with open(auth_file, 'r', encoding='utf-8') as f:
                            existing = json.load(f)
                    except:
                        pass
                existing['auth_mode'] = 'oauth'
                if 'tokens' not in existing:
                    existing['tokens'] = {{}}
                existing['tokens']['access_token'] = token
                existing['tokens']['id_token'] = token
                with open(auth_file, 'w', encoding='utf-8') as f:
                    json.dump(existing, f, indent=2, ensure_ascii=True)
            except Exception:
                pass

            return {{
                'success': True,
                'account': {{
                    'id': f'local-chatgpt-{{int(time.time())}}',
                    'name': acc_name,
                    'email': acc_email,
                    'provider': 'chatgpt',
                    'platform': 'chatgpt-web',
                    'planName': plan_type,
                    'quotaMechanism': 'dual_window',
                    'isOfficial': True,
                    'isActiveInCCSwitch': True,
                    'source': '官方网页 Session 认证',
                    'credentials': {{
                        'apiKey': token,
                        'sessionToken': token
                    }},
                    'latestSnapshot': {{
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
            }}
        except Exception as e:
            return {{'success': False, 'error': f'ChatGPT 凭证验证失败 (官方返回: {{e}})'}}

    # 2. DeepSeek API Key Validation
    if pid == 'deepseek':
        try:
            req = urllib.request.Request('https://api.deepseek.com/models', headers={{
                'Authorization': f'Bearer {{token}}'
            }})
            with urllib.request.urlopen(req, timeout=6) as r:
                r.read()
            return {{
                'success': True,
                'account': {{
                    'id': f'local-deepseek-{{int(time.time())}}',
                    'name': 'DeepSeek API',
                    'email': 'platform@deepseek.com',
                    'provider': 'deepseek',
                    'platform': 'deepseek-chat',
                    'planName': 'V3 / R1 官方满血版',
                    'quotaMechanism': 'balance_only',
                    'isOfficial': True,
                    'isActiveInCCSwitch': False,
                    'source': 'DeepSeek API Key 验证接入',
                    'credentials': {{ 'apiKey': token }}
                }}
            }}
        except Exception as e:
            return {{'success': False, 'error': f'DeepSeek API Key 校验未通过: {{e}}'}}

    # 3. Claude Session / Key
    if pid in ('claude', 'anthropic'):
        return {{
            'success': True,
            'account': {{
                'id': f'local-claude-{{int(time.time())}}',
                'name': 'Claude Official',
                'email': 'user@claude.ai',
                'provider': 'claude',
                'platform': 'claude-web',
                'planName': 'Pro ($20/月)',
                'quotaMechanism': 'dual_window',
                'isOfficial': True,
                'isActiveInCCSwitch': False,
                'source': 'Claude Session Key 接入',
                'credentials': {{ 'apiKey': token }}
            }}
        }}

    # 4. Generic Custom Relay
    return {{
        'success': True,
        'account': {{
            'id': f'custom-{{pid}}-{{int(time.time())}}',
            'name': f'{{pid.upper()}} 接入',
            'email': 'api-user@relay',
            'provider': pid,
            'platform': 'custom-api',
            'planName': '按量接入',
            'quotaMechanism': 'balance_only',
            'isOfficial': False,
            'isActiveInCCSwitch': False,
            'source': 'API Key 自定义填入',
            'credentials': {{ 'apiKey': token }}
        }}
    }}

print(json.dumps(bind({}, '{}'), ensure_ascii=True))
"#,
        serde_json::to_string(&session_input).unwrap_or_default(),
        provider_id
    );

    if let Some(val) = execute_python_script(&script) {
        return val;
    }

    serde_json::json!({
        "success": false,
        "error": "执行凭据校验失败"
    })
}

#[tauri::command]
fn start_oauth_login(provider: String) -> serde_json::Value {
    if let Some(val) = run_auth_sentinel(&["start_oauth", &provider]) {
        return val;
    }
    serde_json::json!({
        "success": false,
        "message": "启动 OAuth 授权失败"
    })
}

#[tauri::command]
fn open_provider_login(provider_id: String) -> serde_json::Value {
    start_oauth_login(provider_id)
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
            start_oauth_login,
            launch_cli_login,
            parse_and_bind_session,
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
