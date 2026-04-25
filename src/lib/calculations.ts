import { Stock, StockWithCalc, SummaryStats } from "../types/stock";

export function calcStock(stock: Stock): StockWithCalc {
  const market_value = stock.current_price * stock.shares;

  const day_change_value =
    (stock.current_price - stock.previous_close) * stock.shares;

  const day_change_pct =
    stock.previous_close > 0
      ? (stock.current_price - stock.previous_close) / stock.previous_close
      : 0;

  const profit_loss = (stock.current_price - stock.cost_price) * stock.shares;

  const profit_loss_pct =
    stock.cost_price > 0
      ? (stock.current_price - stock.cost_price) / stock.cost_price
      : 0;

  // 去年分红总额 = 每十股分红 / 10 × 持仓数量
  const dividend_total =
    (stock.dividend_per_10_shares / 10) * stock.shares;

  // 静态股息率 = 去年分红总额 / 持仓市值
  const dividend_yield_pct =
    market_value > 0 ? dividend_total / market_value : 0;

  return {
    ...stock,
    market_value,
    day_change_value,
    day_change_pct,
    profit_loss,
    profit_loss_pct,
    dividend_total,
    dividend_yield_pct,
  };
}

export function calcSummary(
  stocks: StockWithCalc[],
  cash: number,
  invested_capital: number
): SummaryStats {
  const total_market_value = stocks.reduce((s, x) => s + x.market_value, 0);
  const total_day_change = stocks.reduce((s, x) => s + x.day_change_value, 0);
  const total_profit_loss = stocks.reduce((s, x) => s + x.profit_loss, 0);
  const total_dividend = stocks.reduce((s, x) => s + x.dividend_total, 0);

  const total_assets = total_market_value + cash;
  const total_return = total_assets - invested_capital;
  const total_return_pct =
    invested_capital > 0 ? total_return / invested_capital : 0;

  return {
    total_market_value,
    total_day_change,
    total_profit_loss,
    total_dividend,
    cash,
    invested_capital,
    total_assets,
    total_return,
    total_return_pct,
  };
}
