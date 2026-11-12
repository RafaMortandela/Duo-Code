//! Submissões, rascunhos e desistências por questão (spec 002).

use crate::error::AppResult;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;

pub struct NewSubmission<'a> {
    pub slug: &'a str,
    pub code: &'a str,
    pub verdict: &'a str,
    pub passed: usize,
    pub total: usize,
    pub duration_ms: u64,
    pub local_date: &'a str,
}

pub fn insert_submission(conn: &Connection, s: &NewSubmission) -> AppResult<i64> {
    conn.execute(
        "INSERT INTO submissions
            (problem_slug, code, verdict, passed, total, duration_ms, local_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            s.slug,
            s.code,
            s.verdict,
            s.passed as i64,
            s.total as i64,
            s.duration_ms as i64,
            s.local_date
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn count_submissions(conn: &Connection, slug: &str) -> AppResult<i64> {
    Ok(conn.query_row(
        "SELECT count(*) FROM submissions WHERE problem_slug = ?1",
        [slug],
        |r| r.get(0),
    )?)
}

pub fn has_accepted(conn: &Connection, slug: &str) -> AppResult<bool> {
    Ok(conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM submissions
                        WHERE problem_slug = ?1 AND verdict = 'accepted')",
        [slug],
        |r| r.get(0),
    )?)
}

/// Para cada questão com alguma submissão: `true` se já foi aceita.
pub fn attempt_map(conn: &Connection) -> AppResult<HashMap<String, bool>> {
    let mut stmt = conn.prepare(
        "SELECT problem_slug, max(verdict = 'accepted') FROM submissions GROUP BY problem_slug",
    )?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, bool>(1)?)))?;
    let mut map = HashMap::new();
    for row in rows {
        let (slug, solved) = row?;
        map.insert(slug, solved);
    }
    Ok(map)
}

pub fn get_draft(conn: &Connection, slug: &str) -> AppResult<Option<String>> {
    Ok(conn
        .query_row("SELECT code FROM drafts WHERE problem_slug = ?1", [slug], |r| r.get(0))
        .optional()?)
}

pub fn save_draft(conn: &Connection, slug: &str, code: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO drafts (problem_slug, code) VALUES (?1, ?2)
         ON CONFLICT(problem_slug) DO UPDATE SET
            code = excluded.code,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
        [slug, code],
    )?;
    Ok(())
}

pub fn has_given_up(conn: &Connection, slug: &str) -> AppResult<bool> {
    Ok(conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM give_ups WHERE problem_slug = ?1)",
        [slug],
        |r| r.get(0),
    )?)
}

/// Registra a desistência; mantém a data da primeira vez.
pub fn record_give_up(conn: &Connection, slug: &str, local_date: &str) -> AppResult<()> {
    conn.execute(
        "INSERT OR IGNORE INTO give_ups (problem_slug, local_date) VALUES (?1, ?2)",
        [slug, local_date],
    )?;
    Ok(())
}
