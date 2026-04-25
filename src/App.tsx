import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Upload,
  Download,
  Wallet,
} from "lucide-react";
import { Stock, StockWithCalc } from "./types/stock";
import { calcStock, calcSummary } from "./lib/calculations";
import { listStocks, createStock, updateStock, deleteStock } from "./services/stockService";
import { getNetCash, setNetCash } from "./services/settingsService";
import {
  exportStocksCsv,
  exportStocksJson,
  backupDatabase,
  importStocksJson,
  importStocksCsv,
  restoreDatabase,
} from "./services/importExportService";
import SummaryCards from "./components/SummaryCards";
import StockTable from "./components/StockTable";
import StockForm from "./components/StockForm";
import CashSettingsDialog from "./components/CashSettingsDialog";
import ImportExportPanel from "./components/ImportExportPanel";
import ConfirmDialog from "./components/ConfirmDialog";

// ===== Toast =====
interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500
      );
    },
    []
  );

  return { toasts, show };
}

// ===== App =====
export default function App() {
  const { toasts, show } = useToast();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [netCash, setNetCashState] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editStock, setEditStock] = useState<Stock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockWithCalc | null>(null);
  const [showCash, setShowCash] = useState(false);
  const [showIE, setShowIE] = useState(false);

  // Computed
  const stocksWithCalc: StockWithCalc[] = stocks.map(calcStock);
  const stats = calcSummary(stocksWithCalc, netCash);

  async function loadData() {
    setLoading(true);
    try {
      const [stockList, cash] = await Promise.all([
        listStocks(),
        getNetCash(),
      ]);
      setStocks(stockList);
      setNetCashState(cash);
    } catch (err) {
      show(`加载数据失败: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ----- 新增 / 编辑 -----
  function openCreate() {
    setEditStock(null);
    setShowForm(true);
  }

  function openEdit(stock: StockWithCalc) {
    setEditStock(stock);
    setShowForm(true);
  }

  async function handleSave(
    data: Omit<Stock, "id" | "created_at" | "updated_at">
  ) {
    setActionLoading(true);
    try {
      if (editStock) {
        const updated = await updateStock({ ...data, id: editStock.id, created_at: editStock.created_at, updated_at: "" });
        setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        show("股票已更新", "success");
      } else {
        const created = await createStock(data);
        setStocks((prev) => [...prev, created]);
        show("股票已新增", "success");
      }
      setShowForm(false);
      setEditStock(null);
    } catch (err) {
      show(`保存失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ----- 删除 -----
  function openDelete(stock: StockWithCalc) {
    setDeleteTarget(stock);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteStock(deleteTarget.id);
      setStocks((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      show("股票已删除", "success");
    } catch (err) {
      show(`删除失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  // ----- 现金设置 -----
  async function handleSaveCash(amount: number) {
    setActionLoading(true);
    try {
      await setNetCash(amount);
      setNetCashState(amount);
      show("现金设置已保存", "success");
      setShowCash(false);
    } catch (err) {
      show(`保存现金失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ----- 导入导出 -----
  async function wrapIE(fn: () => Promise<unknown>, successMsg: string) {
    setActionLoading(true);
    try {
      const res = await fn();
      show(
        typeof res === "number" ? `${successMsg}, 共 ${res} 条` : successMsg,
        "success"
      );
      await loadData();
    } catch (err) {
      show(`操作失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="app-layout">
      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">自选股分析</span>
        <div className="navbar-actions">
          <button
            className="btn btn-ghost"
            onClick={loadData}
            disabled={loading}
            title="刷新"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            刷新
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} />
            新增股票
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowIE(true)}
          >
            <Upload size={14} />
            导入
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowIE(true)}
          >
            <Download size={14} />
            导出
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowCash(true)}
          >
            <Wallet size={14} />
            现金设置
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <SummaryCards stats={stats} totalCount={stocks.length} />
        <StockTable
          stocks={stocksWithCalc}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </main>

      {/* 新增/编辑表单 */}
      {showForm && (
        <StockForm
          stock={editStock}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditStock(null);
          }}
          saving={actionLoading}
        />
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <ConfirmDialog
          title="删除股票"
          message={`确定要删除「${deleteTarget.name}」吗? 此操作不可撤销.`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* 现金设置 */}
      {showCash && (
        <CashSettingsDialog
          currentNetCash={netCash}
          onSave={handleSaveCash}
          onClose={() => setShowCash(false)}
          saving={actionLoading}
        />
      )}

      {/* 导入导出 */}
      {showIE && (
        <ImportExportPanel
          onClose={() => setShowIE(false)}
          onExportCsv={() => wrapIE(exportStocksCsv, "CSV 导出成功")}
          onExportJson={() => wrapIE(exportStocksJson, "JSON 导出成功")}
          onBackupDb={() => wrapIE(backupDatabase, "数据库备份成功")}
          onImportJson={() => wrapIE(importStocksJson, "JSON 导入成功")}
          onImportCsv={() => wrapIE(importStocksCsv, "CSV 导入成功")}
          onRestoreDb={() => wrapIE(restoreDatabase, "数据库恢复成功")}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
