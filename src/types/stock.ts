export type MarketType = "A股" | "港股" | "美股" | "其他";
export type CurrencyType = "CNY" | "HKD" | "USD";

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  market: MarketType;
  currency: CurrencyType;
  current_price: number;
  previous_close: number;
  shares: number;
  cost_price: number;
  pe: number;
  // 每十股分红金额 (去年), 例如每10股派息 3.5 元 -> 填 3.5
  dividend_per_10_shares: number;
  note: string;
  created_at: string;
  updated_at: string;
}

// 前端计算后的扩展字段 (不入库)
export interface StockWithCalc extends Stock {
  market_value: number;        // 持仓市值 = 股价 × 持仓数量
  day_change_value: number;    // 当日涨跌市值
  day_change_pct: number;      // 当日涨跌幅
  profit_loss: number;         // 浮动盈亏
  profit_loss_pct: number;     // 浮动盈亏率
  dividend_total: number;      // 去年分红总额 = 每十股分红 / 10 × 持仓数量
  dividend_yield_pct: number;  // 静态股息率 = 去年分红总额 / 持仓市值
}

export interface StockFormData {
  name: string;
  symbol: string;
  market: MarketType;
  currency: CurrencyType;
  current_price: string;
  previous_close: string;
  shares: string;
  cost_price: string;
  pe: string;
  // 用户输入每十股分红金额
  dividend_per_10_shares: string;
  note: string;
}

export interface SummaryStats {
  total_market_value: number;
  total_day_change: number;
  total_profit_loss: number;
  net_assets: number;
  net_cash: number;
  total_dividend: number;  // 所有股票去年分红总额之和
}

export interface Settings {
  net_cash_cny: number;
}

export type SortField =
  | "name"
  | "market"
  | "market_value"
  | "day_change_value"
  | "day_change_pct"
  | "profit_loss"
  | "dividend_yield_pct"
  | "dividend_total"
  | "updated_at";

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}
