use crate::AppState;
use crate::commands::Stock;
use rusqlite::params;
use std::fs;
use uuid::Uuid;
use chrono::Utc;

fn load_stocks_from_db(db_path: &std::path::Path) -> Result<Vec<Stock>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, symbol, market, currency, current_price, previous_close,
                    shares, cost_price, pe, dividend_per_10_shares,
                    total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
                    net_assets_parent, note, created_at, updated_at
             FROM stocks",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
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
                total_shares: row.get(11)?,
                net_profit_q1: row.get(12)?,
                net_profit_q2: row.get(13)?,
                net_profit_q3: row.get(14)?,
                net_profit_q4: row.get(15)?,
                net_assets_parent: row.get(16)?,
                note: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_stocks_csv(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let stocks = load_stocks_from_db(&db_path)?;

    let mut wtr = csv::Writer::from_path(&path).map_err(|e| e.to_string())?;

    wtr.write_record([
        "id", "name", "symbol", "market", "currency",
        "current_price", "previous_close", "shares", "cost_price",
        "pe", "dividend_per_10_shares",
        "total_shares", "net_profit_q1", "net_profit_q2", "net_profit_q3", "net_profit_q4",
        "net_assets_parent", "note", "created_at", "updated_at",
    ])
    .map_err(|e| e.to_string())?;

    for s in &stocks {
        wtr.write_record([
            &s.id,
            &s.name,
            &s.symbol,
            &s.market,
            &s.currency,
            &s.current_price.to_string(),
            &s.previous_close.to_string(),
            &s.shares.to_string(),
            &s.cost_price.to_string(),
            &s.pe.to_string(),
            &s.dividend_per_10_shares.to_string(),
            &s.total_shares.to_string(),
            &s.net_profit_q1.to_string(),
            &s.net_profit_q2.to_string(),
            &s.net_profit_q3.to_string(),
            &s.net_profit_q4.to_string(),
            &s.net_assets_parent.to_string(),
            &s.note,
            &s.created_at,
            &s.updated_at,
        ])
        .map_err(|e| e.to_string())?;
    }

    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn export_stocks_json(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let stocks = load_stocks_from_db(&db_path)?;
    let json = serde_json::to_string_pretty(&stocks).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn backup_database(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    fs::copy(&db_path, &path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_stocks_json(
    state: tauri::State<AppState>,
    path: String,
) -> Result<usize, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let stocks: Vec<serde_json::Value> =
        serde_json::from_str(&content).map_err(|e| format!("JSON 解析失败: {}", e))?;

    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut count = 0usize;

    for s in &stocks {
        let name = s["name"].as_str().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO stocks
                (id, name, symbol, market, currency, current_price, previous_close,
                 shares, cost_price, pe, dividend_per_10_shares,
                 total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
                 net_assets_parent, note, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)",
            params![
                id,
                name,
                s["symbol"].as_str().unwrap_or(""),
                s["market"].as_str().unwrap_or("A股"),
                s["currency"].as_str().unwrap_or("CNY"),
                s["current_price"].as_f64().unwrap_or(0.0),
                s["previous_close"].as_f64().unwrap_or(0.0),
                s["shares"].as_f64().unwrap_or(0.0),
                s["cost_price"].as_f64().unwrap_or(0.0),
                s["pe"].as_f64().unwrap_or(0.0),
                s["dividend_per_10_shares"].as_f64().unwrap_or(0.0),
                s["total_shares"].as_f64().unwrap_or(0.0),
                s["net_profit_q1"].as_f64().unwrap_or(0.0),
                s["net_profit_q2"].as_f64().unwrap_or(0.0),
                s["net_profit_q3"].as_f64().unwrap_or(0.0),
                s["net_profit_q4"].as_f64().unwrap_or(0.0),
                s["net_assets_parent"].as_f64().unwrap_or(0.0),
                s["note"].as_str().unwrap_or(""),
                now,
                now
            ],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }

    Ok(count)
}

#[tauri::command]
pub fn import_stocks_csv(
    state: tauri::State<AppState>,
    path: String,
) -> Result<usize, String> {
    let mut rdr = csv::Reader::from_path(&path).map_err(|e| e.to_string())?;
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut count = 0usize;

    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let header_map: std::collections::HashMap<&str, usize> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h, i))
        .collect();

    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;

        let get = |key: &str| -> String {
            header_map
                .get(key)
                .and_then(|&i| record.get(i))
                .unwrap_or("")
                .to_string()
        };

        let name = get("name");
        if name.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        let market = { let m = get("market"); if m.is_empty() { "A股".to_string() } else { m } };
        let currency = { let c = get("currency"); if c.is_empty() { "CNY".to_string() } else { c } };
        let symbol = get("symbol");
        let note = get("note");
        let current_price = get("current_price").parse::<f64>().unwrap_or(0.0);
        let previous_close = get("previous_close").parse::<f64>().unwrap_or(0.0);
        let shares = get("shares").parse::<f64>().unwrap_or(0.0);
        let cost_price = get("cost_price").parse::<f64>().unwrap_or(0.0);
        let pe = get("pe").parse::<f64>().unwrap_or(0.0);
        let dividend_per_10_shares = get("dividend_per_10_shares").parse::<f64>().unwrap_or(0.0);
        let total_shares = get("total_shares").parse::<f64>().unwrap_or(0.0);
        let net_profit_q1 = get("net_profit_q1").parse::<f64>().unwrap_or(0.0);
        let net_profit_q2 = get("net_profit_q2").parse::<f64>().unwrap_or(0.0);
        let net_profit_q3 = get("net_profit_q3").parse::<f64>().unwrap_or(0.0);
        let net_profit_q4 = get("net_profit_q4").parse::<f64>().unwrap_or(0.0);
        let net_assets_parent = get("net_assets_parent").parse::<f64>().unwrap_or(0.0);

        conn.execute(
            "INSERT OR IGNORE INTO stocks
                (id, name, symbol, market, currency, current_price, previous_close,
                 shares, cost_price, pe, dividend_per_10_shares,
                 total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
                 net_assets_parent, note, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)",
            params![
                id, name, symbol, market, currency,
                current_price, previous_close, shares, cost_price, pe,
                dividend_per_10_shares,
                total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
                net_assets_parent, note, now, now
            ],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }

    Ok(count)
}

#[tauri::command]
pub fn restore_database(state: tauri::State<AppState>, path: String) -> Result<(), String> {
    let test_conn = rusqlite::Connection::open(&path).map_err(|e| e.to_string())?;
    test_conn
        .execute_batch("SELECT 1;")
        .map_err(|_| "备份文件不是有效的 SQLite 数据库".to_string())?;
    drop(test_conn);

    let db_path = state.db_path.lock().unwrap().clone();
    fs::copy(&path, &db_path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
