#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent, WindowEvent,
};

/// widget 位置：Moved 事件记录 + 节流落盘。
struct PosState {
    last_save: Option<Instant>,
    last_pos: Option<(i32, i32)>,
}
struct PosSaver(Mutex<PosState>);

fn toggle_widget(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn save_widget_pos(app: &AppHandle) {
    let Some(saver) = app.try_state::<PosSaver>() else { return };
    let Some((x, y)) = saver.0.lock().ok().and_then(|st| st.last_pos) else { return };
    if let Some(state) = app.try_state::<db::Db>() {
        db::set_config_silent(&state, "widget_pos", &format!("{{\"x\":{x},\"y\":{y}}}"));
    }
}

fn main() {
    tauri::Builder::default()
        // 单实例必须最先注册：二次启动唤起已有窗口
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        toggle_widget(app);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            app.manage(PosSaver(Mutex::new(PosState { last_save: None, last_pos: None })));

            // 数据库
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let conn = db::init(&data_dir)?;
            app.manage(db::Db(Mutex::new(conn)));
            let state = app.state::<db::Db>();

            // 全局热键（可在设置中改，重启生效）
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let hotkey = db::get_config(&state, "hotkey").unwrap_or_else(|| "Ctrl+Alt+D".into());
            if let Err(e) = app.global_shortcut().register(hotkey.as_str()) {
                log::warn!("注册热键失败 {hotkey}: {e}");
            }

            // 托盘
            let i_show = MenuItem::with_id(app, "tray-show", "显示 / 隐藏小窗", true, None::<&str>)?;
            let i_main = MenuItem::with_id(app, "tray-main", "打开主窗口", true, None::<&str>)?;
            let i_quit = MenuItem::with_id(app, "tray-quit", "退出 DeskList", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&i_show, &i_main, &i_quit])?;
            TrayIconBuilder::with_id("desklist-tray")
                .icon(app.default_window_icon().expect("missing window icon").clone())
                .tooltip("DeskList")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "tray-show" => toggle_widget(app),
                    "tray-main" => show_main(app),
                    "tray-quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_widget(tray.app_handle());
                    }
                })
                .build(app)?;

            // widget：位置恢复
            if let Some(w) = app.get_webview_window("widget") {
                if let Some(pos) = db::get_config(&state, "widget_pos")
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                {
                    let (x, y) = (pos["x"].as_i64(), pos["y"].as_i64());
                    if let (Some(x), Some(y)) = (x, y) {
                        let _ = w.set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                    }
                }
                // 注意：不应用 acrylic/mica 等系统材质——它们会填满整个窗口矩形，
                // 盖住 CSS 圆角（四角变方）。圆角优先，背景用 CSS 半透明实现。
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            // 主窗关闭 = 隐藏，进程常驻托盘
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                let _ = window.hide();
            }
            // widget 拖动结束后节流落盘（最终位置在退出时补存）
            WindowEvent::Moved(pos) if window.label() == "widget" => {
                let app = window.app_handle();
                let Some(saver) = app.try_state::<PosSaver>() else { return };
                let locked = saver.0.lock();
                if let Ok(mut st) = locked {
                    st.last_pos = Some((pos.x, pos.y));
                    let should = st
                        .last_save
                        .map(|t| t.elapsed() > Duration::from_millis(700))
                        .unwrap_or(true);
                    if should {
                        st.last_save = Some(Instant::now());
                        let (x, y) = (pos.x, pos.y);
                        drop(st);
                        if let Some(state) = app.try_state::<db::Db>() {
                            db::set_config_silent(&state, "widget_pos", &format!("{{\"x\":{x},\"y\":{y}}}"));
                        }
                    }
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::list_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::toggle_task,
            commands::tasks::pin_today,
            commands::tasks::delete_task,
            commands::plans::list_plans,
            commands::plans::create_plan,
            commands::plans::update_plan,
            commands::plans::delete_plan,
            commands::plans::reorder_plans,
            commands::config::get_config,
            commands::config::set_config,
            commands::misc::stats_daily,
            commands::misc::export_data,
            commands::misc::import_data,
            commands::misc::set_autostart,
            commands::misc::get_autostart,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                save_widget_pos(app);
            }
        });
}
