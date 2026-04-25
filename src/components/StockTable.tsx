import { useState, useMemo } from "react";
import { Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  StockWithCalc,
  MarketType,
  SortField,
  SortState,
} from "../types/stock";
import {
  formatCurrency,
  formatPercent,
  formatPrice,
  formatDateTime,
  changeColor,
} from "../lib/format";

const MARKETS: Array<MarketType | "全部"> = ["全部", "A股", "港股", "美股", "其他"];

interface Props {
  stocks: StockWithCalc[];
  onEdit: (stock: StockWithCalc) => void;
  onDelete: (stock: StockWithCalc) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field)
    return <ChevronsUpDown size={12} className="sort-indicator" />;
  return sort.direction === "asc" ? (
    <ChevronUp size={12} className="sort-indicator active" />
  ) : (
    <ChevronDown size={12} className="sort-indicator active" />
  );
}

export default function StockTable({ stocks, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<MarketType | "全部">("全部");
  const [sort, setSort] = useState<SortState>({
    field: "updated_at",
    direction: "desc",
  });

  function toggleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "desc" }
    );
  }

  const filtered = useMemo(() => {
    let list = stocks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q)
      );
    }
    if (marketFilter !== "全部") {
      list = list.filter((s) => s.market === marketFilter);
    }
    list = [...list].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sort.field) {
        case "name": av = a.name; bv = b.name; break;
        case "market": av = a.market; bv = b.market; break;
        case "market_value": av = a.market_value; bv = b.market_value; break;
        case "day_change_value": av = a.day_change_value; bv = b.day_change_value; break;
        case "day_change_pct": av = a.day_change_pct; bv = b.day_change_pct; break;
        case "profit_loss": av = a.profit_loss; bv = b.profit_loss; break;
        case "dividend_yield_pct": av = a.dividend_yield_pct; bv = b.dividend_yield_pct; break;
        case "dividend_total": av = a.dividend_total; bv = b.dividend_total; break;
        case "updated_at": av = a.updated_at; bv = b.updated_at; break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sort.direction === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      return sort.direction === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [stocks, search, marketFilter, sort]);

  function Th({
    label,
    field,
    className,
  }: {
    label: string;
    field?: SortField;
    className?: string;
  }) {
    if (!field)
      return <th className={className}>{label}</th>;
    return (
      <th
        className={`sortable ${className ?? ""}`}
        onClick={() => toggleSort(field)}
      >
        {label}
        <SortIcon field={field} sort={sort} />
      </th>
    );
  }

  return (
    <div className="table-panel">
      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder="搜索股票名称 / 代码..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value as MarketType | "全部")}
        >
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {m === "全部" ? "全部市场" : m}
            </option>
          ))}
        </select>
        <span style={{ marginLeft: "auto", color: "var(--color-text-muted)", fontSize: 12 }}>
          共 {filtered.length} 条
        </span>
      </div>

      <div className="table-wrapper">
        <table className="stock-table">
          <thead>
            <tr>
              <Th label="股票名称" field="name" />
              <Th label="市场" field="market" />
              <th>代码</th>
              <th>货币</th>
              <th className="text-right">当前股价</th>
              <th className="text-right">昨日收盘</th>
              <th className="text-right">持仓数量</th>
              <th className="text-right">成本价</th>
              <Th label="持仓市值" field="market_value" className="text-right" />
              <Th label="当日涨跌" field="day_change_value" className="text-right" />
              <Th label="涨跌幅" field="day_change_pct" className="text-right" />
              <Th label="浮动盈亏" field="profit_loss" className="text-right" />
              <th className="text-right">盈亏率</th>
              <th className="text-right">PE</th>
              <th className="text-right">每十股分红</th>
              <Th label="分红总额" field="dividend_total" className="text-right" />
              <Th label="静态股息率" field="dividend_yield_pct" className="text-right" />
              <th>备注</th>
              <th>更新时间</th>
              <th className="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={20}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">
                      {stocks.length === 0
                        ? "暂无股票, 点击右上角「新增股票」添加"
                        : "没有找到匹配的股票"}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <StockRow
                  key={s.id}
                  stock={s}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockRow({
  stock: s,
  onEdit,
  onDelete,
}: {
  stock: StockWithCalc;
  onEdit: (s: StockWithCalc) => void;
  onDelete: (s: StockWithCalc) => void;
}) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{s.name}</td>
      <td>
        <span className={`market-badge ${s.market}`}>{s.market}</span>
      </td>
      <td style={{ color: "var(--color-text-muted)" }}>{s.symbol || "-"}</td>
      <td>{s.currency}</td>
      <td className="text-right">{formatPrice(s.current_price)}</td>
      <td className="text-right">{formatPrice(s.previous_close)}</td>
      <td className="text-right">{s.shares.toLocaleString()}</td>
      <td className="text-right">{formatPrice(s.cost_price)}</td>
      <td className="text-right">
        {formatCurrency(s.market_value, s.currency)}
      </td>
      <td className="text-right" style={{ color: changeColor(s.day_change_value) }}>
        {s.day_change_value >= 0 ? "+" : ""}
        {formatCurrency(s.day_change_value, s.currency)}
      </td>
      <td className="text-right" style={{ color: changeColor(s.day_change_pct) }}>
        {s.day_change_pct >= 0 ? "+" : ""}
        {formatPercent(s.day_change_pct)}
      </td>
      <td className="text-right" style={{ color: changeColor(s.profit_loss) }}>
        {s.profit_loss >= 0 ? "+" : ""}
        {formatCurrency(s.profit_loss, s.currency)}
      </td>
      <td className="text-right" style={{ color: changeColor(s.profit_loss_pct) }}>
        {s.profit_loss_pct >= 0 ? "+" : ""}
        {formatPercent(s.profit_loss_pct)}
      </td>
      <td className="text-right">{s.pe > 0 ? s.pe.toFixed(1) : "-"}</td>
      <td className="text-right">
        {s.dividend_per_10_shares > 0
          ? formatCurrency(s.dividend_per_10_shares, s.currency)
          : "-"}
      </td>
      <td className="text-right">
        {s.dividend_total > 0
          ? formatCurrency(s.dividend_total, s.currency)
          : "-"}
      </td>
      <td className="text-right">
        {s.dividend_yield_pct > 0
          ? formatPercent(s.dividend_yield_pct)
          : "-"}
      </td>
      <td
        style={{
          maxWidth: 100,
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "var(--color-text-muted)",
        }}
        title={s.note}
      >
        {s.note || "-"}
      </td>
      <td style={{ color: "var(--color-text-muted)" }}>
        {formatDateTime(s.updated_at)}
      </td>
      <td className="text-center">
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <button
            className="btn-icon edit"
            title="编辑"
            onClick={() => onEdit(s)}
          >
            <Edit2 size={14} />
          </button>
          <button
            className="btn-icon delete"
            title="删除"
            onClick={() => onDelete(s)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
