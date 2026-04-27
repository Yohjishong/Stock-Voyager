import { invoke } from "@tauri-apps/api/core";
import { StockNote } from "../types/stock";

export type CreateStockNoteInput = Pick<StockNote, "stock_id" | "title" | "content">;

export type UpdateStockNoteInput = Pick<StockNote, "id" | "title" | "content">;

export async function listStockNotes(stockId: string): Promise<StockNote[]> {
  return await invoke<StockNote[]>("list_stock_notes", { stockId });
}

export async function createStockNote(
  input: CreateStockNoteInput
): Promise<StockNote> {
  return await invoke<StockNote>("create_stock_note", { note: input });
}

export async function updateStockNote(
  input: UpdateStockNoteInput
): Promise<StockNote> {
  return await invoke<StockNote>("update_stock_note", { note: input });
}

export async function deleteStockNote(id: string): Promise<void> {
  return await invoke<void>("delete_stock_note", { id });
}
