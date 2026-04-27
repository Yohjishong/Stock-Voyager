import type { ReactNode } from "react";
import { SummaryStats } from "../types/stock";
import { formatNumber, formatPercent, changeColor } from "../lib/format";

interface CardProps {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: ReactNode;
  /** 可点击 (例如总资产调现金) */
  onClick?: () => void;
}

function Card({ label, value, valueColor, subValue, onClick }: CardProps) {
  const inner = (
    <>
      <div className="summary-card-label">{label}</div>
      <div
        className="summary-card-value"
        style={{ color: valueColor || "var(--color-text)" }}
      >
        {value}
      </div>
      {subValue != null ? (
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
          {subValue}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="summary-card summary-card--clickable"
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }

  return <div className="summary-card">{inner}</div>;
}

interface Props {
  stats: SummaryStats;
  totalCount: number;
  onTotalAssetsClick: () => void;
}

export default function SummaryCards({
  stats,
  totalCount,
  onTotalAssetsClick,
}: Props) {
  const {
    total_market_value,
    total_day_change,
    total_profit_loss,
    total_assets,
    total_return,
    total_return_pct,
    invested_capital,
    cash,
    total_dividend,
    total_dividend_received,
  } = stats;

  const dayChangePct =
    total_market_value - total_day_change > 0
      ? total_day_change / (total_market_value - total_day_change)
      : 0;

  const profitLossPct =
    total_market_value - total_profit_loss > 0
      ? total_profit_loss / (total_market_value - total_profit_loss)
      : 0;

  const overallDividendYield =
    total_market_value > 0 ? total_dividend / total_market_value : 0;

  const returnSub =
    invested_capital > 0
      ? `相对投入资金 ${formatPercent(total_return_pct)}`
      : "请先设置右上角投入资金";

  return (
    <div className="summary-cards">
      <Card
        label="总资产"
        value={`¥${formatNumber(total_assets)}`}
        subValue={`${totalCount} 只股票 · 现金 ¥${formatNumber(cash)} · 点击调整现金`}
        onClick={onTotalAssetsClick}
      />
      <Card
        label="总收益"
        value={`${total_return >= 0 ? "+" : ""}¥${formatNumber(total_return)}`}
        valueColor={changeColor(total_return)}
        subValue={returnSub}
      />
      <Card
        label="持仓市值"
        value={`¥${formatNumber(total_market_value)}`}
      />
      <Card
        label="当日涨跌"
        value={`${total_day_change >= 0 ? "+" : ""}¥${formatNumber(total_day_change)}`}
        valueColor={changeColor(total_day_change)}
        subValue={formatPercent(dayChangePct)}
      />
      <Card
        label="持仓收益"
        value={`${total_profit_loss >= 0 ? "+" : ""}¥${formatNumber(total_profit_loss)}`}
        valueColor={changeColor(total_profit_loss)}
        subValue={formatPercent(profitLossPct)}
      />
      <Card
        label="静态股息"
        value={`¥${formatNumber(total_dividend)}`}
        subValue={
          <>
            <div
              style={{
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: 4,
              }}
            >
              分红总收入 (税后到账累计) ¥{formatNumber(total_dividend_received)}
            </div>
            <div>去年名目股息对应整体 股息率 {formatPercent(overallDividendYield)}</div>
          </>
        }
      />
    </div>
  );
}
