mod commands;
pub mod content;
pub mod core;
pub mod db;
pub mod domain;
pub mod error;
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
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let conn = db::open(&data_dir.join(DB_FILE))?;

            let loaded = content::load_all(&content_dir(app));
            for warning in &loaded.warnings {
                eprintln!("[content] skipped: {warning}");
            }

            app.manage(core::Core::with_units(conn, loaded.problems, loaded.units));
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
