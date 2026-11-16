//! Agendamento de revisão por questão (spec 005).

use crate::db::progress::{parse_date, DATE_FORMAT};
use crate::domain::srs::Schedule;
use crate::error::AppResult;
use chrono::NaiveDate;
use rusqlite::{params, Connection, OptionalExtension};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReviewRow {
    pub slug: String,
    pub stage: u8,
    pub due: NaiveDate,
    pub last_reviewed: Option<String>,
    /// A revisão foi aceita, mas a usuária ainda não disse o quanto foi difícil.
    pub awaiting_rating: bool,
    /// Estágio antes da revisão que está aguardando avaliação.
    pub stage_before: Option<u8>,
}

fn from_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<(String, u8, String, Option<String>, bool, Option<u8>)> {
    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?))
}

fn build(raw: (String, u8, String, Option<String>, bool, Option<u8>)) -> AppResult<ReviewRow> {
    let (slug, stage, due, last_reviewed, awaiting_rating, stage_before) = raw;
    Ok(ReviewRow { slug, stage, due: parse_date(&due)?, last_reviewed, awaiting_rating, stage_before })
}

const COLUMNS: &str = "problem_slug, stage, due_date, last_reviewed, awaiting_rating, stage_before";

pub fn get(conn: &Connection, slug: &str) -> AppResult<Option<ReviewRow>> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM reviews WHERE problem_slug = ?1"),
        [slug],
        from_row,
    )
    .optional()?
    .map(build)
    .transpose()
}

pub fn all(conn: &Connection) -> AppResult<Vec<ReviewRow>> {
    let mut stmt = conn.prepare(&format!("SELECT {COLUMNS} FROM reviews"))?;
    let rows = stmt.query_map([], from_row)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(build(row?)?);
    }
    Ok(out)
}

/// Cria ou substitui o agendamento de uma questão.
pub fn save(
    conn: &Connection,
    slug: &str,
    schedule: Schedule,
    last_reviewed: Option<&str>,
    awaiting_rating: bool,
    stage_before: Option<u8>,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO reviews
            (problem_slug, stage, due_date, last_reviewed, awaiting_rating, stage_before)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(problem_slug) DO UPDATE SET
            stage = excluded.stage,
            due_date = excluded.due_date,
            last_reviewed = excluded.last_reviewed,
            awaiting_rating = excluded.awaiting_rating,
            stage_before = excluded.stage_before",
        params![
            slug,
            schedule.stage,
            schedule.due.format(DATE_FORMAT).to_string(),
            last_reviewed,
            awaiting_rating,
            stage_before
        ],
    )?;
    Ok(())
}
