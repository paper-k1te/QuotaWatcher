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
                cost = round(float(latest[1]), 2)
                tokens = int(latest[2])
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
