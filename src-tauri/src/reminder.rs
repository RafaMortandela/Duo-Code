//! Lembrete diário (spec 005): decide, monta o texto e agenda a verificação.
//!
//! Os textos ficam aqui, e não em `src/copy.ts`, porque a notificação é
//! montada no backend com a janela possivelmente fechada.

use crate::core::Core;
use crate::db;
use crate::domain::reminder::{config_from, should_notify};
use crate::domain::streak::{streak, DayState};
use crate::error::AppResult;
use chrono::NaiveDateTime;
use std::time::Duration;

pub const KEY_ENABLED: &str = "reminder_enabled";
pub const KEY_TIME: &str = "reminder_time";
pub const KEY_LAST_NOTIFIED: &str = "last_notified_date";

pub const TITLE: &str = "Duo Code";
const CHECK_EVERY: Duration = Duration::from_secs(30);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reminder {
    pub title: String,
    pub body: String,
}

/// Texto do lembrete conforme a situação do streak.
pub fn message(current_streak: u32, state: DayState) -> Reminder {
    let body = match (state, current_streak) {
        (DayState::AtRisk, 1) => {
            "Seu streak de 1 dia tá em risco, diva 🔥 Uma questão e ele fica servido.".to_string()
        }
        (DayState::AtRisk, n) => {
            format!("Seu streak de {n} dias tá em risco, diva 🔥 Uma questão e ele fica servido.")
        }
        _ => "Bora recomeçar o streak hoje? Uma questão só e você já divou ✨".to_string(),
    };
    Reminder { title: TITLE.to_string(), body }
}

pub fn test_message() -> Reminder {
    Reminder {
        title: TITLE.to_string(),
        body: "As notificações estão funcionando. Divou! ✨".to_string(),
    }
}

/// Uma verificação do lembrete em `now` (hora local). Se for o caso de
/// notificar, registra que hoje já notificou e devolve o texto.
pub fn tick(core: &Core, now: NaiveDateTime) -> AppResult<Option<Reminder>> {
    let today = now.date();
    let today_text = today.format(db::progress::DATE_FORMAT).to_string();
    let conn = core.conn()?;

    let config = config_from(
        db::settings::get(&conn, KEY_ENABLED)?.as_deref(),
        db::settings::get(&conn, KEY_TIME)?.as_deref(),
    );
    let active = db::progress::active_dates(&conn)?;
    let already = db::settings::get(&conn, KEY_LAST_NOTIFIED)?.as_deref() == Some(today_text.as_str());

    if !should_notify(now.time(), config, active.contains(&today), already) {
        return Ok(None);
    }
    db::settings::set(&conn, KEY_LAST_NOTIFIED, &today_text)?;
    let s = streak(&active, today);
    Ok(Some(message(s.current, s.state)))
}

/// Verifica o lembrete periodicamente enquanto o app estiver rodando.
pub fn spawn(app: tauri::AppHandle) {
    use tauri::Manager;
    std::thread::spawn(move || loop {
        let core = app.state::<Core>();
        match tick(&core, chrono::Local::now().naive_local()) {
            Ok(Some(reminder)) => {
                if let Err(e) = crate::desktop::notify(&app, &reminder) {
                    eprintln!("[reminder] could not notify: {e}");
                }
            }
            Ok(None) => {}
            Err(e) => eprintln!("[reminder] {e}"),
        }
        std::thread::sleep(CHECK_EVERY);
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::testing::add_problem;

    fn core() -> (tempfile::TempDir, Core) {
        let dir = tempfile::tempdir().unwrap();
        let conn = db::open(&dir.path().join("t.db")).unwrap();
        (dir, Core::new(conn, vec![add_problem()]))
    }

    fn at(day: &str, time: &str) -> NaiveDateTime {
        NaiveDateTime::parse_from_str(&format!("{day} {time}"), "%Y-%m-%d %H:%M").unwrap()
    }

    fn set(core: &Core, key: &str, value: &str) {
        db::settings::set(&core.conn().unwrap(), key, value).unwrap();
    }

    fn solve(core: &Core, day: &str) {
        core.submit_code("add", &add_problem().solution, day).unwrap();
    }

    const DAY: &str = "2026-11-16";

    #[test]
    fn defaults_notify_at_19h_and_only_once() {
        let (_d, core) = core();
        assert_eq!(tick(&core, at(DAY, "18:59")).unwrap(), None);
        let first = tick(&core, at(DAY, "19:00")).unwrap();
        assert!(first.is_some());
        assert_eq!(tick(&core, at(DAY, "19:01")).unwrap(), None);
        assert_eq!(tick(&core, at(DAY, "23:59")).unwrap(), None);
        // no dia seguinte volta a valer
        assert!(tick(&core, at("2026-11-17", "19:00")).unwrap().is_some());
    }

    // CA-11
    #[test]
    fn app_opened_after_the_time_notifies_once() {
        let (_d, core) = core();
        assert!(tick(&core, at(DAY, "21:00")).unwrap().is_some());
        assert_eq!(tick(&core, at(DAY, "21:00")).unwrap(), None);
    }

    #[test]
    fn no_reminder_when_something_was_solved_today() {
        let (_d, core) = core();
        solve(&core, DAY);
        assert_eq!(tick(&core, at(DAY, "20:00")).unwrap(), None);
        // e não "gasta" a notificação do dia
        assert_eq!(db::settings::get(&core.conn().unwrap(), KEY_LAST_NOTIFIED).unwrap(), None);
    }

    #[test]
    fn respects_the_configured_time_and_the_off_switch() {
        let (_d, core) = core();
        set(&core, KEY_TIME, "08:30");
        assert_eq!(tick(&core, at(DAY, "08:29")).unwrap(), None);
        assert!(tick(&core, at(DAY, "08:30")).unwrap().is_some());

        let (_d2, off) = core_off();
        assert_eq!(tick(&off, at(DAY, "23:00")).unwrap(), None);
    }

    fn core_off() -> (tempfile::TempDir, Core) {
        let (d, core) = core();
        set(&core, KEY_ENABLED, "false");
        (d, core)
    }

    #[test]
    fn text_depends_on_the_streak() {
        let (_d, core) = core();
        // sem histórico: convite para (re)começar
        let fresh = tick(&core, at(DAY, "19:00")).unwrap().unwrap();
        assert_eq!(fresh.title, TITLE);
        assert!(fresh.body.contains("recomeçar"), "{}", fresh.body);

        // resolveu ontem: streak de 1 dia em risco
        let (_d2, risky) = core_with_yesterday();
        let body = tick(&risky, at(DAY, "19:00")).unwrap().unwrap().body;
        assert!(body.contains("streak de 1 dia") && body.contains("risco"), "{body}");

        assert!(message(5, DayState::AtRisk).body.contains("streak de 5 dias"));
        assert!(message(0, DayState::Broken).body.contains("recomeçar"));
    }

    fn core_with_yesterday() -> (tempfile::TempDir, Core) {
        let (d, core) = core();
        solve(&core, "2026-11-15");
        (d, core)
    }
}
