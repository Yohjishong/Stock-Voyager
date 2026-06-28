import { useState, useEffect, useCallback } from "react";
import { Plus, Search, ChevronLeft, Trash2, Edit2, FileText, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResearchReport, ReportFormData } from "../types/report";
import { listReports, createReport, updateReport, deleteReport } from "../services/reportService";
import ReportEditor from "./ReportEditor";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type View = "list" | "detail" | "edit";

function parseSymbols(s: string): string[] {
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

function parseTags(s: string): string[] {
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export default function ResearchReportsPage({ onToast }: Props) {
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");

  const [view, setView] = useState<View>("list");
  const [detailReport, setDetailReport] = useState<ResearchReport | null>(null);
  const [editTarget, setEditTarget] = useState<ResearchReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResearchReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReports();
      setReports(data);
    } catch (err) {
      onToast(`加载报告失败: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.stock_symbols.toLowerCase().includes(q) ||
      r.tags.toLowerCase().includes(q);
    const matchSymbol = !filterSymbol ||
      parseSymbols(r.stock_symbols).some((s) => s.toLowerCase().includes(filterSymbol.toLowerCase()));
    return matchSearch && matchSymbol;
  });

  // Collect all unique symbols for quick-filter chips
  const allSymbols = Array.from(
    new Set(reports.flatMap((r) => parseSymbols(r.stock_symbols)))
  ).slice(0, 12);

  async function handleSave(data: ReportFormData) {
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateReport(editTarget.id, data);
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        if (detailReport?.id === updated.id) setDetailReport(updated);
        onToast("报告已更新", "success");
        setView("detail");
      } else {
        const created = await createReport(data);
        setReports((prev) => [created, ...prev]);
        onToast("报告已新增", "success");
        setDetailReport(created);
        setView("detail");
      }
      setEditTarget(null);
    } catch (err) {
      onToast(`保存失败: ${err}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteReport(deleteTarget.id);
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (detailReport?.id === deleteTarget.id) {
        setView("list");
        setDetailReport(null);
      }
      onToast("报告已删除", "success");
    } catch (err) {
      onToast(`删除失败: ${err}`, "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  function openCreate() {
    setEditTarget(null);
    setView("edit");
  }

  function openEdit(report: ResearchReport, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(report);
    setView("edit");
  }

  function openDetail(report: ResearchReport) {
    setDetailReport(report);
    setView("detail");
  }

  // ===== Edit view =====
  if (view === "edit") {
    return (
      <ReportEditor
        report={editTarget}
        onSave={handleSave}
        onClose={() => {
          setEditTarget(null);
          setView(detailReport ? "detail" : "list");
        }}
        saving={saving}
      />
    );
  }

  // ===== Detail view =====
  if (view === "detail" && detailReport) {
    return (
      <div className="report-page">
        <div className="report-detail-header">
          <button className="btn btn-ghost btn-sm" onClick={() => { setView("list"); setDetailReport(null); }}>
            <ChevronLeft size={13} />
            返回列表
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={(e) => openEdit(detailReport, e)}>
              <Edit2 size={12} />
              编辑
            </button>
            <button className="btn btn-danger btn-sm" style={{ minWidth: 56 }} onClick={() => setDeleteTarget(detailReport)}>
              <Trash2 size={12} />
              删除
            </button>
          </div>
        </div>

        <div className="report-detail-content">
          <h1 className="report-detail-title">{detailReport.title}</h1>
          {detailReport.summary && (
            <p className="report-detail-summary">{detailReport.summary}</p>
          )}
          <div className="report-detail-meta">
            {parseSymbols(detailReport.stock_symbols).map((s) => (
              <span key={s} className="report-badge report-badge-symbol">{s}</span>
            ))}
            {parseTags(detailReport.tags).map((t) => (
              <span key={t} className="report-badge report-badge-tag"><Tag size={9} /> {t}</span>
            ))}
            <span className="report-detail-date">{formatDate(detailReport.updated_at)}</span>
          </div>
          <div className="report-body markdown-body">
            {detailReport.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailReport.content}</ReactMarkdown>
            ) : (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <p className="empty-state-text">暂无内容</p>
              </div>
            )}
          </div>
        </div>

        {deleteTarget && (
          <ConfirmDialog
            title="删除报告"
            message={`确定要删除「${deleteTarget.title}」吗？`}
            confirmLabel="删除"
            danger
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    );
  }

  // ===== List view =====
  return (
    <div className="report-page">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
            <input
              className="search-input"
              style={{ paddingLeft: 28 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题、股票、标签…"
            />
          </div>
          {allSymbols.length > 0 && (
            <div className="report-symbol-chips">
              <button
                className={`report-chip ${!filterSymbol ? "active" : ""}`}
                onClick={() => setFilterSymbol("")}
              >
                全部
              </button>
              {allSymbols.map((s) => (
                <button
                  key={s}
                  className={`report-chip ${filterSymbol === s ? "active" : ""}`}
                  onClick={() => setFilterSymbol(filterSymbol === s ? "" : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="table-toolbar-count">{filtered.length} 篇</span>
        <button className="btn btn-primary btn-sm" style={{ minWidth: 84 }} onClick={openCreate}>
          <Plus size={12} />
          新建报告
        </button>
      </div>

      {/* Cards */}
      <div className="report-list">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="report-card skeleton-card" />
          ))
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 240 }}>
            <FileText size={28} style={{ color: "var(--color-text-muted)", marginBottom: 10 }} />
            <p className="empty-state-title">{search || filterSymbol ? "未找到匹配的报告" : "暂无调研报告"}</p>
            <p className="empty-state-text">{search || filterSymbol ? "换个关键词试试" : "点击「新建报告」开始撰写"}</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="report-card" onClick={() => openDetail(r)}>
              <div className="report-card-header">
                <h3 className="report-card-title">{r.title}</h3>
                <div className="report-card-actions">
                  <button className="btn-icon edit" onClick={(e) => openEdit(r, e)} title="编辑">
                    <Edit2 size={12} />
                  </button>
                  <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} title="删除">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {r.summary && <p className="report-card-summary">{r.summary}</p>}
              <div className="report-card-footer">
                <div className="report-card-tags">
                  {parseSymbols(r.stock_symbols).map((s) => (
                    <span key={s} className="report-badge report-badge-symbol">{s}</span>
                  ))}
                  {parseTags(r.tags).map((t) => (
                    <span key={t} className="report-badge report-badge-tag"><Tag size={9} /> {t}</span>
                  ))}
                </div>
                <span className="report-card-date">{formatDate(r.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="删除报告"
          message={`确定要删除「${deleteTarget.title}」吗？`}
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
