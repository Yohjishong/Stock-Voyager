export type MarketType = "A股" | "港股" | "美股" | "其他";
export type CurrencyType = "CNY" | "HKD" | "USD";

export interface Stock {
  id: string; // 唯一标识
  name: string; //股票名称
  symbol: string; //股票代码
  market: MarketType; //所属市场
  currency: CurrencyType; //交易货币
  current_price: number; //当前价格
  previous_close: number; //昨日收盘价
  shares: number; //持仓股数
  cost_price: number; //成本价
  pe: number; //市盈率
  dividend_per_10_shares: number; //每 10 股分红
  note: string; //备注
  created_at: string; //创建时间
  updated_at: string; //更新时间
}

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
  dividend_per_10_shares: string;
  note: string;
}

export interface SummaryStats {
  total_market_value: number;
  total_day_change: number;
  total_profit_loss: number;
  total_dividend: number;
  cash: number;
  invested_capital: number;
  total_assets: number;
  total_return: number;
  total_return_pct: number;
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
