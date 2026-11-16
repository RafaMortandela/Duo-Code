pub mod problems;
pub mod progress;
pub mod reviews;
pub mod settings;

use crate::error::AppResult;
use rusqlite::Connection;
use std::path::Path;

/// Migrações em ordem. Só acrescente ao fim; nunca edite uma já publicada.
/// A quantidade aplicada fica em `PRAGMA user_version`.
const MIGRATIONS: &[&str] = &[
    // 1 — configurações chave/valor
    "CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    ) STRICT;",
    // 2 — submissões, rascunhos e desistências (spec 002)
    "CREATE TABLE submissions (
        id           INTEGER PRIMARY KEY,
        problem_slug TEXT NOT NULL,
        code         TEXT NOT NULL,
        verdict      TEXT NOT NULL,
        passed       INTEGER NOT NULL,
        total        INTEGER NOT NULL,
        duration_ms  INTEGER NOT NULL,
        local_date   TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
    CREATE INDEX idx_submissions_problem ON submissions (problem_slug, verdict);
    CREATE TABLE drafts (
        problem_slug TEXT PRIMARY KEY,
        code         TEXT NOT NULL,
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
    CREATE TABLE give_ups (
        problem_slug TEXT PRIMARY KEY,
        local_date   TEXT NOT NULL
    ) STRICT;",
    // 3 — eventos de XP (fonte de XP e dos dias ativos) e conquistas (spec 003)
    "CREATE TABLE xp_events (
        id           INTEGER PRIMARY KEY,
        local_date   TEXT NOT NULL,
        kind         TEXT NOT NULL CHECK (kind IN ('solve', 'review')),
        problem_slug TEXT NOT NULL,
        amount       INTEGER NOT NULL CHECK (amount >= 0),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
    CREATE INDEX idx_xp_events_date ON xp_events (local_date);
    CREATE UNIQUE INDEX idx_xp_events_one_solve
        ON xp_events (problem_slug) WHERE kind = 'solve';
    CREATE TABLE achievements_unlocked (
        id         TEXT PRIMARY KEY,
        local_date TEXT NOT NULL
    ) STRICT;",
    // 4 — unidades já liberadas: nunca voltam a ficar bloqueadas (spec 004)
    "CREATE TABLE units_unlocked (
        unit_id    TEXT PRIMARY KEY,
        local_date TEXT NOT NULL
    ) STRICT;",
    // 5 — revisão espaçada (spec 005). As questões já resolvidas entram na
    //     fila com vencimento no dia seguinte à primeira aceitação.
    "CREATE TABLE reviews (
        problem_slug    TEXT PRIMARY KEY,
        stage           INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 4),
        due_date        TEXT NOT NULL,
        last_reviewed   TEXT,
        awaiting_rating INTEGER NOT NULL DEFAULT 0,
        stage_before    INTEGER
    ) STRICT;
    INSERT INTO reviews (problem_slug, stage, due_date)
        SELECT problem_slug, 0, date(min(local_date), '+1 day')
        FROM submissions WHERE verdict = 'accepted' GROUP BY problem_slug;",
];

/// Abre (criando se preciso) o banco em `path` e aplica as migrações pendentes.
pub fn open(path: &Path) -> AppResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut conn = Connection::open(path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&mut conn)?;
    Ok(conn)
}

pub fn schema_version(conn: &Connection) -> AppResult<usize> {
    let v: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
    Ok(v as usize)
}

/// Aplica as migrações que faltam. Idempotente: rodar de novo não faz nada.
pub fn migrate(conn: &mut Connection) -> AppResult<()> {
    migrate_up_to(conn, MIGRATIONS.len())
}

/// Aplica as migrações pendentes até a de número `limit` (inclusive).
fn migrate_up_to(conn: &mut Connection, limit: usize) -> AppResult<()> {
    let current = schema_version(conn)?;
    for (i, sql) in MIGRATIONS.iter().enumerate().take(limit).skip(current) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", (i + 1) as i64)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // CA-1: sem banco, abrir cria o arquivo e aplica todas as migrações.
    #[test]
    fn open_creates_file_and_applies_all_migrations() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("duo-code.db");
        assert!(!path.exists());

        let conn = open(&path).unwrap();

        assert!(path.exists());
        assert_eq!(schema_version(&conn).unwrap(), MIGRATIONS.len());
        let tables: i64 = conn
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='settings'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(tables, 1);
    }

    // CA-2: rodar as migrações duas vezes não gera erro nem duplica dados.
    #[test]
    fn migrate_twice_is_idempotent_and_keeps_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("duo-code.db");
        let mut conn = open(&path).unwrap();
        settings::set(&conn, "theme", "dark").unwrap();

        migrate(&mut conn).unwrap();
        migrate(&mut conn).unwrap();

        assert_eq!(schema_version(&conn).unwrap(), MIGRATIONS.len());
        let rows: i64 = conn
            .query_row("SELECT count(*) FROM settings", [], |r| r.get(0))
            .unwrap();
        assert_eq!(rows, 1);
    }

    // CA-3: o valor gravado sobrevive a fechar e reabrir o banco (reinício do app).
    #[test]
    fn setting_survives_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("duo-code.db");
        {
            let conn = open(&path).unwrap();
            settings::set(&conn, "theme", "dark").unwrap();
        }
        let conn = open(&path).unwrap();
        assert_eq!(
            settings::get(&conn, "theme").unwrap(),
            Some("dark".to_string())
        );
    }

    // Migração 5: quem já tinha questões resolvidas as encontra na fila de revisão.
    #[test]
    fn migration_5_backfills_reviews_for_already_solved_problems() {
        let dir = tempfile::tempdir().unwrap();
        let mut conn = Connection::open(dir.path().join("old.db")).unwrap();
        migrate_up_to(&mut conn, 4).unwrap();
        assert_eq!(schema_version(&conn).unwrap(), 4);
        conn.execute_batch(
            "INSERT INTO submissions (problem_slug, code, verdict, passed, total, duration_ms, local_date) VALUES
                ('solved', '', 'wrong_answer', 0, 1, 1, '2026-11-09'),
                ('solved', '', 'accepted',     1, 1, 1, '2026-11-10'),
                ('solved', '', 'accepted',     1, 1, 1, '2026-11-14'),
                ('tried',  '', 'wrong_answer', 0, 1, 1, '2026-11-10');",
        )
        .unwrap();

        migrate(&mut conn).unwrap();

        let rows = reviews::all(&conn).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].slug, "solved");
        assert_eq!(rows[0].stage, 0);
        assert_eq!(rows[0].due.to_string(), "2026-11-11");
        assert!(!rows[0].awaiting_rating);
    }
}
