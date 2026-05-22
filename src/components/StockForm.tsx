import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Stock, StockFormData, MarketType, CurrencyType } from "../types/stock";
import { validateStockForm, ValidationError } from "../lib/validators";
import {
  lookupBySymbol,
  lookupByName,
  STOCK_DICT,
} from "../lib/stockDict";

const MARKET_OPTIONS: MarketType[] = ["A股", "港股", "美股", "其他"];
const CURRENCY_OPTIONS: CurrencyType[] = ["CNY", "HKD", "USD"];

const DEFAULT_FORM: StockFormData = {
  name: "",
  symbol: "",
  market: "A股",
  currency: "CNY",
  current_price: "",
  previous_close: "",
  shares: "",
  cost_price: "",
  dividend_per_10_shares: "",
  note: "",
};

function stockToForm(stock: Stock): StockFormData {
  return {
    name: stock.name,
    symbol: stock.symbol || "",
    market: stock.market,
    currency: stock.currency,
    current_price: stock.current_price > 0 ? String(stock.current_price) : "",
    previous_close: stock.previous_close > 0 ? String(stock.previous_close) : "",
    shares: stock.shares > 0 ? String(stock.shares) : "",
    cost_price: stock.cost_price > 0 ? String(stock.cost_price) : "",
    dividend_per_10_shares:
      stock.dividend_per_10_shares > 0
        ? String(stock.dividend_per_10_shares)
        : "",
    note: stock.note || "",
  };
}

interface Props {
  stock?: Stock | null;
  onSave: (data: Omit<Stock, "id" | "created_at" | "updated_at">) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export default function StockForm({ stock, onSave, onClose, saving }: Props) {
  const [form, setForm] = useState<StockFormData>(
    stock ? stockToForm(stock) : DEFAULT_FORM
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    setForm(stock ? stockToForm(stock) : DEFAULT_FORM);
    setErrors([]);
  }, [stock]);

  function getError(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;

    // 代码输入: 精确匹配时自动填入名称和市场
    if (name === "symbol") {
      const entry = lookupBySymbol(value);
      if (entry) {
        setForm((prev) => ({
          ...prev,
          symbol: value,
          name: entry.name,
          market: entry.market,
        }));
        setErrors((prev) => prev.filter((er) => er.field !== "symbol" && er.field !== "name"));
        return;
      }
    }

    // 名称输入: 精确匹配时自动填入代码和市场
    if (name === "name") {
      const entry = lookupByName(value);
      if (entry) {
        setForm((prev) => ({
          ...prev,
          name: value,
          symbol: entry.symbol,
          market: entry.market,
        }));
        setErrors((prev) => prev.filter((er) => er.field !== "name" && er.field !== "symbol"));
        return;
      }
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => prev.filter((er) => er.field !== name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStockForm(form);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const data: Omit<Stock, "id" | "created_at" | "updated_at"> = {
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      market: form.market,
      currency: form.currency,
      current_price: form.current_price ? parseFloat(form.current_price) : 0,
      previous_close: form.previous_close ? parseFloat(form.previous_close) : 0,
      shares: form.shares ? parseFloat(form.shares) : 0,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
      pe: 0,  // 旧字段保留兼容性, 不再由用户填写
      dividend_per_10_shares: form.dividend_per_10_shares
        ? parseFloat(form.dividend_per_10_shares)
        : 0,
      total_share: stock?.total_share ?? 0,
      net_profit_ttm: stock?.net_profit_ttm ?? 0,
      net_assets: stock?.net_assets ?? 0,
      roe: stock?.roe ?? 0,
      total_shares: stock?.total_shares ?? 0,
      net_profit_q1: stock?.net_profit_q1 ?? 0,
      net_profit_q2: stock?.net_profit_q2 ?? 0,
      net_profit_q3: stock?.net_profit_q3 ?? 0,
      net_profit_q4: stock?.net_profit_q4 ?? 0,
      net_assets_parent: stock?.net_assets_parent ?? 0,
      note: form.note.trim(),
    };

    await onSave(data);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {stock ? "编辑股票" : "新增股票"}
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* datalist: 代码候选 */}
        <datalist id="stock-symbol-list">
          {STOCK_DICT.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.name}
            </option>
          ))}
        </datalist>

        {/* datalist: 名称候选 */}
        <datalist id="stock-name-list">
          {STOCK_DICT.map((e) => (
            <option key={e.name} value={e.name}>
              {e.symbol}
            </option>
          ))}
        </datalist>

        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="modal-body">
            <div className="form-grid">
              {/* 名称 */}
              <div className="form-group">
                <label className="form-label">
                  股票名称<span className="required">*</span>
                </label>
                <input
                  className={`form-input ${getError("name") ? "error" : ""}`}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="例如: 贵州茅台"
                  list="stock-name-list"
                  autoComplete="off"
                />
                {getError("name") && (
                  <span className="form-error">{getError("name")}</span>
                )}
              </div>

              {/* 代码 */}
              <div className="form-group">
                <label className="form-label">股票代码</label>
                <input
                  className="form-input"
                  name="symbol"
                  value={form.symbol}
                  onChange={handleChange}
                  placeholder="例如: 600519"
                  list="stock-symbol-list"
                  autoComplete="off"
                />
              </div>

              {/* 市场 */}
              <div className="form-group">
                <label className="form-label">市场类型</label>
                <select
                  className="form-select"
                  name="market"
                  value={form.market}
                  onChange={handleChange}
                >
                  {MARKET_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 货币 */}
              <div className="form-group">
                <label className="form-label">货币</label>
                <select
                  className="form-select"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 当前股价 */}
              <div className="form-group">
                <label className="form-label">当前股价</label>
                <input
                  className={`form-input ${getError("current_price") ? "error" : ""}`}
                  name="current_price"
                  value={form.current_price}
                  onChange={handleChange}
                  placeholder="0.000"
                  type="number"
                  step="any"
                  min="0"
                />
                {getError("current_price") && (
                  <span className="form-error">{getError("current_price")}</span>
                )}
              </div>

              {/* 昨日收盘 */}
              <div className="form-group">
                <label className="form-label">昨日收盘价</label>
                <input
                  className={`form-input ${getError("previous_close") ? "error" : ""}`}
                  name="previous_close"
                  value={form.previous_close}
                  onChange={handleChange}
                  placeholder="0.000"
                  type="number"
                  step="any"
                  min="0"
                />
                {getError("previous_close") && (
                  <span className="form-error">{getError("previous_close")}</span>
                )}
              </div>

              {/* 持仓数量 */}
              <div className="form-group">
                <label className="form-label">持仓数量</label>
                <input
                  className={`form-input ${getError("shares") ? "error" : ""}`}
                  name="shares"
                  value={form.shares}
                  onChange={handleChange}
                  placeholder="0"
                  type="number"
                  step="any"
                  min="0"
                />
                {getError("shares") && (
                  <span className="form-error">{getError("shares")}</span>
                )}
              </div>

              {/* 成本价 */}
              <div className="form-group">
                <label className="form-label">成本价</label>
                <input
                  className={`form-input ${getError("cost_price") ? "error" : ""}`}
                  name="cost_price"
                  value={form.cost_price}
                  onChange={handleChange}
                  placeholder="0.000"
                  type="number"
                  step="any"
                  min="0"
                />
                {getError("cost_price") && (
                  <span className="form-error">{getError("cost_price")}</span>
                )}
              </div>

              {/* 每十股分红 */}
              <div className="form-group">
                <label className="form-label">每十股分红 (去年)</label>
                <input
                  className={`form-input ${getError("dividend_per_10_shares") ? "error" : ""}`}
                  name="dividend_per_10_shares"
                  value={form.dividend_per_10_shares}
                  onChange={handleChange}
                  placeholder="0.00"
                  type="number"
                  step="any"
                  min="0"
                />
                {getError("dividend_per_10_shares") && (
                  <span className="form-error">{getError("dividend_per_10_shares")}</span>
                )}
                <span className="form-hint">
                  去年每10股派息金额, 分红总额和股息率将自动计算
                </span>
              </div>

              {/* 备注 */}
              <div className="form-group full-width">
                <label className="form-label">备注</label>
                <textarea
                  className="form-textarea"
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="选填备注..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
