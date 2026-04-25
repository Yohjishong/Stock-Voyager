import { invoke } from "@tauri-apps/api/core";

const KEY_CASH = "net_cash_cny";
const KEY_INVESTED = "invested_capital_cny";

export async function getSetting(key: string): Promise<string | null> {
  return await invoke<string | null>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return await invoke<void>("set_setting", { key, value });
}

function parseAmount(val: string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

/** 账户现金 (人民币), 与持仓市值相加得到总资产 */
export async function getCashCny(): Promise<number> {
  return parseAmount(await getSetting(KEY_CASH));
}

export async function setCashCny(amount: number): Promise<void> {
  await setSetting(KEY_CASH, String(amount));
}

/** 累计投入本金 (人民币), 用于总收益 = 总资产 - 投入资金 */
export async function getInvestedCapitalCny(): Promise<number> {
  return parseAmount(await getSetting(KEY_INVESTED));
}

export async function setInvestedCapitalCny(amount: number): Promise<void> {
  await setSetting(KEY_INVESTED, String(amount));
}
