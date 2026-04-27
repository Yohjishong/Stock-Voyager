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

// 格式化亿元单位的金额 (总市值等), 保留 2 位小数
export function formatYi(value: number, currency: CurrencyType = "CNY"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "¥";
  return `${symbol}${value.toFixed(2)}亿`;
}

// 格式化 PE / PB 等估值倍数, null/undefined/NaN/Infinity 时显示 N/A
export function formatValuation(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "N/A";
  if (!isFinite(value) || isNaN(value)) return "N/A";
  return value.toFixed(decimals);
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

/** 将 ISO 8601 字符串格式化为日期 (YYYY-MM-DD) */
export function formatDate(iso: string): string {
  if (!iso) return "-";
  const t = iso.trim();
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}
