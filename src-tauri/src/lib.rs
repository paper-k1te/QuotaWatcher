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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![check_cc_switch])
        .setup(|app| {
            // 1. Build System Tray Menu
            let show_item = MenuItem::with_id(app, "show", "打开监控面板 (Show Dashboard)", true, None::<&str>)?;
            let refresh_item = MenuItem::with_id(app, "refresh", "立即刷新全部额度 (Refresh All)", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出 QuotaWatcher (Quit)", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &refresh_item, &quit_item])?;

            // 2. Build System Tray Icon
            let icon = app.default_window_icon().unwrap().clone();
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("QuotaWatcher - 全平台额度管家运行中")
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "refresh" => {
                        let _ = app.emit("tray-refresh-all", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Left-click on Tray Icon toggles Window visibility
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
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

            // 3. Intercept Window Close Event: Hide to Tray instead of Exiting
            if let Some(main_window) = app.get_webview_window("main") {
                let win = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running QuotaWatcher tauri application");
}
