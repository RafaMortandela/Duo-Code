//! Eventos de XP e conquistas (spec 003).
//!
//! `xp_events` é a fonte da verdade: XP total é a soma, e os dias ativos são
//! as datas distintas dos eventos.

use crate::error::{AppError, AppResult};
use chrono::NaiveDate;
use rusqlite::{params, Connection};
use std::collections::{BTreeSet, HashMap, HashSet};

pub const KIND_SOLVE: &str = "solve";
pub const KIND_REVIEW: &str = "review";
pub const DATE_FORMAT: &str = "%Y-%m-%d";

pub fn parse_date(s: &str) -> AppResult<NaiveDate> {
    NaiveDate::parse_from_str(s, DATE_FORMAT)
        .map_err(|_| AppError::new("invalid_date", format!("'{s}' is not a YYYY-MM-DD date")))
}

pub fn insert_xp_event(
    conn: &Connection,
    local_date: &str,
    kind: &str,
    slug: &str,
    amount: u32,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO xp_events (local_date, kind, problem_slug, amount) VALUES (?1, ?2, ?3, ?4)",
        params![local_date, kind, slug, amount],
    )?;
    Ok(())
}

pub fn xp_total(conn: &Connection) -> AppResult<u32> {
    Ok(conn.query_row("SELECT coalesce(sum(amount), 0) FROM xp_events", [], |r| r.get(0))?)
}

pub fn active_dates(conn: &Connection) -> AppResult<BTreeSet<NaiveDate>> {
    let mut stmt = conn.prepare("SELECT DISTINCT local_date FROM xp_events")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    let mut dates = BTreeSet::new();
    for row in rows {
        dates.insert(parse_date(&row?)?);
    }
    Ok(dates)
}

/// Questões que já renderam XP de primeira resolução.
pub fn rewarded_slugs(conn: &Connection) -> AppResult<HashSet<String>> {
    let mut stmt =
        conn.prepare("SELECT DISTINCT problem_slug FROM xp_events WHERE kind = 'solve'")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    let mut slugs = HashSet::new();
    for row in rows {
        slugs.insert(row?);
    }
    Ok(slugs)
}

pub fn review_count(conn: &Connection) -> AppResult<u32> {
    Ok(conn.query_row("SELECT count(*) FROM xp_events WHERE kind = 'review'", [], |r| r.get(0))?)
}

/// Eventos por dia a partir de `from` (inclusive), em ordem de data.
pub fn activity_since(conn: &Connection, from: &str) -> AppResult<Vec<(String, u32)>> {
    let mut stmt = conn.prepare(
        "SELECT local_date, count(*) FROM xp_events
         WHERE local_date >= ?1 GROUP BY local_date ORDER BY local_date",
    )?;
    let rows = stmt.query_map([from], |r| Ok((r.get(0)?, r.get(1)?)))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

/// id → data em que foi destravada.
pub fn unlocked_achievements(conn: &Connection) -> AppResult<HashMap<String, String>> {
    let mut stmt = conn.prepare("SELECT id, local_date FROM achievements_unlocked")?;
    let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
    let mut map = HashMap::new();
    for row in rows {
        let (id, date) = row?;
        map.insert(id, date);
    }
    Ok(map)
}

pub fn unlock_achievement(conn: &Connection, id: &str, local_date: &str) -> AppResult<()> {
    conn.execute(
        "INSERT OR IGNORE INTO achievements_unlocked (id, local_date) VALUES (?1, ?2)",
        [id, local_date],
    )?;
    Ok(())
}
