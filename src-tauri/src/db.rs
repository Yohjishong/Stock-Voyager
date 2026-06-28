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
            total_share           REAL NOT NULL DEFAULT 0,
            net_profit_ttm        REAL NOT NULL DEFAULT 0,
            net_assets            REAL NOT NULL DEFAULT 0,
            roe                   REAL NOT NULL DEFAULT 0,
            note                  TEXT NOT NULL DEFAULT '',
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS operation_records (
            id                      TEXT PRIMARY KEY,
            stock_id                TEXT NOT NULL,
            operation_type          TEXT NOT NULL,
            operation_date          TEXT NOT NULL,
            shares_delta            REAL NOT NULL DEFAULT 0,
            price                   REAL NOT NULL DEFAULT 0,
            amount                  REAL NOT NULL DEFAULT 0,
            net_profit_per_share    REAL NOT NULL DEFAULT 0,
            dividend_per_10_shares  REAL NOT NULL DEFAULT 0,
            cash_amount             REAL NOT NULL DEFAULT 0,
            shares_before           REAL NOT NULL DEFAULT 0,
            shares_after            REAL NOT NULL DEFAULT 0,
            cost_price_before       REAL NOT NULL DEFAULT 0,
            cost_price_after        REAL NOT NULL DEFAULT 0,
            note                    TEXT NOT NULL DEFAULT '',
            created_at              TEXT NOT NULL,
            updated_at              TEXT NOT NULL,
            current_price_before    REAL NOT NULL DEFAULT 0,
            current_price_after     REAL NOT NULL DEFAULT 0,
            previous_close_before   REAL NOT NULL DEFAULT 0,
            previous_close_after    REAL NOT NULL DEFAULT 0,
            dividend_tax_bucket     TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS stock_notes (
            id          TEXT PRIMARY KEY,
            stock_id    TEXT NOT NULL,
            title       TEXT NOT NULL DEFAULT '',
            content     TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS research_reports (
            id              TEXT PRIMARY KEY,
            title           TEXT NOT NULL DEFAULT '',
            summary         TEXT NOT NULL DEFAULT '',
            content         TEXT NOT NULL DEFAULT '',
            stock_symbols   TEXT NOT NULL DEFAULT '',
            tags            TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_conversations (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT '新对话',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_messages (
            id              TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role            TEXT NOT NULL,
            content         TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS kline_data (
            id          TEXT PRIMARY KEY,
            stock_id    TEXT NOT NULL,
            date        TEXT NOT NULL,
            period      TEXT NOT NULL DEFAULT 'd',
            open        REAL NOT NULL DEFAULT 0,
            high        REAL NOT NULL DEFAULT 0,
            low         REAL NOT NULL DEFAULT 0,
            close       REAL NOT NULL DEFAULT 0,
            volume      REAL NOT NULL DEFAULT 0,
            UNIQUE(stock_id, period, date),
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
        );",
    )?;

    // 数据库迁移: 兼容旧表结构, 忽略列已存在的错误
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN dividend_per_10_shares REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN total_share REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_profit_ttm REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_assets REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN roe REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN total_shares REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_profit_q1 REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_profit_q2 REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_profit_q3 REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_profit_q4 REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN net_assets_parent REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN pe_ttm REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE stocks ADD COLUMN pb REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "UPDATE stocks
         SET total_share = CASE
             WHEN total_share = 0 AND total_shares > 0 THEN total_shares * 100000000
             ELSE total_share
         END,
         net_profit_ttm = CASE
             WHEN net_profit_ttm = 0 THEN net_profit_q1 + net_profit_q2 + net_profit_q3 + net_profit_q4
             ELSE net_profit_ttm
         END,
         net_assets = CASE
             WHEN net_assets = 0 AND net_assets_parent > 0 THEN net_assets_parent
             ELSE net_assets
         END,
         roe = CASE
             WHEN roe = 0 AND net_assets_parent > 0 THEN
                 (net_profit_q1 + net_profit_q2 + net_profit_q3 + net_profit_q4) / net_assets_parent
             ELSE roe
         END;",
    );

    // 迁移: 创建 kline_data 表 (若不存在)
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS kline_data (
            id          TEXT PRIMARY KEY,
            stock_id    TEXT NOT NULL,
            date        TEXT NOT NULL,
            period      TEXT NOT NULL DEFAULT 'd',
            open        REAL NOT NULL DEFAULT 0,
            high        REAL NOT NULL DEFAULT 0,
            low         REAL NOT NULL DEFAULT 0,
            close       REAL NOT NULL DEFAULT 0,
            volume      REAL NOT NULL DEFAULT 0,
            UNIQUE(stock_id, period, date),
            FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
        );",
    );

    // 迁移: kline_data 加 period 列并重建 UNIQUE 约束
    // 先检查是否已有 period 列；若无则执行表重建
    let has_period: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('kline_data') WHERE name='period'",
            [],
            |r| r.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;
    if !has_period {
        let _ = conn.execute_batch(
            "BEGIN;
             ALTER TABLE kline_data RENAME TO kline_data_old;
             CREATE TABLE kline_data (
                 id          TEXT PRIMARY KEY,
                 stock_id    TEXT NOT NULL,
                 date        TEXT NOT NULL,
                 period      TEXT NOT NULL DEFAULT 'd',
                 open        REAL NOT NULL DEFAULT 0,
                 high        REAL NOT NULL DEFAULT 0,
                 low         REAL NOT NULL DEFAULT 0,
                 close       REAL NOT NULL DEFAULT 0,
                 volume      REAL NOT NULL DEFAULT 0,
                 UNIQUE(stock_id, period, date),
                 FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
             );
             INSERT INTO kline_data (id, stock_id, date, period, open, high, low, close, volume)
                 SELECT id, stock_id, date, 'd', open, high, low, close, volume FROM kline_data_old;
             DROP TABLE kline_data_old;
             COMMIT;",
        );
    }
    let _ = conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_kline_stock_period_date ON kline_data(stock_id, period, date);",
    );

    let _ = conn.execute_batch(
        "ALTER TABLE operation_records ADD COLUMN current_price_before REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE operation_records ADD COLUMN current_price_after REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE operation_records ADD COLUMN previous_close_before REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE operation_records ADD COLUMN previous_close_after REAL NOT NULL DEFAULT 0;",
    );
    let _ = conn.execute_batch(
        "ALTER TABLE operation_records ADD COLUMN dividend_tax_bucket TEXT NOT NULL DEFAULT '';",
    );

    Ok(())
}
