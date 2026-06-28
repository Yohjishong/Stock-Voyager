import { invoke } from "@tauri-apps/api/core";

export interface KlineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type KlinePeriod = "d" | "w" | "y";

const DEFAULT_DAYS: Record<KlinePeriod, number> = {
  d: 2500,
  w: 520,
  y: 120,
};

export function refreshKline(stockId: string, period: KlinePeriod = "d", days?: number): Promise<number> {
  return invoke<number>("refresh_kline", {
    stockId,
    period,
    days: days ?? DEFAULT_DAYS[period],
  });
}

export function getKlineData(stockId: string, period: KlinePeriod = "d"): Promise<KlineBar[]> {
  return invoke<KlineBar[]>("get_kline_data", { stockId, period });
}
