import { invoke } from "@tauri-apps/api/core";
import { Stock } from "../types/stock";

export async function listStocks(): Promise<Stock[]> {
  return await invoke<Stock[]>("list_stocks");
}

export async function createStock(
  stock: Omit<Stock, "id" | "created_at" | "updated_at">
): Promise<Stock> {
  return await invoke<Stock>("create_stock", { stock });
}

export async function updateStock(stock: Stock): Promise<Stock> {
  return await invoke<Stock>("update_stock", { stock });
}

export async function deleteStock(id: string): Promise<void> {
  return await invoke<void>("delete_stock", { id });
}
