import { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { formatNumber } from "../lib/format";

interface Props {
  investedCapital: number;
  disabled?: boolean;
  saving?: boolean;
  onRecharge: (amount: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
}

type FlowMode = "recharge" | "withdraw" | null;

export default function InvestedCapitalControl({
  investedCapital,
  disabled,
  saving,
  onRecharge,
  onWithdraw,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [flow, setFlow] = useState<FlowMode>(null);
  const [amountInput, setAmountInput] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    if (flow) setAmountInput("");
  }, [flow]);

  function openFlow(mode: Exclude<FlowMode, null>) {
    setMenuOpen(false);
    setFlow(mode);
  }

  async function submitAmount() {
    const raw = amountInput.replace(/,/g, "").trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    if (flow === "withdraw" && n > investedCapital) return;
    try {
      if (flow === "recharge") {
        await onRecharge(n);
      } else if (flow === "withdraw") {
        await onWithdraw(n);
      }
      setFlow(null);
    } catch {
      /* 错误提示由 App 中 toast 处理 */
    }
  }

  return (
    <>
      <div className="navbar-invested-wrap" ref={wrapRef}>
        <button
          type="button"
          className="navbar-invested-btn"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={disabled}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="navbar-invested-label">投入资金</span>
          <span className="navbar-invested-value">
            ¥{formatNumber(investedCapital)}
          </span>
          <ChevronDown size={14} className={menuOpen ? "navbar-chevron-open" : ""} />
        </button>
        {menuOpen && (
          <div className="navbar-invested-menu" role="menu">
            <button
              type="button"
              className="navbar-invested-menu-item"
              role="menuitem"
              onClick={() => openFlow("recharge")}
            >
              充值
            </button>
            <button
              type="button"
              className="navbar-invested-menu-item"
              role="menuitem"
              onClick={() => openFlow("withdraw")}
            >
              提现
            </button>
          </div>
        )}
      </div>

      {flow && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!saving) setFlow(null);
          }}
        >
          <div className="modal-box cash-balance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {flow === "recharge" ? "充值 (增加投入资金)" : "提现 (减少投入资金)"}
              </span>
              <button type="button" className="modal-close" onClick={() => setFlow(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {flow === "withdraw" && (
                <p className="form-hint" style={{ marginBottom: 12, fontSize: 12, color: "var(--color-text-muted)" }}>
                  当前投入资金 ¥{formatNumber(investedCapital)}, 提现金额不能超过此项.
                </p>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="flow-amount">
                  金额 (元)
                </label>
                <input
                  id="flow-amount"
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setFlow(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void submitAmount()}
                disabled={
                  disabled ||
                  saving ||
                  !Number.isFinite(parseFloat(amountInput.replace(/,/g, ""))) ||
                  parseFloat(amountInput.replace(/,/g, "")) <= 0 ||
                  (flow === "withdraw" &&
                    parseFloat(amountInput.replace(/,/g, "")) > investedCapital)
                }
              >
                {saving ? "处理中…" : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
