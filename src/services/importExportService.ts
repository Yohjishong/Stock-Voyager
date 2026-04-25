import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";

export async function exportStocksCsv(): Promise<void> {
  const path = await save({
    filters: [{ name: "CSV", extensions: ["csv"] }],
    defaultPath: "stocks_export.csv",
  });
  if (!path) return;
  await invoke("export_stocks_csv", { path });
}

export async function exportStocksJson(): Promise<void> {
  const path = await save({
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: "stocks_export.json",
  });
  if (!path) return;
  await invoke("export_stocks_json", { path });
}

export async function backupDatabase(): Promise<void> {
  const path = await save({
    filters: [{ name: "SQLite Database", extensions: ["db"] }],
    defaultPath: "stocks_backup.db",
  });
  if (!path) return;
  await invoke("backup_database", { path });
}

export async function importStocksJson(): Promise<number> {
  const selected = await open({
    filters: [{ name: "JSON", extensions: ["json"] }],
    multiple: false,
  });
  if (!selected) return 0;
  const path = Array.isArray(selected) ? selected[0] : selected;
  return await invoke<number>("import_stocks_json", { path });
}

export async function importStocksCsv(): Promise<number> {
  const selected = await open({
    filters: [{ name: "CSV", extensions: ["csv"] }],
    multiple: false,
  });
  if (!selected) return 0;
  const path = Array.isArray(selected) ? selected[0] : selected;
  return await invoke<number>("import_stocks_csv", { path });
}

export async function restoreDatabase(): Promise<void> {
  const selected = await open({
    filters: [{ name: "SQLite Database", extensions: ["db"] }],
    multiple: false,
  });
  if (!selected) return;
  const path = Array.isArray(selected) ? selected[0] : selected;
  await invoke("restore_database", { path });
}
