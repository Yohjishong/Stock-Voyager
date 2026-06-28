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
  pe: number;                      // 旧字段, 保留兼容旧数据库, 不在页面展示
  dividend_per_10_shares: number;
  total_share: number;             // 公司总股本 (股)
  net_profit_ttm: number;          // TTM 归母净利润 (元)
  net_assets: number;              // 归母净资产 (元)
  roe: number;                     // ROE, 小数
  pe_ttm: number;                  // PE_TTM (baostock 直接获取, 0 表示未刷新)
  pb: number;                      // PB (baostock 直接获取, 0 表示未刷新)
  total_shares: number;            // 旧字段, 保留兼容旧数据库/导入文件
  net_profit_q1: number;           // 最近第 1 个季度归母净利润 (单季度)
  net_profit_q2: number;           // 最近第 2 个季度归母净利润 (单季度)
  net_profit_q3: number;           // 最近第 3 个季度归母净利润 (单季度)
  net_profit_q4: number;           // 最近第 4 个季度归母净利润 (单季度)
  net_assets_parent: number;       // 最新归属于母公司股东权益 (归母净资产)
  note: string;
  created_at: string;
  updated_at: string;
}

export interface StockWithCalc extends Omit<Stock, "pe_ttm" | "pb"> {
  market_value: number;                        // 持仓市值 = 股价 × 持仓数量
  day_change_value: number;                    // 当日涨跌市值
  day_change_pct: number;                      // 当日涨跌幅
  profit_loss: number;                         // 浮动盈亏
  profit_loss_pct: number;                     // 浮动盈亏率
  dividend_total: number;                      // 去年分红总额
  dividend_yield_pct: number;                  // 静态股息率
  company_market_cap: number;                  // 公司总市值 = 股价 × 总股本 (元)
  pe_ttm: number | null;                       // PE_TTM = 总市值 / TTM 净利润
  pb: number | null;                           // PB = 总市值 / 归母净资产
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
  dividend_per_10_shares: string;
  note: string;
}

export interface SummaryStats {
  total_market_value: number;
  total_day_change: number;
  total_profit_loss: number;
  total_dividend: number;
  /** 操作记录中分红/分红除权税后 cash_amount 累计 (多币种直接相加, 与总市值口径一致) */
  total_dividend_received: number;
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
  | "company_market_cap"
  | "pe_ttm"
  | "pb"
  | "roe"
  | "updated_at";

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export type OperationType =
  | "add"
  | "reduce"
  | "t_trade"
  | "dividend"
  | "ex_rights"
  | "dividend_ex_rights"
  | "manual";

export interface OperationRecord {
  id: string;
  stock_id: string;
  operation_type: OperationType;
  operation_date: string;
  shares_delta: number;
  price: number;
  amount: number;
  net_profit_per_share: number;
  dividend_per_10_shares: number;
  cash_amount: number;
  shares_before: number;
  shares_after: number;
  cost_price_before: number;
  cost_price_after: number;
  note: string;
  created_at: string;
  updated_at: string;
  current_price_before: number;
  current_price_after: number;
  previous_close_before: number;
  previous_close_after: number;
  dividend_tax_bucket: string;
}

export interface StockNote {
  id: string;
  stock_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
