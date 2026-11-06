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
