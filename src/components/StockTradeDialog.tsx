import { useState } from "react";
import { X } from "lucide-react";
import { OperationRecord, StockWithCalc } from "../types/stock";
import { formatPrice } from "../lib/format";

export type TradeMode = "t_trade" | "reduce" | "add";

export type TradeOperationRecordInput = Omit<
  OperationRecord,
  "id" | "created_at" | "updated_at"
>;

export interface TradePayload {
  mode: TradeMode;
  newShares: number;
  newCostPrice: number;
  operationRecord: TradeOperationRecordInput;
}

const MODE_LABELS: Record<TradeMode, string> = {
  t_trade: "做T",
  reduce: "减仓",
  add: "加仓",
};

const MODE_HINTS: Record<TradeMode, string> = {
  t_trade:
    "输入卖出和买入的股数与价格, 自动计算 T 利润并摊薄/升高持仓成本. 卖出额 > 买入额为正T (降成本), 反之为反T.",
  reduce:
    "卖出部分持仓, 卖出所得从总持仓成本中扣除, 重新计算剩余仓位的平均成本价.",
  add: "以指定价格买入更多股份, 重新计算加权平均成本价.",
};

interface Props {
  stock: StockWithCalc;
  onConfirm: (payload: TradePayload) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

/**
 * 统一持仓成本计算公式:
 *   newShares     = oldShares + buyShares - sellShares
 *   newTotalCost  = oldShares * oldCost + buyShares * buyPrice - sellShares * sellPrice
 *   newCostPrice  = newTotalCost / newShares  (newShares > 0 时)
 *
 * 三种模式的映射:
 *   做T  : 全部四个参数都有值 (正T: 卖出额>买入额, 成本降低; 反T: 反之)
 *   减仓 : buyShares=0, buyPrice=0 (卖出所得减少总成本, 重算单股成本)
 *   加仓 : sellShares=0, sellPrice=0 (加权平均新成本)
 */
export function calcTradeResult(
  oldShares: number,
  oldCostPrice: number,
  buyShares: number,
  buyPrice: number,
  sellShares: number,
  sellPrice: number
): { newShares: number; newCostPrice: number } {
  const newShares = oldShares + buyShares - sellShares;
  const newTotalCost =
    oldShares * oldCostPrice +
    buyShares * buyPrice -
    sellShares * sellPrice;
  const newCostPrice = newShares > 0 ? newTotalCost / newShares : 0;
  return { newShares, newCostPrice };
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, "").trim());
}

function isPos(s: string) {
  const n = parseNum(s);
  return Number.isFinite(n) && n > 0;
}

export default function StockTradeDialog({
  stock,
  onConfirm,
  onClose,
  saving,
}: Props) {
  const [mode, setMode] = useState<TradeMode>("t_trade");

  // 做T / 减仓 共用
  const [sellShares, setSellShares] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  // 做T / 加仓 共用
  const [buyShares, setBuyShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");

  const sellSharesN = parseNum(sellShares);
  const sellPriceN = parseNum(sellPrice);
  const buySharesN = parseNum(buyShares);
  const buyPriceN = parseNum(buyPrice);

  // ----- 校验 -----
  const sellSharesValid = isPos(sellShares);
  const sellPriceValid = isPos(sellPrice);
  const buySharesValid = isPos(buyShares);
  const buyPriceValid = isPos(buyPrice);

  const reduceMaxOk =
    mode !== "reduce" || (sellSharesValid && sellSharesN < stock.shares);

  let formValid = false;
  if (mode === "t_trade") {
    formValid = sellSharesValid && sellPriceValid && buySharesValid && buyPriceValid;
  } else if (mode === "reduce") {
    formValid = sellSharesValid && sellPriceValid && reduceMaxOk;
  } else {
    formValid = buySharesValid && buyPriceValid;
  }

  // ----- 当前模式下 buy/sell 参数 -----
  const effectiveBuyShares = mode === "reduce" ? 0 : buySharesValid ? buySharesN : 0;
  const effectiveBuyPrice = mode === "reduce" ? 0 : buyPriceValid ? buyPriceN : 0;
  const effectiveSellShares = mode === "add" ? 0 : sellSharesValid ? sellSharesN : 0;
  const effectiveSellPrice = mode === "add" ? 0 : sellPriceValid ? sellPriceN : 0;

  const preview =
    formValid
      ? calcTradeResult(
          stock.shares,
          stock.cost_price,
          effectiveBuyShares,
          effectiveBuyPrice,
          effectiveSellShares,
          effectiveSellPrice
        )
      : null;

  // 做T 利润预览
  const tProfit =
    mode === "t_trade" && sellSharesValid && sellPriceValid && buySharesValid && buyPriceValid
      ? sellSharesN * sellPriceN - buySharesN * buyPriceN
      : null;

  const mktPrice = stock.current_price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || !preview) return;

    const operation_date = new Date().toISOString();
    const shares_before = stock.shares;
    const cost_price_before = stock.cost_price;
    const shares_after = preview.newShares;
    const cost_price_after = preview.newCostPrice;

    let operationRecord: TradeOperationRecordInput;

    if (mode === "add") {
      const amount = effectiveBuyShares * effectiveBuyPrice;
      operationRecord = {
        stock_id: stock.id,
        operation_type: "add",
        operation_date,
        shares_delta: effectiveBuyShares,
        price: effectiveBuyPrice,
        amount,
        net_profit_per_share: 0,
        dividend_per_10_shares: 0,
        cash_amount: -amount,
        shares_before,
        shares_after,
        cost_price_before,
        cost_price_after,
        note: "",
        current_price_before: stock.current_price,
        current_price_after: stock.current_price,
        previous_close_before: stock.previous_close,
        previous_close_after: stock.previous_close,
        dividend_tax_bucket: "",
      };
    } else if (mode === "reduce") {
      const amount = effectiveSellShares * effectiveSellPrice;
      operationRecord = {
        stock_id: stock.id,
        operation_type: "reduce",
        operation_date,
        shares_delta: -effectiveSellShares,
        price: effectiveSellPrice,
        amount,
        net_profit_per_share: 0,
        dividend_per_10_shares: 0,
        cash_amount: amount,
        shares_before,
        shares_after,
        cost_price_before,
        cost_price_after,
        note: "",
        current_price_before: stock.current_price,
        current_price_after: stock.current_price,
        previous_close_before: stock.previous_close,
        previous_close_after: stock.previous_close,
        dividend_tax_bucket: "",
      };
    } else {
      const tCash =
        effectiveSellShares * effectiveSellPrice -
        effectiveBuyShares * effectiveBuyPrice;
      const net_profit_per_share =
        effectiveSellShares > 0
          ? tCash / effectiveSellShares
          : 0;
      operationRecord = {
        stock_id: stock.id,
        operation_type: "t_trade",
        operation_date,
        shares_delta: 0,
        price: 0,
        amount: 0,
        net_profit_per_share,
        dividend_per_10_shares: 0,
        cash_amount: tCash,
        shares_before,
        shares_after,
        cost_price_before,
        cost_price_after,
        note: "",
        current_price_before: stock.current_price,
        current_price_after: stock.current_price,
        previous_close_before: stock.previous_close,
        previous_close_after: stock.previous_close,
        dividend_tax_bucket: "",
      };
    }

    await onConfirm({
      mode,
      newShares: preview.newShares,
      newCostPrice: preview.newCostPrice,
      operationRecord,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box trade-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">
            交易操作 &mdash; {stock.name}
            {stock.symbol ? ` (${stock.symbol})` : ""}
          </span>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* 模式标签 */}
            <div className="trade-mode-tabs">
              {(Object.keys(MODE_LABELS) as TradeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`trade-mode-tab${mode === m ? " active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            <p className="trade-hint">{MODE_HINTS[mode]}</p>

            {/* 当前状态参考 */}
            <div className="trade-current-info">
              <span>当前持仓 <strong>{stock.shares.toLocaleString()}</strong> 股</span>
              <span>成本价 <strong>{formatPrice(stock.cost_price)}</strong></span>
              <span>现价 <strong>{formatPrice(mktPrice)}</strong></span>
            </div>

            {/* ===== 做T 输入 (4 个字段, 2列×2行) ===== */}
            {mode === "t_trade" && (
              <div style={{ marginTop: 14 }}>
                <div className="trade-section-label">卖出</div>
                <div className="form-grid" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sell-shares-t">
                      卖出股数 <span className="required">*</span>
                    </label>
                    <input
                      id="sell-shares-t"
                      className={`form-input${!sellSharesValid && sellShares !== "" ? " error" : ""}`}
                      type="text"
                      inputMode="decimal"
                      value={sellShares}
                      onChange={(e) => setSellShares(e.target.value)}
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sell-price-t">
                      卖出价格 (元/股) <span className="required">*</span>
                    </label>
                    <input
                      id="sell-price-t"
                      className={`form-input${!sellPriceValid && sellPrice !== "" ? " error" : ""}`}
                      type="text"
                      inputMode="decimal"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="0.000"
                    />
                  </div>
                </div>

                <div className="trade-section-label">买回</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="buy-shares-t">
                      买入股数 <span className="required">*</span>
                    </label>
                    <input
                      id="buy-shares-t"
                      className={`form-input${!buySharesValid && buyShares !== "" ? " error" : ""}`}
                      type="text"
                      inputMode="decimal"
                      value={buyShares}
                      onChange={(e) => setBuyShares(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="buy-price-t">
                      买入价格 (元/股) <span className="required">*</span>
                    </label>
                    <input
                      id="buy-price-t"
                      className={`form-input${!buyPriceValid && buyPrice !== "" ? " error" : ""}`}
                      type="text"
                      inputMode="decimal"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="0.000"
                    />
                  </div>
                </div>

                {/* T 利润实时显示 */}
                {tProfit !== null && (
                  <div
                    className="trade-t-profit"
                    style={{ color: tProfit >= 0 ? "var(--color-down)" : "var(--color-up)" }}
                  >
                    {tProfit >= 0 ? "✓ 正T" : "⚠ 反T"} &nbsp; T利润:{" "}
                    <strong>
                      {tProfit >= 0 ? "+" : ""}
                      {tProfit.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 元
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* ===== 减仓 输入 ===== */}
            {mode === "reduce" && (
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="sell-shares-r">
                    卖出股数 <span className="required">*</span>
                  </label>
                  <input
                    id="sell-shares-r"
                    className={`form-input${(!sellSharesValid || !reduceMaxOk) && sellShares !== "" ? " error" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={sellShares}
                    onChange={(e) => setSellShares(e.target.value)}
                    placeholder={`最多 ${stock.shares.toLocaleString()} 股`}
                    autoFocus
                  />
                  {!reduceMaxOk && sellShares !== "" && (
                    <span className="form-error">
                      卖出股数不能超过持仓 {stock.shares.toLocaleString()} 股
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sell-price-r">
                    卖出价格 (元/股) <span className="required">*</span>
                  </label>
                  <input
                    id="sell-price-r"
                    className={`form-input${!sellPriceValid && sellPrice !== "" ? " error" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="0.000"
                  />
                </div>
              </div>
            )}

            {/* ===== 加仓 输入 ===== */}
            {mode === "add" && (
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="buy-shares-a">
                    买入股数 <span className="required">*</span>
                  </label>
                  <input
                    id="buy-shares-a"
                    className={`form-input${!buySharesValid && buyShares !== "" ? " error" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={buyShares}
                    onChange={(e) => setBuyShares(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="buy-price-a">
                    买入价格 (元/股) <span className="required">*</span>
                  </label>
                  <input
                    id="buy-price-a"
                    className={`form-input${!buyPriceValid && buyPrice !== "" ? " error" : ""}`}
                    type="text"
                    inputMode="decimal"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="0.000"
                  />
                </div>
              </div>
            )}

            {/* ===== 预览 ===== */}
            {preview && (
              <div className="trade-preview">
                <div className="trade-preview-title">操作后预览</div>
                <div className="trade-preview-row">
                  <span>持仓数量</span>
                  <span>
                    {stock.shares.toLocaleString()}
                    {" → "}
                    <strong
                      style={{
                        color:
                          preview.newShares > stock.shares
                            ? "var(--color-up)"
                            : preview.newShares < stock.shares
                            ? "var(--color-down)"
                            : undefined,
                      }}
                    >
                      {preview.newShares.toLocaleString()}
                    </strong>
                  </span>
                </div>
                <div className="trade-preview-row">
                  <span>成本价</span>
                  <span>
                    {formatPrice(stock.cost_price)}
                    {" → "}
                    <strong
                      style={{
                        color:
                          preview.newCostPrice < stock.cost_price
                            ? "var(--color-down)"
                            : preview.newCostPrice > stock.cost_price
                            ? "var(--color-up)"
                            : undefined,
                      }}
                    >
                      {formatPrice(preview.newCostPrice)}
                    </strong>
                  </span>
                </div>
                <div className="trade-preview-row">
                  <span>持仓市值 (估)</span>
                  <span>
                    <strong>
                      ¥{(preview.newShares * mktPrice).toLocaleString("zh-CN", {
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                </div>
                <div className="trade-preview-row">
                  <span>浮动盈亏 (估)</span>
                  {(() => {
                    const pl = (mktPrice - preview.newCostPrice) * preview.newShares;
                    return (
                      <span style={{ color: pl > 0 ? "var(--color-up)" : pl < 0 ? "var(--color-down)" : undefined }}>
                        <strong>
                          {pl >= 0 ? "+" : ""}
                          {pl.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}
                        </strong>
                        {preview.newCostPrice > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 12 }}>
                            ({(((mktPrice - preview.newCostPrice) / preview.newCostPrice) * 100).toFixed(2)}%)
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              style={{ minWidth: 72 }}
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: 88 }}
              disabled={saving || !formValid}
            >
              {saving ? "处理中…" : "确认操作"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
