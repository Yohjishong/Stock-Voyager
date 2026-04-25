import type { MarketType } from "../types/stock";
import { STOCK_DICT_ENTRIES } from "./stockDictEntries";

export interface StockEntry {
  symbol: string;
  name: string;
  market: MarketType;
}

/** 代码 <-> 名称 全表 (数据在 stockDictEntries.ts) */
export const STOCK_DICT: StockEntry[] = STOCK_DICT_ENTRIES;

/** 按代码精确查找 */
export function lookupBySymbol(symbol: string): StockEntry | undefined {
  const s = symbol.trim();
  return STOCK_DICT.find((e) => e.symbol === s);
}

/** 按名称精确查找 */
export function lookupByName(name: string): StockEntry | undefined {
  const n = name.trim();
  return STOCK_DICT.find((e) => e.name === n);
}

/** 按代码前缀模糊匹配 (用于 datalist 候选项) */
export function searchBySymbol(query: string): StockEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return STOCK_DICT.filter((e) => e.symbol.toLowerCase().startsWith(q));
}

/** 按名称模糊匹配 (用于 datalist 候选项) */
export function searchByName(query: string): StockEntry[] {
  const q = query.trim();
  if (!q) return [];
  return STOCK_DICT.filter((e) => e.name.includes(q));
}
