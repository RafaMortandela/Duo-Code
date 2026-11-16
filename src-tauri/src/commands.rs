//! Comandos expostos ao frontend. Só repassam para `Core`.

use crate::core::{
    Core, ProblemDetail, ProblemSummary, Progress, ReviewQueue, ReviewSchedule, SubmitResult, TrailUnit,
};
use crate::domain::srs::Rating;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::runner::RunOutcome;
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

/// Data local de hoje, `YYYY-MM-DD`. Único lugar que lê o relógio.
pub fn today() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[tauri::command]
pub fn get_setting(core: State<'_, Core>, key: String) -> AppResult<Option<String>> {
    db::settings::get(&*core.conn()?, &key)
}

#[tauri::command]
pub fn set_setting(core: State<'_, Core>, key: String, value: String) -> AppResult<()> {
    db::settings::set(&*core.conn()?, &key, &value)
}

#[tauri::command]
pub fn list_problems(core: State<'_, Core>) -> AppResult<Vec<ProblemSummary>> {
    core.list_problems()
}

#[tauri::command]
pub fn get_problem(core: State<'_, Core>, slug: String) -> AppResult<ProblemDetail> {
    core.get_problem(&slug)
}

// `async`: roda fora da thread principal, para a interface não travar
// enquanto o Python executa.
#[tauri::command(async)]
pub fn run_code(core: State<'_, Core>, slug: String, code: String) -> AppResult<RunOutcome> {
    core.run_code(&slug, &code)
}

#[tauri::command(async)]
pub fn submit_code(
    core: State<'_, Core>,
    slug: String,
    code: String,
    review: Option<bool>,
) -> AppResult<SubmitResult> {
    if review.unwrap_or(false) {
        core.submit_review(&slug, &code, &today())
    } else {
        core.submit_code(&slug, &code, &today())
    }
}

#[tauri::command]
pub fn get_review_queue(core: State<'_, Core>) -> AppResult<ReviewQueue> {
    core.review_queue(&today())
}

#[tauri::command]
pub fn rate_review(core: State<'_, Core>, slug: String, rating: Rating) -> AppResult<ReviewSchedule> {
    core.rate_review(&slug, rating, &today())
}

#[tauri::command]
pub fn fail_review(core: State<'_, Core>, slug: String) -> AppResult<ReviewSchedule> {
    core.fail_review(&slug, &today())
}

#[tauri::command]
pub fn save_draft(core: State<'_, Core>, slug: String, code: String) -> AppResult<()> {
    core.save_draft(&slug, &code)
}

#[tauri::command]
pub fn get_solution(core: State<'_, Core>, slug: String, give_up: bool) -> AppResult<String> {
    core.get_solution(&slug, give_up, &today())
}

#[tauri::command]
pub fn get_progress(core: State<'_, Core>) -> AppResult<Progress> {
    core.progress(&today())
}

#[tauri::command]
pub fn get_trail(core: State<'_, Core>) -> AppResult<Vec<TrailUnit>> {
    core.trail(&today())
}

/// "Testar notificação" (005 RF-6).
#[tauri::command]
pub fn test_notification(app: AppHandle) -> AppResult<()> {
    crate::desktop::notify(&app, &crate::reminder::test_message())
}

fn autostart_error(e: impl std::fmt::Display) -> AppError {
    AppError::new("autostart", e.to_string())
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> AppResult<bool> {
    app.autolaunch().is_enabled().map_err(autostart_error)
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> AppResult<()> {
    let launcher = app.autolaunch();
    if enabled {
        launcher.enable().map_err(autostart_error)
    } else {
        launcher.disable().map_err(autostart_error)
    }
}
