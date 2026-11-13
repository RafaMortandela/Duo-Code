//! Comandos expostos ao frontend. Só repassam para `Core`.

use crate::core::{Core, ProblemDetail, ProblemSummary, Progress, SubmitResult};
use crate::db;
use crate::error::AppResult;
use crate::runner::RunOutcome;
use tauri::State;

/// Data local de hoje, `YYYY-MM-DD`. Único lugar que lê o relógio.
fn today() -> String {
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
pub fn submit_code(core: State<'_, Core>, slug: String, code: String) -> AppResult<SubmitResult> {
    core.submit_code(&slug, &code, &today())
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
