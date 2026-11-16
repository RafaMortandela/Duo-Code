mod commands;
pub mod content;
pub mod core;
pub mod db;
mod desktop;
pub mod domain;
pub mod error;
pub mod reminder;
pub mod runner;

use std::path::PathBuf;
use tauri::Manager;

pub const DB_FILE: &str = "duo-code.db";

/// Onde estão as questões: a pasta do repositório em desenvolvimento,
/// os recursos empacotados no app instalado.
fn content_dir(app: &tauri::App) -> PathBuf {
    if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("content")
    } else {
        app.path()
            .resource_dir()
            .map(|d| d.join("content"))
            .unwrap_or_else(|_| PathBuf::from("content"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Precisa ser o primeiro plugin: abrir o app de novo só mostra a janela
        // que já existe, em vez de criar outro processo no mesmo banco.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            desktop::show_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![desktop::MINIMIZED_ARG]),
        ))
        .manage(desktop::TrayState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                desktop::on_close_requested(window, api);
            }
        })
        // Só em builds de depuração: abre direto em uma rota, para reproduzir
        // um problema sem precisar clicar. Ex.: DUO_CODE_START_ROUTE=/problem/stair-hops
        .on_page_load(|webview, payload| {
            if cfg!(debug_assertions) && payload.event() == tauri::webview::PageLoadEvent::Finished {
                if let Ok(route) = std::env::var("DUO_CODE_START_ROUTE") {
                    let target = serde_json::to_string(&format!("#{route}")).unwrap_or_default();
                    let _ = webview.eval(format!(
                        "if (window.location.hash !== {target}) window.location.hash = {target};"
                    ));
                }
                // DUO_CODE_PROBE=<seletor CSS>: depois de alguns segundos, registra
                // no log se o elemento existe (ex.: ".monaco-editor").
                if let Ok(selector) = std::env::var("DUO_CODE_PROBE") {
                    let selector = serde_json::to_string(&selector).unwrap_or_default();
                    let _ = webview.eval(format!(
                        "setTimeout(() => window.__TAURI_INTERNALS__.invoke('log_frontend_error', {{ \
                         message: 'probe ' + {selector} + ' at ' + location.hash + ': ' + \
                         (document.querySelector({selector}) ? 'FOUND' : 'MISSING') }}), 4000);"
                    ));
                }
            }
        })
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let conn = db::open(&data_dir.join(DB_FILE))?;

            let loaded = content::load_all(&content_dir(app));
            for warning in &loaded.warnings {
                eprintln!("[content] skipped: {warning}");
            }

            app.manage(core::Core::with_units(conn, loaded.problems, loaded.units));

            // Sem bandeja o app continua funcionando; fechar a janela encerra.
            if let Err(e) = desktop::build_tray(app.handle()) {
                eprintln!("[tray] unavailable: {e}");
            }
            if std::env::args().any(|a| a == desktop::MINIMIZED_ARG) {
                if let Some(window) = app.get_webview_window(desktop::MAIN_WINDOW) {
                    let _ = window.hide();
                }
            }
            reminder::spawn(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_setting,
            commands::set_setting,
            commands::list_problems,
            commands::get_problem,
            commands::run_code,
            commands::submit_code,
            commands::save_draft,
            commands::get_solution,
            commands::get_progress,
            commands::get_trail,
            commands::get_review_queue,
            commands::rate_review,
            commands::fail_review,
            commands::test_notification,
            commands::get_autostart,
            commands::set_autostart,
            commands::log_frontend_error,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
