use crate::db;
use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::sync::{Mutex, MutexGuard};
use tauri::State;

pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    fn conn(&self) -> AppResult<MutexGuard<'_, Connection>> {
        self.db
            .lock()
            .map_err(|_| AppError::new("state", "database lock poisoned"))
    }
}

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> AppResult<Option<String>> {
    db::settings::get(&*state.conn()?, &key)
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> AppResult<()> {
    db::settings::set(&*state.conn()?, &key, &value)
}
