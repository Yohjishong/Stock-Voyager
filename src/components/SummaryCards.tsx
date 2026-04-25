import { SummaryStats } from "../types/stock";
import { formatNumber, formatPercent, changeColor } from "../lib/format";

interface CardProps {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
}

function Card({ label, value, valueColor, subValue }: CardProps) {
  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div
        className="summary-card-value"
        style={{ color: valueColor || "var(--color-text)" }}
      >
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

interface Props {
  stats: SummaryStats;
  totalCount: number;
}

export default function SummaryCards({ stats, totalCount }: Props) {
  const {
    total_market_value,
    total_day_change,
    total_profit_loss,
    net_assets,
    net_cash,
    total_dividend,
  } = stats;

  const dayChangePct =
    total_market_value - total_day_change > 0
      ? total_day_change / (total_market_value - total_day_change)
      : 0;

  const profitLossPct =
    total_market_value - total_profit_loss > 0
      ? total_profit_loss / (total_market_value - total_profit_loss)
      : 0;

  // 整体静态股息率 = 去年分红总额 / 持仓市值
  const overallDividendYield =
    total_market_value > 0 ? total_dividend / total_market_value : 0;

  return (
    <div className="summary-cards">
      <Card
        label="持仓市值"
        value={`¥${formatNumber(total_market_value)}`}
        subValue={`${totalCount} 只股票`}
      />
      <Card
        label="当日涨跌"
        value={`${total_day_change >= 0 ? "+" : ""}¥${formatNumber(total_day_change)}`}
        valueColor={changeColor(total_day_change)}
        subValue={formatPercent(dayChangePct)}
      />
      <Card
        label="净利润"
        value={`${total_profit_loss >= 0 ? "+" : ""}¥${formatNumber(total_profit_loss)}`}
        valueColor={changeColor(total_profit_loss)}
        subValue={formatPercent(profitLossPct)}
      />
      <Card
        label="净资产"
        value={`¥${formatNumber(net_assets)}`}
      />
      <Card
        label="净现金"
        value={`¥${formatNumber(net_cash)}`}
      />
      <Card
        label="静态股息"
        value={`¥${formatNumber(total_dividend)}`}
        subValue={`股息率 ${formatPercent(overallDividendYield)}`}
      />
    </div>
  );
}
