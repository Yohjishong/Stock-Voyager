import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  BarChart2,
  Settings,
  Database,
  Bot,
  FileSearch,
} from "lucide-react";
import { Stock, StockWithCalc } from "./types/stock";
import { calcStock, calcSummary } from "./lib/calculations";
import {
  listStocks,
  createStock,
  updateStock,
  deleteStock,
  refreshFundamentals,
  refreshPrices,
} from "./services/stockService";
import { createOperationRecord, sumDividendCashReceived } from "./services/operationRecordService";
import { TradePayload } from "./components/StockTradeDialog";
import {
  getCashCny,
  setCashCny,
  getInvestedCapitalCny,
  setInvestedCapitalCny,
} from "./services/settingsService";
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
import ImportExportPanel from "./components/ImportExportPanel";
import ConfirmDialog from "./components/ConfirmDialog";
import CashBalanceDialog from "./components/CashBalanceDialog";
import InvestedCapitalControl from "./components/InvestedCapitalControl";
import StockDetailPage from "./components/StockDetailPage";
import StockAgentPage from "./components/StockAgentPage";
import ResearchReportsPage from "./components/ResearchReportsPage";

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

type PageView = "portfolio" | "agent" | "reports";

// ===== App =====
export default function App() {
  const { toasts, show } = useToast();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [cash, setCash] = useState(0);
  const [investedCapital, setInvestedCapital] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState<PageView>("portfolio");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editStock, setEditStock] = useState<StockWithCalc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StockWithCalc | null>(null);
  const [showIE, setShowIE] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [dividendReceivedTotal, setDividendReceivedTotal] = useState(0);

  // Computed
  const stocksWithCalc: StockWithCalc[] = stocks.map(calcStock);
  const stats = calcSummary(
    stocksWithCalc,
    cash,
    investedCapital,
    dividendReceivedTotal
  );
  const detailStock = selectedStockId
    ? stocksWithCalc.find((s) => s.id === selectedStockId) ?? null
    : null;

  useEffect(() => {
    if (selectedStockId && !stocks.some((s) => s.id === selectedStockId)) {
      setSelectedStockId(null);
    }
  }, [stocks, selectedStockId]);

  async function loadData() {
    setLoading(true);
    try {
      const [stockList, cashVal, investedVal, divRecv] = await Promise.all([
        listStocks(),
        getCashCny(),
        getInvestedCapitalCny(),
        sumDividendCashReceived(),
      ]);
      setStocks(stockList);
      setCash(cashVal);
      setInvestedCapital(investedVal);
      setDividendReceivedTotal(Number.isFinite(divRecv) ? divRecv : 0);
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
      if (selectedStockId === deleteTarget.id) {
        setSelectedStockId(null);
      }
      show("股票已删除", "success");
    } catch (err) {
      show(`删除失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  async function handleSaveCashBalance(amount: number) {
    setActionLoading(true);
    try {
      await setCashCny(amount);
      setCash(amount);
      show("现金已更新", "success");
      setShowCashDialog(false);
    } catch (err) {
      show(`保存失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecharge(amount: number) {
    setActionLoading(true);
    try {
      const next = investedCapital + amount;
      await setInvestedCapitalCny(next);
      setInvestedCapital(next);
      show("已充值并增加投入资金", "success");
    } catch (err) {
      show(`操作失败: ${err}`, "error");
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWithdraw(amount: number) {
    setActionLoading(true);
    try {
      const next = Math.max(0, investedCapital - amount);
      await setInvestedCapitalCny(next);
      setInvestedCapital(next);
      show("已提现并减少投入资金", "success");
    } catch (err) {
      show(`操作失败: ${err}`, "error");
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  // ----- 交易操作 (做T / 减仓 / 加仓) -----
  async function handleTradeConfirm(stock: StockWithCalc, payload: TradePayload) {
    setActionLoading(true);
    try {
      const updated = await updateStock({
        ...stock,
        pe_ttm: stock.pe_ttm ?? 0,
        pb: stock.pb ?? 0,
        shares: payload.newShares,
        cost_price: payload.newCostPrice,
        updated_at: "",
      });
      setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      const label = payload.mode === "t_trade" ? "做T" : payload.mode === "reduce" ? "减仓" : "加仓";
      show(`${label}操作已保存`, "success");
      try {
        await createOperationRecord(payload.operationRecord);
      } catch (recErr) {
        show(`交易已保存, 但写入操作记录失败: ${recErr}`, "error");
      }
    } catch (err) {
      show(`操作失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFundamentalsRefresh() {
    setActionLoading(true);
    try {
      const result = await refreshFundamentals();
      await loadData();
      if (result.failed.length > 0) {
        show(`基本面已更新 ${result.updated} 只, ${result.failed.length} 只失败`, "error");
      } else {
        show(`基本面已更新 ${result.updated} 只`, "success");
      }
    } catch (err) {
      show(`基本面刷新失败: ${err}`, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePriceRefresh() {
    setActionLoading(true);
    try {
      const result = await refreshPrices();
      await loadData();
      if (result.failed.length > 0) {
        show(`股价已更新 ${result.updated} 只, ${result.failed.length} 只失败`, "error");
      } else {
        show(`股价已更新 ${result.updated} 只`, "success");
      }
    } catch (err) {
      show(`股价刷新失败: ${err}`, "error");
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

  const isDetail = page === "portfolio" && !!detailStock;

  function navigateTo(p: PageView) {
    setPage(p);
    if (p !== "portfolio") setSelectedStockId(null);
  }

  const topbarTitle = page === "agent"
    ? "Stock Agent"
    : page === "reports"
    ? "调研报告"
    : isDetail
    ? detailStock!.name
    : "股票池";

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">SV</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Stock Voyager</span>
            <span className="sidebar-brand-sub">Portfolio Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">主要功能</span>
          <button
            className={`sidebar-nav-item ${page === "portfolio" ? "active" : ""}`}
            onClick={() => navigateTo("portfolio")}
          >
            <BarChart2 size={15} />
            <span>股票池</span>
          </button>
          <button
            className={`sidebar-nav-item ${page === "agent" ? "active" : ""}`}
            onClick={() => navigateTo("agent")}
          >
            <Bot size={15} />
            <span>Stock Agent</span>
          </button>
          <button
            className={`sidebar-nav-item ${page === "reports" ? "active" : ""}`}
            onClick={() => navigateTo("reports")}
          >
            <FileSearch size={15} />
            <span>调研报告</span>
          </button>
          <button
            className="sidebar-nav-item"
            onClick={() => setShowIE(true)}
          >
            <Database size={15} />
            <span>导入导出</span>
          </button>

          <div className="sidebar-divider" />
          <span className="sidebar-section-label">账户</span>
          <button
            className="sidebar-nav-item"
            onClick={() => setShowCashDialog(true)}
          >
            <Settings size={15} />
            <span>资产设置</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <InvestedCapitalControl
            investedCapital={investedCapital}
            disabled={loading || actionLoading}
            saving={actionLoading}
            onRecharge={handleRecharge}
            onWithdraw={handleWithdraw}
          />
        </div>
      </aside>

      {/* Content */}
      <div className="app-content">
        {/* Top bar */}
        <header className="topbar">
          <span className="topbar-title">{topbarTitle}</span>
          <div className="topbar-actions">
            {page === "portfolio" && !isDetail && (
              <>
                <button
                  className="btn btn-ghost"
                  style={{ minWidth: 80 }}
                  onClick={handlePriceRefresh}
                  disabled={loading || actionLoading}
                  title="刷新股价"
                >
                  <RefreshCw size={13} className={actionLoading ? "spin" : ""} />
                  <span>股价</span>
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ minWidth: 88 }}
                  onClick={handleFundamentalsRefresh}
                  disabled={loading || actionLoading}
                  title="刷新基本面"
                >
                  <RefreshCw size={13} className={actionLoading ? "spin" : ""} />
                  <span>基本面</span>
                </button>
                <button className="btn btn-primary" style={{ minWidth: 84 }} onClick={openCreate}>
                  <Plus size={13} />
                  新增股票
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main */}
        <main className="main-content">
          {page === "agent" && <StockAgentPage stocks={stocksWithCalc} stats={stats} />}

          {page === "reports" && <ResearchReportsPage onToast={show} />}

          {page === "portfolio" && (
            detailStock ? (
              <StockDetailPage
                stock={detailStock}
                onBack={() => setSelectedStockId(null)}
                onToast={show}
                onStocksNeedReload={loadData}
              />
            ) : (
              <>
                <SummaryCards
                  stats={stats}
                  totalCount={stocks.length}
                  onTotalAssetsClick={() => setShowCashDialog(true)}
                />
                <StockTable
                  stocks={stocksWithCalc}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onOpenDetail={(s) => setSelectedStockId(s.id)}
                  onTradeConfirm={(stock, payload) => handleTradeConfirm(stock, payload)}
                  tradeLoading={actionLoading}
                />
              </>
            )
          )}
        </main>
      </div>

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

      {showCashDialog && (
        <CashBalanceDialog
          cash={cash}
          marketValue={stats.total_market_value}
          onSave={handleSaveCashBalance}
          onClose={() => setShowCashDialog(false)}
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
