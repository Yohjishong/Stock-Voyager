import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  currentNetCash: number;
  onSave: (netCash: number) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export default function CashSettingsDialog({
  currentNetCash,
  onSave,
  onClose,
  saving,
}: Props) {
  const [value, setValue] = useState(
    currentNetCash > 0 ? String(currentNetCash) : ""
  );
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = value === "" ? 0 : parseFloat(value);
    if (isNaN(n)) {
      setError("请输入有效数字");
      return;
    }
    await onSave(n);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box cash-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">现金设置</span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="modal-body">
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              输入您持有的净现金总额(人民币口径). 净资产 = 持仓市值 + 净现金.
            </p>
            <div className="form-group">
              <label className="form-label">净现金 (CNY)</label>
              <input
                className={`form-input ${error ? "error" : ""}`}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                placeholder="0.00"
                type="number"
                step="any"
              />
              {error && <span className="form-error">{error}</span>}
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
