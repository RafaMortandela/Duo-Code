mod commands;
pub mod db;
pub mod error;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

pub const DB_FILE: &str = "duo-code.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let conn = db::open(&dir.join(DB_FILE))?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_setting,
            commands::set_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
