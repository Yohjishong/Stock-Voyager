import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatNumber } from "../lib/format";

interface Props {
  cash: number;
  marketValue: number;
  onSave: (cash: number) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function CashBalanceDialog({
  cash,
  marketValue,
  onSave,
  onClose,
  saving,
}: Props) {
  const [input, setInput] = useState(String(cash));

  useEffect(() => {
    setInput(String(cash));
  }, [cash]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(input.replace(/,/g, ""));
    if (!Number.isFinite(n)) {
      return;
    }
    await onSave(n);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box cash-balance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">调整现金</span>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="form-hint" style={{ marginBottom: 14, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
              总资产 = 持仓市值 + 现金. 当前持仓市值约 ¥{formatNumber(marketValue)}, 修改现金后总资产会随之变化.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="cash-input">
                现金余额 (元)
              </label>
              <input
                id="cash-input"
                className="form-input"
                type="text"
                inputMode="decimal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" style={{ minWidth: 72 }} onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 88 }} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
