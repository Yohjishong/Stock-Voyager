mod commands;
mod db;
mod import_export;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db_path: Mutex<PathBuf>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("无法获取 app data 目录");

            std::fs::create_dir_all(&app_data_dir)
                .expect("无法创建 app data 目录");

            let db_path = app_data_dir.join("stocks.db");

            db::init_db(&db_path).expect("数据库初始化失败");

            app.manage(AppState {
                db_path: Mutex::new(db_path),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_stocks,
            commands::create_stock,
            commands::update_stock,
            commands::delete_stock,
            commands::refresh_fundamentals,
            commands::refresh_prices,
            commands::list_operation_records,
            commands::create_operation_record,
            commands::delete_operation_record,
            commands::apply_dividend_ex_rights,
            commands::sum_dividend_cash_received,
            commands::list_stock_notes,
            commands::create_stock_note,
            commands::update_stock_note,
            commands::delete_stock_note,
            commands::get_setting,
            commands::set_setting,
            import_export::export_stocks_csv,
            import_export::export_stocks_json,
            import_export::backup_database,
            import_export::import_stocks_json,
            import_export::import_stocks_csv,
            import_export::restore_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
