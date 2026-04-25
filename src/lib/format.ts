import { CurrencyType } from "../types/stock";

const CURRENCY_SYMBOL: Record<CurrencyType, string> = {
  CNY: "¥",
  HKD: "HK$",
  USD: "$",
};

export function formatCurrency(
  value: number,
  currency: CurrencyType = "CNY"
): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "¥";
  return `${symbol}${formatNumber(value)}`;
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_0000) {
    return `${sign}${(abs / 1_0000).toFixed(2)}万`;
  }
  return `${sign}${abs.toFixed(2)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPrice(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}

// 涨跌颜色: 正数红, 负数绿, 0 普通
export function changeColor(value: number): string {
  if (value > 0) return "var(--color-up)";
  if (value < 0) return "var(--color-down)";
  return "var(--color-neutral)";
}

// 格式化日期时间
export function formatDateTime(iso: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}
