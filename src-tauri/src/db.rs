use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_db(db_path: &Path) -> Result<()> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS stocks (
            id                    TEXT PRIMARY KEY,
            name                  TEXT NOT NULL,
            symbol                TEXT NOT NULL DEFAULT '',
            market                TEXT NOT NULL DEFAULT 'A股',
            currency              TEXT NOT NULL DEFAULT 'CNY',
            current_price         REAL NOT NULL DEFAULT 0,
            previous_close        REAL NOT NULL DEFAULT 0,
            shares                REAL NOT NULL DEFAULT 0,
            cost_price            REAL NOT NULL DEFAULT 0,
            pe                    REAL NOT NULL DEFAULT 0,
            dividend_per_10_shares REAL NOT NULL DEFAULT 0,
            note                  TEXT NOT NULL DEFAULT '',
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS snapshots (
            id            TEXT PRIMARY KEY,
            stock_id      TEXT NOT NULL,
            date          TEXT NOT NULL,
            current_price REAL NOT NULL DEFAULT 0,
            shares        REAL NOT NULL DEFAULT 0,
            market_value  REAL NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL,
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
        );",
    )?;

    // 数据库迁移: 兼容旧表结构, 忽略列已存在的错误
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN dividend_per_10_shares REAL NOT NULL DEFAULT 0;",
    );

    Ok(())
}
