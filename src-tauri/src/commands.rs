use crate::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{path::BaseDirectory, Manager};

const STOCK_METRICS_SCRIPT: &str = "scripts/get_stock_metrics.py";
const STOCK_PRICE_SCRIPT: &str = "scripts/get_value.py";
const KLINE_SCRIPT: &str = "scripts/get_kline.py";

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
    pub total_share: f64,
    pub net_profit_ttm: f64,
    pub net_assets: f64,
    pub roe: f64,
    pub pe_ttm: f64,
    pub pb: f64,
    pub total_shares: f64,
    pub net_profit_q1: f64,
    pub net_profit_q2: f64,
    pub net_profit_q3: f64,
    pub net_profit_q4: f64,
    pub net_assets_parent: f64,
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
        total_share: row.get(11)?,
        net_profit_ttm: row.get(12)?,
        net_assets: row.get(13)?,
        roe: row.get(14)?,
        pe_ttm: row.get(15)?,
        pb: row.get(16)?,
        total_shares: row.get(17)?,
        net_profit_q1: row.get(18)?,
        net_profit_q2: row.get(19)?,
        net_profit_q3: row.get(20)?,
        net_profit_q4: row.get(21)?,
        net_assets_parent: row.get(22)?,
        note: row.get(23)?,
        created_at: row.get(24)?,
        updated_at: row.get(25)?,
    })
}

const SELECT_FIELDS: &str =
    "id, name, symbol, market, currency, current_price, previous_close,
     shares, cost_price, pe, dividend_per_10_shares,
     total_share, net_profit_ttm, net_assets, roe,
     pe_ttm, pb,
     total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
     net_assets_parent, note, created_at, updated_at";

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
    let total_share = stock["total_share"].as_f64().unwrap_or(0.0);
    let net_profit_ttm = stock["net_profit_ttm"].as_f64().unwrap_or(0.0);
    let net_assets = stock["net_assets"].as_f64().unwrap_or(0.0);
    let roe = stock["roe"].as_f64().unwrap_or(0.0);
    let total_shares = stock["total_shares"].as_f64().unwrap_or(0.0);
    let net_profit_q1 = stock["net_profit_q1"].as_f64().unwrap_or(0.0);
    let net_profit_q2 = stock["net_profit_q2"].as_f64().unwrap_or(0.0);
    let net_profit_q3 = stock["net_profit_q3"].as_f64().unwrap_or(0.0);
    let net_profit_q4 = stock["net_profit_q4"].as_f64().unwrap_or(0.0);
    let net_assets_parent = stock["net_assets_parent"].as_f64().unwrap_or(0.0);
    let note = stock["note"].as_str().unwrap_or("").to_string();

    conn.execute(
        "INSERT INTO stocks (id, name, symbol, market, currency, current_price,
            previous_close, shares, cost_price, pe, dividend_per_10_shares,
            total_share, net_profit_ttm, net_assets, roe,
            total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
            net_assets_parent, note, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)",
        params![
            id, name, symbol, market, currency,
            current_price, previous_close, shares, cost_price, pe,
            dividend_per_10_shares,
            total_share, net_profit_ttm, net_assets, roe,
            total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
            net_assets_parent, note, now, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stock {
        id, name, symbol, market, currency,
        current_price, previous_close, shares, cost_price, pe,
        dividend_per_10_shares,
        total_share, net_profit_ttm, net_assets, roe,
        pe_ttm: 0.0, pb: 0.0,
        total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
        net_assets_parent, note,
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
    let total_share = stock["total_share"].as_f64().unwrap_or(0.0);
    let net_profit_ttm = stock["net_profit_ttm"].as_f64().unwrap_or(0.0);
    let net_assets = stock["net_assets"].as_f64().unwrap_or(0.0);
    let roe = stock["roe"].as_f64().unwrap_or(0.0);
    let total_shares = stock["total_shares"].as_f64().unwrap_or(0.0);
    let net_profit_q1 = stock["net_profit_q1"].as_f64().unwrap_or(0.0);
    let net_profit_q2 = stock["net_profit_q2"].as_f64().unwrap_or(0.0);
    let net_profit_q3 = stock["net_profit_q3"].as_f64().unwrap_or(0.0);
    let net_profit_q4 = stock["net_profit_q4"].as_f64().unwrap_or(0.0);
    let net_assets_parent = stock["net_assets_parent"].as_f64().unwrap_or(0.0);
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
            pe=?10, dividend_per_10_shares=?11,
            total_share=?12, net_profit_ttm=?13, net_assets=?14, roe=?15,
            total_shares=?16, net_profit_q1=?17, net_profit_q2=?18,
            net_profit_q3=?19, net_profit_q4=?20, net_assets_parent=?21,
            note=?22, updated_at=?23
         WHERE id=?1",
        params![
            id, name, symbol, market, currency,
            current_price, previous_close, shares, cost_price, pe,
            dividend_per_10_shares,
            total_share, net_profit_ttm, net_assets, roe,
            total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
            net_assets_parent, note, now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stock {
        id, name, symbol, market, currency,
        current_price, previous_close, shares, cost_price, pe,
        dividend_per_10_shares,
        total_share, net_profit_ttm, net_assets, roe,
        pe_ttm: stock["pe_ttm"].as_f64().unwrap_or(0.0),
        pb: stock["pb"].as_f64().unwrap_or(0.0),
        total_shares, net_profit_q1, net_profit_q2, net_profit_q3, net_profit_q4,
        net_assets_parent, note,
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

#[derive(Debug, Deserialize)]
struct StockMetrics {
    pe_ttm: f64,
    pb: f64,
    roe: f64,
}

#[derive(Debug, Serialize)]
pub struct RefreshFundamentalsResult {
    pub updated: usize,
    pub failed: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct StockPrice {
    close: f64,
    prev_close: f64,
}

#[derive(Debug, Serialize)]
pub struct RefreshPricesResult {
    pub updated: usize,
    pub failed: Vec<String>,
}

fn to_baostock_code(symbol: &str) -> Result<String, String> {
    let s = symbol.trim().to_lowercase();
    if s.starts_with("sh.") || s.starts_with("sz.") {
        return Ok(s);
    }
    if s.len() != 6 || !s.chars().all(|c| c.is_ascii_digit()) {
        return Err(format!("股票代码无效: {}", symbol));
    }
    // 上交所: 6/9 开头的股票，以及 51/52/53/55/56/58 开头的 ETF
    let sh_prefixes = ["6", "9", "51", "52", "53", "55", "56", "58"];
    if sh_prefixes.iter().any(|p| s.starts_with(p)) {
        Ok(format!("sh.{}", s))
    } else {
        Ok(format!("sz.{}", s))
    }
}

fn bundled_script_path(app: &tauri::AppHandle, script: &str) -> PathBuf {
    app.path()
        .resolve(script, BaseDirectory::Resource)
        .ok()
        .filter(|path| path.exists())
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(script)
        })
}

fn run_python_stock_function(
    symbol: &str,
    script_path: &Path,
    module_name: &str,
    function_name: &str,
) -> Result<String, String> {
    let code = to_baostock_code(symbol)?;
    let code_arg = serde_json::to_string(&code).map_err(|e| e.to_string())?;
    let script_arg =
        serde_json::to_string(&script_path.to_string_lossy()).map_err(|e| e.to_string())?;
    let module_arg = serde_json::to_string(module_name).map_err(|e| e.to_string())?;
    let function_arg = serde_json::to_string(function_name).map_err(|e| e.to_string())?;
    let py = format!(
        "import importlib.util, json; spec = importlib.util.spec_from_file_location({module}, {script}); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); print(json.dumps(getattr(m, {function})({code}), ensure_ascii=False))",
        module = module_arg,
        script = script_arg,
        function = function_arg,
        code = code_arg
    );

    let python_candidates = [
        "/opt/homebrew/bin/python3",
        "/opt/homebrew/bin/python",
        "/usr/local/bin/python3",
        "/usr/local/bin/python",
        "python3",
        "python",
        "/usr/bin/python3",
        "/usr/bin/python",
    ];
    let mut output_result = None;
    let mut last_error = String::new();

    for python in python_candidates {
        match Command::new(python).arg("-c").arg(&py).output() {
            Ok(output) => {
                output_result = Some(output);
                break;
            }
            Err(e) => {
                last_error = format!("{}: {}", python, e);
            }
        }
    }

    let output = output_result
        .ok_or_else(|| format!("无法运行 python: {}", last_error))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Python 脚本执行失败: {}", code)
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json_line = stdout
        .lines()
        .rev()
        .map(str::trim)
        .find(|line| line.starts_with('{') && line.ends_with('}'))
        .unwrap_or_else(|| stdout.trim());
    Ok(json_line.to_string())
}

fn fetch_stock_metrics(symbol: &str, script_path: &Path) -> Result<StockMetrics, String> {
    let json_line =
        run_python_stock_function(symbol, script_path, "stock_metrics", "get_stock_metrics")?;
    serde_json::from_str::<StockMetrics>(&json_line)
        .map_err(|e| format!("解析基本面 JSON 失败: {}", e))
}

fn fetch_stock_price(symbol: &str, script_path: &Path) -> Result<StockPrice, String> {
    let json_line =
        run_python_stock_function(symbol, script_path, "stock_price", "get_stock_price")?;
    serde_json::from_str::<StockPrice>(&json_line)
        .map_err(|e| format!("解析股价 JSON 失败: {}", e))
}

#[tauri::command]
pub fn refresh_fundamentals(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<RefreshFundamentalsResult, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, symbol, market FROM stocks ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let stocks = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    let mut updated = 0usize;
    let mut failed = Vec::new();
    let script_path = bundled_script_path(&app, STOCK_METRICS_SCRIPT);

    for (id, name, symbol, market) in stocks {
        if market != "A股" || symbol.trim().is_empty() {
            continue;
        }

        match fetch_stock_metrics(&symbol, &script_path) {
            Ok(metrics) => {
                let now = Utc::now().to_rfc3339();
                conn.execute(
                    "UPDATE stocks
                     SET pe_ttm=?2, pb=?3, roe=?4,
                         updated_at=?5
                     WHERE id=?1",
                    params![
                        id,
                        metrics.pe_ttm,
                        metrics.pb,
                        metrics.roe,
                        now
                    ],
                )
                .map_err(|e| e.to_string())?;
                updated += 1;
            }
            Err(e) => failed.push(format!("{}({}): {}", name, symbol, e)),
        }
    }

    Ok(RefreshFundamentalsResult { updated, failed })
}

#[tauri::command]
pub fn refresh_prices(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
) -> Result<RefreshPricesResult, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, symbol, market FROM stocks ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let stocks = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    let mut updated = 0usize;
    let mut failed = Vec::new();
    let script_path = bundled_script_path(&app, STOCK_PRICE_SCRIPT);

    for (id, name, symbol, market) in stocks {
        if market != "A股" || symbol.trim().is_empty() {
            continue;
        }

        match fetch_stock_price(&symbol, &script_path) {
            Ok(price) => {
                let now = Utc::now().to_rfc3339();
                conn.execute(
                    "UPDATE stocks
                     SET current_price=?2, previous_close=?3, updated_at=?4
                     WHERE id=?1",
                    params![id, price.close, price.prev_close, now],
                )
                .map_err(|e| e.to_string())?;
                updated += 1;
            }
            Err(e) => failed.push(format!("{}({}): {}", name, symbol, e)),
        }
    }

    Ok(RefreshPricesResult { updated, failed })
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

// ----- 操作记录 -----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OperationRecord {
    pub id: String,
    pub stock_id: String,
    pub operation_type: String,
    pub operation_date: String,
    pub shares_delta: f64,
    pub price: f64,
    pub amount: f64,
    pub net_profit_per_share: f64,
    pub dividend_per_10_shares: f64,
    pub cash_amount: f64,
    pub shares_before: f64,
    pub shares_after: f64,
    pub cost_price_before: f64,
    pub cost_price_after: f64,
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
    pub current_price_before: f64,
    pub current_price_after: f64,
    pub previous_close_before: f64,
    pub previous_close_after: f64,
    pub dividend_tax_bucket: String,
}

fn row_to_operation_record(row: &rusqlite::Row) -> rusqlite::Result<OperationRecord> {
    Ok(OperationRecord {
        id: row.get(0)?,
        stock_id: row.get(1)?,
        operation_type: row.get(2)?,
        operation_date: row.get(3)?,
        shares_delta: row.get(4)?,
        price: row.get(5)?,
        amount: row.get(6)?,
        net_profit_per_share: row.get(7)?,
        dividend_per_10_shares: row.get(8)?,
        cash_amount: row.get(9)?,
        shares_before: row.get(10)?,
        shares_after: row.get(11)?,
        cost_price_before: row.get(12)?,
        cost_price_after: row.get(13)?,
        note: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
        current_price_before: row.get(17)?,
        current_price_after: row.get(18)?,
        previous_close_before: row.get(19)?,
        previous_close_after: row.get(20)?,
        dividend_tax_bucket: row.get(21)?,
    })
}

const OP_RECORD_SELECT: &str = "id, stock_id, operation_type, operation_date, shares_delta,
    price, amount, net_profit_per_share, dividend_per_10_shares, cash_amount,
    shares_before, shares_after, cost_price_before, cost_price_after, note, created_at, updated_at,
    current_price_before, current_price_after, previous_close_before, previous_close_after, dividend_tax_bucket";

#[tauri::command]
pub fn list_operation_records(
    state: tauri::State<AppState>,
    stock_id: String,
) -> Result<Vec<OperationRecord>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let q = format!(
        "SELECT {} FROM operation_records WHERE stock_id = ?1 ORDER BY operation_date DESC, updated_at DESC",
        OP_RECORD_SELECT
    );
    let mut stmt = conn.prepare(&q).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![stock_id], row_to_operation_record)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_operation_record(
    state: tauri::State<AppState>,
    record: serde_json::Value,
) -> Result<OperationRecord, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let stock_id = record["stock_id"].as_str().unwrap_or("").to_string();
    let operation_type = record["operation_type"].as_str().unwrap_or("").to_string();
    let operation_date = record["operation_date"].as_str().unwrap_or("").to_string();
    let shares_delta = record["shares_delta"].as_f64().unwrap_or(0.0);
    let price = record["price"].as_f64().unwrap_or(0.0);
    let amount = record["amount"].as_f64().unwrap_or(0.0);
    let net_profit_per_share = record["net_profit_per_share"].as_f64().unwrap_or(0.0);
    let dividend_per_10_shares = record["dividend_per_10_shares"].as_f64().unwrap_or(0.0);
    let cash_amount = record["cash_amount"].as_f64().unwrap_or(0.0);
    let shares_before = record["shares_before"].as_f64().unwrap_or(0.0);
    let shares_after = record["shares_after"].as_f64().unwrap_or(0.0);
    let cost_price_before = record["cost_price_before"].as_f64().unwrap_or(0.0);
    let cost_price_after = record["cost_price_after"].as_f64().unwrap_or(0.0);
    let note = record["note"].as_str().unwrap_or("").to_string();
    let current_price_before = record["current_price_before"].as_f64().unwrap_or(0.0);
    let current_price_after = record["current_price_after"].as_f64().unwrap_or(0.0);
    let previous_close_before = record["previous_close_before"].as_f64().unwrap_or(0.0);
    let previous_close_after = record["previous_close_after"].as_f64().unwrap_or(0.0);
    let dividend_tax_bucket = record["dividend_tax_bucket"]
        .as_str()
        .unwrap_or("")
        .to_string();

    if stock_id.is_empty() || operation_type.is_empty() || operation_date.is_empty() {
        return Err("stock_id, operation_type, operation_date 不能为空".to_string());
    }

    conn.execute(
        "INSERT INTO operation_records (
            id, stock_id, operation_type, operation_date, shares_delta, price, amount,
            net_profit_per_share, dividend_per_10_shares, cash_amount,
            shares_before, shares_after, cost_price_before, cost_price_after,
            note, created_at, updated_at,
            current_price_before, current_price_after, previous_close_before, previous_close_after,
            dividend_tax_bucket
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)",
        params![
            id,
            stock_id,
            operation_type,
            operation_date,
            shares_delta,
            price,
            amount,
            net_profit_per_share,
            dividend_per_10_shares,
            cash_amount,
            shares_before,
            shares_after,
            cost_price_before,
            cost_price_after,
            note,
            now.clone(),
            now.clone(),
            current_price_before,
            current_price_after,
            previous_close_before,
            previous_close_after,
            dividend_tax_bucket
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(OperationRecord {
        id,
        stock_id,
        operation_type,
        operation_date,
        shares_delta,
        price,
        amount,
        net_profit_per_share,
        dividend_per_10_shares,
        cash_amount,
        shares_before,
        shares_after,
        cost_price_before,
        cost_price_after,
        note,
        created_at: now.clone(),
        updated_at: now.clone(),
        current_price_before,
        current_price_after,
        previous_close_before,
        previous_close_after,
        dividend_tax_bucket,
    })
}

fn dividend_income_tax_rate(bucket: &str) -> Result<f64, String> {
    match bucket {
        "within_1m" => Ok(0.2_f64),
        "between_1m_1y" => Ok(0.1_f64),
        "over_1y" => Ok(0.0_f64),
        _ => Err(format!("持股期限档位无效: {}", bucket)),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyDividendExRightsInput {
    pub stock_id: String,
    pub operation_date: String,
    pub dividend_per_10_shares: f64,
    pub registration_shares: f64,
    pub holding_period: String,
    #[serde(default)]
    pub cash_amount: Option<f64>,
    #[serde(default)]
    pub note: Option<String>,
}

#[tauri::command]
pub fn apply_dividend_ex_rights(
    state: tauri::State<AppState>,
    input: ApplyDividendExRightsInput,
) -> Result<Stock, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    if input.stock_id.is_empty() || input.operation_date.is_empty() {
        return Err("stock_id 与 operation_date 不能为空".to_string());
    }

    let rate = dividend_income_tax_rate(input.holding_period.trim())?;
    let per_share_nominal = input.dividend_per_10_shares / 10.0_f64;
    if per_share_nominal <= 0.0 {
        return Err("每十股分红金额必须大于 0".to_string());
    }
    if input.registration_shares <= 0.0 {
        return Err("登记日持仓数量必须大于 0".to_string());
    }

    let gross = per_share_nominal * input.registration_shares;
    let computed_net = gross * (1.0_f64 - rate);
    let net_cash = input
        .cash_amount
        .filter(|v| v.is_finite())
        .unwrap_or(computed_net)
        .max(0.0_f64);

    // 除权按税后到手现金摊到每股 (与账面实际收到的分红一致), 而非税前每股派息
    let per_share_ex = net_cash / input.registration_shares;

    let stock: Stock = conn
        .query_row(
            &format!("SELECT {} FROM stocks WHERE id = ?1", SELECT_FIELDS),
            params![input.stock_id],
            row_to_stock,
        )
        .map_err(|e| format!("股票不存在: {}", e))?;

    let cost_b = stock.cost_price;
    let cost_a = (cost_b - per_share_ex).max(0.0_f64);
    let price_b = stock.current_price;
    let price_a = (price_b - per_share_ex).max(0.0_f64);
    let prev_b = stock.previous_close;
    let prev_a = (prev_b - per_share_ex).max(0.0_f64);
    let shares = stock.shares;

    let now = Utc::now().to_rfc3339();
    let op_id = Uuid::new_v4().to_string();

    let note_text = input.note.clone().unwrap_or_default().trim().to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE stocks SET current_price=?1, previous_close=?2, cost_price=?3, updated_at=?4 WHERE id=?5",
        params![price_a, prev_a, cost_a, now.clone(), input.stock_id],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO operation_records (
            id, stock_id, operation_type, operation_date, shares_delta, price, amount,
            net_profit_per_share, dividend_per_10_shares, cash_amount,
            shares_before, shares_after, cost_price_before, cost_price_after,
            note, created_at, updated_at,
            current_price_before, current_price_after, previous_close_before, previous_close_after,
            dividend_tax_bucket
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)",
        params![
            op_id,
            input.stock_id,
            "dividend_ex_rights",
            input.operation_date,
            0.0_f64,
            per_share_ex,
            gross,
            0.0_f64,
            input.dividend_per_10_shares,
            net_cash,
            shares,
            shares,
            cost_b,
            cost_a,
            note_text,
            now.clone(),
            now.clone(),
            price_b,
            price_a,
            prev_b,
            prev_a,
            input.holding_period.trim().to_string(),
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    conn.query_row(
        &format!("SELECT {} FROM stocks WHERE id = ?1", SELECT_FIELDS),
        params![input.stock_id],
        row_to_stock,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn sum_dividend_cash_received(state: tauri::State<AppState>) -> Result<f64, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let sum: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(cash_amount), 0.0) FROM operation_records
             WHERE operation_type IN ('dividend', 'dividend_ex_rights')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(sum)
}

#[tauri::command]
pub fn delete_operation_record(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let q = format!(
        "SELECT {} FROM operation_records WHERE id = ?1",
        OP_RECORD_SELECT
    );
    let rec = match tx.query_row(&q, params![id], row_to_operation_record) {
        Ok(r) => r,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err("操作记录不存在".to_string());
        }
        Err(e) => return Err(e.to_string()),
    };

    // 分红除权除记录外还下调了成本价/当前价/昨收, 删除时用记录里的 before - after 加回当前股票 (与各字段独立 max 钳制一致)
    if rec.operation_type == "dividend_ex_rights" {
        let stock: Stock = tx
            .query_row(
                &format!("SELECT {} FROM stocks WHERE id = ?1", SELECT_FIELDS),
                params![rec.stock_id],
                row_to_stock,
            )
            .map_err(|e| format!("股票不存在: {}", e))?;

        let dc = rec.cost_price_before - rec.cost_price_after;
        let dp = rec.current_price_before - rec.current_price_after;
        let ds = rec.previous_close_before - rec.previous_close_after;

        let cost_r = (stock.cost_price + dc).max(0.0_f64);
        let price_r = (stock.current_price + dp).max(0.0_f64);
        let prev_r = (stock.previous_close + ds).max(0.0_f64);
        let now = Utc::now().to_rfc3339();

        tx.execute(
            "UPDATE stocks SET current_price=?1, previous_close=?2, cost_price=?3, updated_at=?4 WHERE id=?5",
            params![price_r, prev_r, cost_r, now, rec.stock_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.execute("DELETE FROM operation_records WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// ----- 分析笔记 -----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockNote {
    pub id: String,
    pub stock_id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

fn row_to_stock_note(row: &rusqlite::Row) -> rusqlite::Result<StockNote> {
    Ok(StockNote {
        id: row.get(0)?,
        stock_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn list_stock_notes(
    state: tauri::State<AppState>,
    stock_id: String,
) -> Result<Vec<StockNote>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, stock_id, title, content, created_at, updated_at
             FROM stock_notes WHERE stock_id = ?1 ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![stock_id], row_to_stock_note)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_stock_note(
    state: tauri::State<AppState>,
    note: serde_json::Value,
) -> Result<StockNote, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let stock_id = note["stock_id"].as_str().unwrap_or("").to_string();
    let title = note["title"].as_str().unwrap_or("").to_string();
    let content = note["content"].as_str().unwrap_or("").to_string();

    if stock_id.is_empty() {
        return Err("stock_id 不能为空".to_string());
    }

    conn.execute(
        "INSERT INTO stock_notes (id, stock_id, title, content, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, stock_id, title, content, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(StockNote {
        id,
        stock_id,
        title,
        content,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_stock_note(
    state: tauri::State<AppState>,
    note: serde_json::Value,
) -> Result<StockNote, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let id = note["id"].as_str().unwrap_or("").to_string();
    let title = note["title"].as_str().unwrap_or("").to_string();
    let content = note["content"].as_str().unwrap_or("").to_string();
    let now = Utc::now().to_rfc3339();

    if id.is_empty() {
        return Err("id 不能为空".to_string());
    }

    let stock_id: String = conn
        .query_row(
            "SELECT stock_id FROM stock_notes WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("笔记不存在: {}", e))?;

    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM stock_notes WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE stock_notes SET title = ?2, content = ?3, updated_at = ?4 WHERE id = ?1",
        params![id, title, content, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(StockNote {
        id,
        stock_id,
        title,
        content,
        created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_stock_note(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM stock_notes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ===== Research Reports =====

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResearchReport {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub stock_symbols: String,
    pub tags: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ResearchReportFormData {
    pub title: String,
    pub summary: String,
    pub content: String,
    pub stock_symbols: String,
    pub tags: String,
}

#[tauri::command]
pub fn list_research_reports(state: tauri::State<AppState>) -> Result<Vec<ResearchReport>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, summary, content, stock_symbols, tags, created_at, updated_at
             FROM research_reports ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ResearchReport {
                id: row.get(0)?,
                title: row.get(1)?,
                summary: row.get(2)?,
                content: row.get(3)?,
                stock_symbols: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn create_research_report(
    state: tauri::State<AppState>,
    data: ResearchReportFormData,
) -> Result<ResearchReport, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO research_reports (id, title, summary, content, stock_symbols, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, data.title, data.summary, data.content, data.stock_symbols, data.tags, now, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(ResearchReport {
        id,
        title: data.title,
        summary: data.summary,
        content: data.content,
        stock_symbols: data.stock_symbols,
        tags: data.tags,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_research_report(
    state: tauri::State<AppState>,
    id: String,
    data: ResearchReportFormData,
) -> Result<ResearchReport, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM research_reports WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE research_reports SET title=?2, summary=?3, content=?4, stock_symbols=?5, tags=?6, updated_at=?7 WHERE id=?1",
        params![id, data.title, data.summary, data.content, data.stock_symbols, data.tags, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(ResearchReport {
        id,
        title: data.title,
        summary: data.summary,
        content: data.content,
        stock_symbols: data.stock_symbols,
        tags: data.tags,
        created_at,
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_research_report(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM research_reports WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ----- Agent 对话持久化 -----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[tauri::command]
pub fn list_agent_conversations(state: tauri::State<AppState>) -> Result<Vec<AgentConversation>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, updated_at FROM agent_conversations ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AgentConversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn create_agent_conversation(state: tauri::State<AppState>, title: String) -> Result<AgentConversation, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = if title.is_empty() { "新对话".to_string() } else { title };
    conn.execute(
        "INSERT INTO agent_conversations (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, title, now, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(AgentConversation { id, title, created_at: now.clone(), updated_at: now })
}

#[tauri::command]
pub fn update_agent_conversation_title(
    state: tauri::State<AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE agent_conversations SET title=?2, updated_at=?3 WHERE id=?1",
        params![id, title, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_agent_conversation(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM agent_conversations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_agent_messages(
    state: tauri::State<AppState>,
    conversation_id: String,
) -> Result<Vec<AgentMessage>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, created_at
             FROM agent_messages WHERE conversation_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![conversation_id], |row| {
            Ok(AgentMessage {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn append_agent_message(
    state: tauri::State<AppState>,
    conversation_id: String,
    role: String,
    content: String,
) -> Result<AgentMessage, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO agent_messages (id, conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, conversation_id, role, content, now],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE agent_conversations SET updated_at=?2 WHERE id=?1",
        params![conversation_id, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(AgentMessage { id, conversation_id, role, content, created_at: now })
}

// ----- LLM 代理请求 (绕过 WebView 网络限制) -----

#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    pub endpoint: String,
    pub api_key: String,
    pub model: String,
    pub messages: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn chat_completion(req: ChatCompletionRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(false)
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "model": req.model,
        "messages": req.messages,
        "stream": false,
    });

    let resp = client
        .post(&req.endpoint)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let preview = if text.is_empty() { "(空响应)".to_string() } else { text[..text.len().min(400)].to_string() };
        return Err(format!("HTTP {} — URL: {} — 响应: {}", status.as_u16(), req.endpoint, preview));
    }

    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("(无内容)")
        .to_string();
    Ok(content)
}

// ----- K 线数据 -----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KlineBar {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

fn run_python_simple(script_path: &Path, args: &[&str]) -> Result<String, String> {
    let python_candidates = [
        "/opt/homebrew/bin/python3",
        "/opt/homebrew/bin/python",
        "/usr/local/bin/python3",
        "/usr/local/bin/python",
        "python3",
        "python",
        "/usr/bin/python3",
        "/usr/bin/python",
    ];
    let mut last_error = String::new();
    for python in python_candidates {
        match Command::new(python).arg(script_path).args(args).output() {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    return Err(if stderr.is_empty() {
                        "Python 脚本执行失败".to_string()
                    } else {
                        stderr
                    });
                }
                return Ok(String::from_utf8_lossy(&output.stdout).to_string());
            }
            Err(e) => {
                last_error = format!("{}: {}", python, e);
            }
        }
    }
    Err(format!("无法运行 python: {}", last_error))
}

#[tauri::command]
pub fn refresh_kline(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    stock_id: String,
    period: Option<String>,
    days: Option<u32>,
) -> Result<usize, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let (symbol, market): (String, String) = conn
        .query_row(
            "SELECT symbol, market FROM stocks WHERE id=?1",
            params![stock_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    if market != "A股" {
        return Err(format!("K 线暂只支持 A 股，当前市场: {}", market));
    }

    let period_str = period.as_deref().unwrap_or("d");
    // map frontend period codes to baostock frequency codes
    let freq = match period_str {
        "w" => "w",
        "y" => "m", // 年线用月线
        _ => "d",
    };
    let default_days: u32 = match period_str {
        "w" => 520,
        "y" => 120, // 10 years of monthly bars
        _ => 2500,
    };
    let days_val = days.unwrap_or(default_days);
    let days_str = days_val.to_string();

    let bs_code = to_baostock_code(&symbol)?;
    let script_path = bundled_script_path(&app, KLINE_SCRIPT);
    let stdout = run_python_simple(&script_path, &[&bs_code, &days_str, freq])?;

    let json_line = stdout
        .lines()
        .map(str::trim)
        .find(|l| l.starts_with('['))
        .unwrap_or(stdout.trim());

    let bars: Vec<KlineBar> = serde_json::from_str(json_line)
        .map_err(|e| format!("解析 K 线 JSON 失败: {}", e))?;

    let mut count = 0usize;
    for bar in &bars {
        if bar.date.is_empty() { continue; }
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO kline_data (id, stock_id, date, period, open, high, low, close, volume)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(stock_id, period, date) DO UPDATE SET
               open=excluded.open, high=excluded.high, low=excluded.low,
               close=excluded.close, volume=excluded.volume",
            params![id, stock_id, bar.date, period_str, bar.open, bar.high, bar.low, bar.close, bar.volume],
        ).map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

#[tauri::command]
pub fn get_kline_data(
    state: tauri::State<AppState>,
    stock_id: String,
    period: Option<String>,
) -> Result<Vec<KlineBar>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let period_str = period.as_deref().unwrap_or("d");
    let mut stmt = conn
        .prepare(
            "SELECT date, open, high, low, close, volume
             FROM kline_data WHERE stock_id=?1 AND period=?2 ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![stock_id, period_str], |row| {
            Ok(KlineBar {
                date: row.get(0)?,
                open: row.get(1)?,
                high: row.get(2)?,
                low: row.get(3)?,
                close: row.get(4)?,
                volume: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
