import { invoke } from "@tauri-apps/api/core";

export async function getSetting(key: string): Promise<string | null> {
  return await invoke<string | null>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return await invoke<void>("set_setting", { key, value });
}

export async function getNetCash(): Promise<number> {
  const val = await getSetting("net_cash_cny");
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export async function setNetCash(amount: number): Promise<void> {
  await setSetting("net_cash_cny", String(amount));
}
