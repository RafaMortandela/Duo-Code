use crate::error::AppResult;
use rusqlite::{Connection, OptionalExtension};

pub fn get(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    let value = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| {
            r.get(0)
        })
        .optional()?;
    Ok(value)
}

pub fn set(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn conn() -> (tempfile::TempDir, Connection) {
        let dir = tempfile::tempdir().unwrap();
        let conn = db::open(&dir.path().join("t.db")).unwrap();
        (dir, conn)
    }

    #[test]
    fn missing_key_is_none() {
        let (_d, c) = conn();
        assert_eq!(get(&c, "nope").unwrap(), None);
    }

    #[test]
    fn set_overwrites_previous_value() {
        let (_d, c) = conn();
        set(&c, "theme", "light").unwrap();
        set(&c, "theme", "dark").unwrap();
        assert_eq!(get(&c, "theme").unwrap(), Some("dark".to_string()));
    }
}
