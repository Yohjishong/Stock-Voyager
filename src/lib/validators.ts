import { StockFormData } from "../types/stock";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStockForm(data: StockFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name.trim()) {
    errors.push({ field: "name", message: "股票名称不能为空" });
  }

  const numFields: Array<{ key: keyof StockFormData; label: string; min?: number }> = [
    { key: "current_price", label: "当前股价", min: 0 },
    { key: "previous_close", label: "昨日收盘价", min: 0 },
    { key: "shares", label: "持仓数量", min: 0 },
    { key: "cost_price", label: "成本价", min: 0 },
    { key: "dividend_per_10_shares", label: "每十股分红", min: 0 },
    { key: "total_shares", label: "公司总股本", min: 0 },
    { key: "net_profit_q1", label: "最近一季归母净利润" },
    { key: "net_profit_q2", label: "前二季归母净利润" },
    { key: "net_profit_q3", label: "前三季归母净利润" },
    { key: "net_profit_q4", label: "前四季归母净利润" },
    { key: "net_assets_parent", label: "最新归母净资产", min: 0 },
  ];

  for (const f of numFields) {
    const val = data[f.key] as string;
    if (val === "" || val === undefined) continue;
    const n = Number(val);
    if (isNaN(n)) {
      errors.push({ field: f.key, message: `${f.label}必须是有效数字` });
    } else if (f.min !== undefined && n < f.min) {
      errors.push({ field: f.key, message: `${f.label}不能小于 ${f.min}` });
    }
  }

  return errors;
}
