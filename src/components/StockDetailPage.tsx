import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Edit2, Plus, Trash2, X } from "lucide-react";
import {
  OperationRecord,
  OperationType,
  StockNote,
  StockWithCalc,
} from "../types/stock";
import {
  listOperationRecords,
  createOperationRecord,
  deleteOperationRecord,
  applyDividendExRights,
  type CreateOperationRecordInput,
  type ApplyDividendExRightsPayload,
} from "../services/operationRecordService";
import {
  dividendIncomeTaxRate,
  grossDividendCash,
  netDividendAfterTax,
  HOLDING_PERIOD_LABEL,
  type DividendHoldingPeriod,
} from "../lib/dividendTax";
import {
  listStockNotes,
  createStockNote,
  updateStockNote,
  deleteStockNote,
} from "../services/stockNoteService";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  formatPrice,
  formatValuation,
  changeColor,
} from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";

const OP_TYPE_LABEL: Record<OperationType, string> = {
  add: "加仓",
  reduce: "减仓",
  t_trade: "做T",
  dividend: "分红",
  ex_rights: "除权",
  dividend_ex_rights: "分红除权",
  manual: "手动记录",
};

type AddModalKind = "dividend_ex_rights" | "manual";

const ADD_MODAL_KIND_LABEL: Record<AddModalKind, string> = {
  dividend_ex_rights: "分红除权 (含税与股价除权)",
  manual: "手动记录",
};

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  stock: StockWithCalc;
  onBack: () => void;
  onToast: (message: string, type: "success" | "error" | "info") => void;
  onStocksNeedReload: () => Promise<void>;
}

export default function StockDetailPage({
  stock,
  onBack,
  onToast,
  onStocksNeedReload,
}: Props) {
  const [tab, setTab] = useState<"records" | "notes">("records");
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [notes, setNotes] = useState<StockNote[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showOpModal, setShowOpModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<StockNote | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] =
    useState<OperationRecord | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<StockNote | null>(
    null
  );
  const [savingOp, setSavingOp] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const reloadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const list = await listOperationRecords(stock.id);
      setRecords(list);
    } catch (e) {
      onToast(`加载操作记录失败: ${e}`, "error");
    } finally {
      setLoadingRecords(false);
    }
  }, [stock.id, onToast]);

  const reloadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const list = await listStockNotes(stock.id);
      setNotes(list);
    } catch (e) {
      onToast(`加载分析笔记失败: ${e}`, "error");
    } finally {
      setLoadingNotes(false);
    }
  }, [stock.id, onToast]);

  useEffect(() => {
    void reloadRecords();
  }, [reloadRecords]);

  useEffect(() => {
    void reloadNotes();
  }, [reloadNotes]);

  function openCreateNote() {
    setEditingNote(null);
    setShowNoteModal(true);
  }

  function openEditNote(n: StockNote) {
    setEditingNote(n);
    setShowNoteModal(true);
  }

  return (
    <div className="detail-page">
      <div className="detail-header-bar">
        <button type="button" className="btn btn-outline detail-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="detail-title-block">
          <h1 className="detail-title">{stock.name}</h1>
          <span className="detail-subtitle">
            {stock.symbol || "-"} · {stock.market} · {stock.currency}
          </span>
        </div>
      </div>

      <div className="table-panel detail-metrics-panel">
        <div className="detail-metrics-grid">
          <Metric label="当前股价" value={formatPrice(stock.current_price)} />
          <Metric label="持仓数量" value={stock.shares.toLocaleString()} />
          <Metric label="成本价" value={formatPrice(stock.cost_price)} />
          <Metric
            label="持仓市值"
            value={formatCurrency(stock.market_value, stock.currency)}
          />
          <Metric
            label="浮动盈亏"
            value={
              <span style={{ color: changeColor(stock.profit_loss) }}>
                {stock.profit_loss >= 0 ? "+" : ""}
                {formatCurrency(stock.profit_loss, stock.currency)}
              </span>
            }
          />
          <Metric
            label="盈亏率"
            value={
              <span style={{ color: changeColor(stock.profit_loss_pct) }}>
                {stock.profit_loss_pct >= 0 ? "+" : ""}
                {formatPercent(stock.profit_loss_pct)}
              </span>
            }
          />
          <Metric
            label="动态PE"
            value={formatValuation(stock.pe_dynamic)}
          />
          <Metric label="PE_TTM" value={formatValuation(stock.pe_ttm)} />
          <Metric label="PB" value={formatValuation(stock.pb)} />
          <Metric
            label="ROE"
            value={
              stock.roe !== null && stock.roe !== undefined
                ? formatPercent(stock.roe)
                : "N/A"
            }
          />
        </div>
      </div>

      <div className="detail-tab-section">
        <div className="detail-tab-bar">
          <div className="trade-mode-tabs detail-inner-tabs">
            <button
              type="button"
              className={`trade-mode-tab${tab === "records" ? " active" : ""}`}
              onClick={() => setTab("records")}
            >
              操作记录
            </button>
            <button
              type="button"
              className={`trade-mode-tab${tab === "notes" ? " active" : ""}`}
              onClick={() => setTab("notes")}
            >
              分析笔记
            </button>
          </div>
          {tab === "records" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowOpModal(true)}
            >
              <Plus size={14} />
              新增记录
            </button>
          )}
          {tab === "notes" && (
            <button type="button" className="btn btn-primary" onClick={openCreateNote}>
              <Plus size={14} />
              新增笔记
            </button>
          )}
        </div>

        {tab === "records" && (
          <div className="table-panel">
            <div className="table-wrapper">
              {loadingRecords ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  加载中…
                </div>
              ) : records.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-text">暂无操作记录</div>
                </div>
              ) : (
                <table className="stock-table detail-op-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>类型</th>
                      <th className="text-right">数量变化</th>
                      <th className="text-right">价格</th>
                      <th className="text-right">现金影响</th>
                      <th className="text-right">操作前持仓</th>
                      <th className="text-right">操作后持仓</th>
                      <th className="text-right">操作前成本</th>
                      <th className="text-right">操作后成本</th>
                      <th>备注</th>
                      <th className="text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.operation_date)}</td>
                        <td>{OP_TYPE_LABEL[r.operation_type] ?? r.operation_type}</td>
                        <td className="text-right">
                          {r.shares_delta === 0
                            ? "-"
                            : r.shares_delta.toLocaleString()}
                        </td>
                        <td className="text-right">
                          {r.price > 0 ? formatPrice(r.price) : "-"}
                        </td>
                        <td className="text-right">
                          {r.cash_amount === 0
                            ? "-"
                            : formatCurrency(r.cash_amount, stock.currency)}
                        </td>
                        <td className="text-right">
                          {r.shares_before.toLocaleString()}
                        </td>
                        <td className="text-right">
                          {r.shares_after.toLocaleString()}
                        </td>
                        <td className="text-right">{formatPrice(r.cost_price_before)}</td>
                        <td className="text-right">{formatPrice(r.cost_price_after)}</td>
                        <td
                          style={{
                            maxWidth: 160,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                          title={r.note}
                        >
                          {r.note || "-"}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-icon delete"
                            title="删除记录"
                            onClick={() => setDeleteRecordTarget(r)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="detail-notes-list">
            {loadingNotes ? (
              <div className="empty-state" style={{ padding: 40 }}>
                加载中…
              </div>
            ) : notes.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-text">暂无分析笔记</div>
              </div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="table-panel note-card">
                  <div className="note-card-header">
                    <div>
                      <div className="note-card-title">{n.title || "(无标题)"}</div>
                      <div className="note-card-meta">
                        更新于 {formatDateTime(n.updated_at)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon edit"
                        title="编辑"
                        onClick={() => openEditNote(n)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon delete"
                        title="删除"
                        onClick={() => setDeleteNoteTarget(n)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <pre className="note-card-body">{n.content || ""}</pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showOpModal && (
        <AddOperationRecordModal
          stock={stock}
          saving={savingOp}
          onClose={() => setShowOpModal(false)}
          onApplyDividendExRights={async (payload: ApplyDividendExRightsPayload) => {
            setSavingOp(true);
            try {
              await applyDividendExRights(payload);
              onToast("分红除权已保存 (成本价, 当前价, 昨收已按每股分红下调)", "success");
              setShowOpModal(false);
              await onStocksNeedReload();
              await reloadRecords();
            } catch (e) {
              onToast(`保存失败: ${e}`, "error");
            } finally {
              setSavingOp(false);
            }
          }}
          onCreateManual={async (input) => {
            setSavingOp(true);
            try {
              await createOperationRecord(input);
              onToast("操作记录已保存", "success");
              setShowOpModal(false);
              await reloadRecords();
            } catch (e) {
              onToast(`保存失败: ${e}`, "error");
            } finally {
              setSavingOp(false);
            }
          }}
        />
      )}

      {showNoteModal && (
        <StockNoteModal
          initial={editingNote}
          saving={savingNote}
          onClose={() => {
            setShowNoteModal(false);
            setEditingNote(null);
          }}
          onSave={async ({ title, content }) => {
            setSavingNote(true);
            try {
              if (editingNote) {
                await updateStockNote({
                  id: editingNote.id,
                  title,
                  content,
                });
                onToast("笔记已更新", "success");
              } else {
                await createStockNote({
                  stock_id: stock.id,
                  title,
                  content,
                });
                onToast("笔记已新增", "success");
              }
              setShowNoteModal(false);
              setEditingNote(null);
              await reloadNotes();
            } catch (e) {
              onToast(`保存失败: ${e}`, "error");
            } finally {
              setSavingNote(false);
            }
          }}
        />
      )}

      {deleteRecordTarget && (
        <ConfirmDialog
          title="删除操作记录"
          message={
            deleteRecordTarget.operation_type === "dividend_ex_rights"
              ? "确定删除这条分红除权记录吗? 将同时撤销当时对成本价, 当前价与昨收的除权下调 (按记录内保存的变动量加回)."
              : "确定删除这条操作记录吗? 不会影响当前持仓与股票行情数据."
          }
          confirmLabel="删除"
          danger
          onConfirm={async () => {
            if (!deleteRecordTarget) return;
            const wasDivEx = deleteRecordTarget.operation_type === "dividend_ex_rights";
            try {
              await deleteOperationRecord(deleteRecordTarget.id);
              onToast(
                wasDivEx ? "记录已删除, 除权下调已回滚" : "记录已删除",
                "success"
              );
              setDeleteRecordTarget(null);
              await reloadRecords();
              if (wasDivEx) await onStocksNeedReload();
            } catch (e) {
              onToast(`删除失败: ${e}`, "error");
            }
          }}
          onCancel={() => setDeleteRecordTarget(null)}
        />
      )}

      {deleteNoteTarget && (
        <ConfirmDialog
          title="删除笔记"
          message={`确定删除笔记「${deleteNoteTarget.title || "(无标题)"}」吗?`}
          confirmLabel="删除"
          danger
          onConfirm={async () => {
            if (!deleteNoteTarget) return;
            try {
              await deleteStockNote(deleteNoteTarget.id);
              onToast("笔记已删除", "success");
              setDeleteNoteTarget(null);
              await reloadNotes();
            } catch (e) {
              onToast(`删除失败: ${e}`, "error");
            }
          }}
          onCancel={() => setDeleteNoteTarget(null)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="detail-metric">
      <div className="detail-metric-label">{label}</div>
      <div className="detail-metric-value">{value}</div>
    </div>
  );
}

function AddOperationRecordModal({
  stock,
  saving,
  onClose,
  onApplyDividendExRights,
  onCreateManual,
}: {
  stock: StockWithCalc;
  saving: boolean;
  onClose: () => void;
  onApplyDividendExRights: (payload: ApplyDividendExRightsPayload) => Promise<void>;
  onCreateManual: (input: CreateOperationRecordInput) => Promise<void>;
}) {
  const [kind, setKind] = useState<AddModalKind>("dividend_ex_rights");
  const [operationDate, setOperationDate] = useState(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const [divPer10, setDivPer10] = useState("");
  const [regShares, setRegShares] = useState(
    stock.shares > 0 ? String(stock.shares) : ""
  );
  const [holdingPeriod, setHoldingPeriod] =
    useState<DividendHoldingPeriod>("over_1y");
  const [cashAmount, setCashAmount] = useState("");
  const [cashTouched, setCashTouched] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [divNote, setDivNote] = useState("");

  const divN = parseNum(divPer10);
  const regN = parseNum(regShares);
  const gross = grossDividendCash(divN, regN);
  const defaultNetCash = netDividendAfterTax(gross, holdingPeriod);
  const taxRate = dividendIncomeTaxRate(holdingPeriod);
  const effectiveNetCash = cashTouched
    ? Math.max(0, parseNum(cashAmount))
    : defaultNetCash;
  const perShareEx =
    regN > 0 && effectiveNetCash > 0 ? effectiveNetCash / regN : 0;

  useEffect(() => {
    if (kind !== "dividend_ex_rights") return;
    if (!cashTouched) {
      setCashAmount(
        defaultNetCash > 0 ? String(defaultNetCash.toFixed(2)) : ""
      );
    }
  }, [kind, defaultNetCash, cashTouched, holdingPeriod, divN, regN]);

  function isoFromDateInput(d: string): string {
    const t = Date.parse(`${d}T12:00:00`);
    return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const operationDateIso = isoFromDateInput(operationDate);

    if (kind === "dividend_ex_rights") {
      if (!(divN > 0) || !(regN > 0)) return;
      const payload: ApplyDividendExRightsPayload = {
        stockId: stock.id,
        operationDate: operationDateIso,
        dividendPer10Shares: divN,
        registrationShares: regN,
        holdingPeriod,
        note: divNote.trim() || undefined,
      };
      if (cashTouched) {
        const c = parseNum(cashAmount);
        if (c >= 0) payload.cashAmount = c;
      }
      await onApplyDividendExRights(payload);
    } else {
      if (!manualNote.trim()) return;
      await onCreateManual({
        stock_id: stock.id,
        operation_type: "manual",
        operation_date: operationDateIso,
        shares_delta: 0,
        price: 0,
        amount: 0,
        net_profit_per_share: 0,
        dividend_per_10_shares: 0,
        cash_amount: 0,
        shares_before: stock.shares,
        shares_after: stock.shares,
        cost_price_before: stock.cost_price,
        cost_price_after: stock.cost_price,
        note: manualNote.trim(),
        current_price_before: stock.current_price,
        current_price_after: stock.current_price,
        previous_close_before: stock.previous_close,
        previous_close_after: stock.previous_close,
        dividend_tax_bucket: "",
      });
    }
  }

  const dividendExValid =
    divN > 0 && regN > 0 && parseNum(cashAmount) >= 0;
  const manualValid = manualNote.trim().length > 0;
  const formOk = kind === "dividend_ex_rights" ? dividendExValid : manualValid;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box detail-op-modal"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">新增操作记录</span>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="op-type">
                记录类型
              </label>
              <select
                id="op-type"
                className="form-select"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as AddModalKind);
                  setCashTouched(false);
                }}
              >
                {(Object.keys(ADD_MODAL_KIND_LABEL) as AddModalKind[]).map((k) => (
                  <option key={k} value={k}>
                    {ADD_MODAL_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="op-date">
                操作日期
              </label>
              <input
                id="op-date"
                className="form-input"
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                required
              />
            </div>

            {kind === "dividend_ex_rights" && (
              <>
                <p className="trade-hint" style={{ marginBottom: 12 }}>
                  每股除权额 = 税后到手现金 ÷ 登记日持仓股数 (与账面实际收到的分红一致). 保存后将按该每股金额下调成本价, 当前价与昨收 (持仓股数不变).
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="div-10">
                      每十股分红金额 <span className="required">*</span>
                    </label>
                    <input
                      id="div-10"
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      value={divPer10}
                      onChange={(e) => setDivPer10(e.target.value)}
                      placeholder="例如 3.5"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-sh">
                      登记日持仓数量 <span className="required">*</span>
                    </label>
                    <input
                      id="reg-sh"
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      value={regShares}
                      onChange={(e) => setRegShares(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="hold-tax">
                    买入至分红登记日的持股期限 <span className="required">*</span>
                  </label>
                  <select
                    id="hold-tax"
                    className="form-select"
                    value={holdingPeriod}
                    onChange={(e) => {
                      setHoldingPeriod(e.target.value as DividendHoldingPeriod);
                      setCashTouched(false);
                    }}
                  >
                    {(Object.keys(HOLDING_PERIOD_LABEL) as DividendHoldingPeriod[]).map(
                      (p) => (
                        <option key={p} value={p}>
                          {HOLDING_PERIOD_LABEL[p]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                {gross > 0 && (
                  <div
                    className="trade-preview"
                    style={{ marginBottom: 12, padding: "10px 12px" }}
                  >
                    <div className="trade-preview-row">
                      <span>税前分红 (登记日口径)</span>
                      <span>{formatCurrency(gross, stock.currency)}</span>
                    </div>
                    <div className="trade-preview-row">
                      <span>红利税税率</span>
                      <span>{formatPercent(taxRate)}</span>
                    </div>
                    <div className="trade-preview-row">
                      <span>税后到手 (默认填入下方)</span>
                      <span>
                        <strong>{formatCurrency(defaultNetCash, stock.currency)}</strong>
                      </span>
                    </div>
                    <div className="trade-preview-row">
                      <span>每股除权下调 (税后÷登记日股数)</span>
                      <span>{perShareEx > 0 ? formatPrice(perShareEx) : "-"}</span>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="cash-amt">
                    税后现金收入 (到手)
                  </label>
                  <input
                    id="cash-amt"
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    value={cashAmount}
                    onChange={(e) => {
                      setCashTouched(true);
                      setCashAmount(e.target.value);
                    }}
                  />
                  <span className="form-hint">
                    默认按税前 × (1 - 税率), 可手动修改
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="div-note">
                    备注
                  </label>
                  <textarea
                    id="div-note"
                    className="form-textarea"
                    value={divNote}
                    onChange={(e) => setDivNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {kind === "manual" && (
              <div className="form-group">
                <label className="form-label" htmlFor="man-note">
                  内容 <span className="required">*</span>
                </label>
                <textarea
                  id="man-note"
                  className="form-textarea"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  rows={5}
                  required
                />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !formOk}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockNoteModal({
  initial,
  saving,
  onClose,
  onSave,
}: {
  initial: StockNote | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; content: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
  }, [initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ title: title.trim(), content });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box detail-note-modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{initial ? "编辑笔记" : "新增笔记"}</span>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="n-title">
                标题
              </label>
              <input
                id="n-title"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="n-content">
                正文
              </label>
              <textarea
                id="n-content"
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
