use crate::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Stock {
    pub id: String,
    pub name: String,
    pub symbol: String,
    pub market: String,
    pub currency: String,
    pub current_price: f64,
    pub previous_close: f64,
    pub shares: f64,
    pub cost_price: f64,
    pub pe: f64,
    pub dividend_per_10_shares: f64,
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
}

fn row_to_stock(row: &rusqlite::Row) -> rusqlite::Result<Stock> {
    Ok(Stock {
        id: row.get(0)?,
        name: row.get(1)?,
        symbol: row.get(2)?,
        market: row.get(3)?,
        currency: row.get(4)?,
        current_price: row.get(5)?,
        previous_close: row.get(6)?,
        shares: row.get(7)?,
        cost_price: row.get(8)?,
        pe: row.get(9)?,
        dividend_per_10_shares: row.get(10)?,
        note: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

const SELECT_FIELDS: &str =
    "id, name, symbol, market, currency, current_price, previous_close,
     shares, cost_price, pe, dividend_per_10_shares, note, created_at, updated_at";

#[tauri::command]
pub fn list_stocks(state: tauri::State<AppState>) -> Result<Vec<Stock>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let query = format!(
        "SELECT {} FROM stocks ORDER BY updated_at DESC",
        SELECT_FIELDS
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_stock)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_stock(
    state: tauri::State<AppState>,
    stock: serde_json::Value,
) -> Result<Stock, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let name = stock["name"].as_str().unwrap_or("").to_string();
    let symbol = stock["symbol"].as_str().unwrap_or("").to_string();
    let market = stock["market"].as_str().unwrap_or("A股").to_string();
    let currency = stock["currency"].as_str().unwrap_or("CNY").to_string();
    let current_price = stock["current_price"].as_f64().unwrap_or(0.0);
    let previous_close = stock["previous_close"].as_f64().unwrap_or(0.0);
    let shares = stock["shares"].as_f64().unwrap_or(0.0);
    let cost_price = stock["cost_price"].as_f64().unwrap_or(0.0);
    let pe = stock["pe"].as_f64().unwrap_or(0.0);
    let dividend_per_10_shares = stock["dividend_per_10_shares"].as_f64().unwrap_or(0.0);
    let note = stock["note"].as_str().unwrap_or("").to_string();

    conn.execute(
        "INSERT INTO stocks (id, name, symbol, market, currency, current_price,
            previous_close, shares, cost_price, pe, dividend_per_10_shares,
            note, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            id, name, symbol, market, currency,
            current_price, previous_close, shares, cost_price, pe,
            dividend_per_10_shares, note, now, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stock {
        id, name, symbol, market, currency,
        current_price, previous_close, shares, cost_price, pe,
        dividend_per_10_shares, note,
        created_at: now.clone(), updated_at: now,
    })
}

#[tauri::command]
pub fn update_stock(
    state: tauri::State<AppState>,
    stock: serde_json::Value,
) -> Result<Stock, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = stock["id"].as_str().unwrap_or("").to_string();
    let name = stock["name"].as_str().unwrap_or("").to_string();
    let symbol = stock["symbol"].as_str().unwrap_or("").to_string();
    let market = stock["market"].as_str().unwrap_or("A股").to_string();
    let currency = stock["currency"].as_str().unwrap_or("CNY").to_string();
    let current_price = stock["current_price"].as_f64().unwrap_or(0.0);
    let previous_close = stock["previous_close"].as_f64().unwrap_or(0.0);
    let shares = stock["shares"].as_f64().unwrap_or(0.0);
    let cost_price = stock["cost_price"].as_f64().unwrap_or(0.0);
    let pe = stock["pe"].as_f64().unwrap_or(0.0);
    let dividend_per_10_shares = stock["dividend_per_10_shares"].as_f64().unwrap_or(0.0);
    let note = stock["note"].as_str().unwrap_or("").to_string();

    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM stocks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("股票不存在: {}", e))?;

    conn.execute(
        "UPDATE stocks SET name=?2, symbol=?3, market=?4, currency=?5,
            current_price=?6, previous_close=?7, shares=?8, cost_price=?9,
            pe=?10, dividend_per_10_shares=?11, note=?12, updated_at=?13
         WHERE id=?1",
        params![
            id, name, symbol, market, currency,
            current_price, previous_close, shares, cost_price, pe,
            dividend_per_10_shares, note, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stock {
        id, name, symbol, market, currency,
        current_price, previous_close, shares, cost_price, pe,
        dividend_per_10_shares, note,
        created_at, updated_at: now,
    })
}

#[tauri::command]
pub fn delete_stock(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM stocks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_setting(state: tauri::State<AppState>, key: String) -> Result<Option<String>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    match conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ) {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_setting(
    state: tauri::State<AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_database_path(state: tauri::State<AppState>) -> String {
    state.db_path.lock().unwrap().to_string_lossy().to_string()
}
