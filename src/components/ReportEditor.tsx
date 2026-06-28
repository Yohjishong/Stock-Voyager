import { useState, useCallback } from "react";
import { Eye, Code2, ChevronLeft, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResearchReport, ReportFormData } from "../types/report";

interface Props {
  report?: ResearchReport | null;
  onSave: (data: ReportFormData) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

type EditorMode = "write" | "split" | "preview";

export default function ReportEditor({ report, onSave, onClose, saving }: Props) {
  const [form, setForm] = useState<ReportFormData>({
    title: report?.title ?? "",
    summary: report?.summary ?? "",
    content: report?.content ?? "",
    stock_symbols: report?.stock_symbols ?? "",
    tags: report?.tags ?? "",
  });
  const [mode, setMode] = useState<EditorMode>("split");

  const set = useCallback(<K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    if (!form.title.trim()) return;
    await onSave(form);
  }

  return (
    <div className="report-editor-page">
      {/* Top bar */}
      <div className="report-editor-topbar">
        <div className="report-editor-topbar-left">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
            <ChevronLeft size={13} />
            返回
          </button>
          <span className="report-editor-topbar-title">
            {report ? "编辑报告" : "新建调研报告"}
          </span>
        </div>
        <div className="report-editor-topbar-center">
          <div className="editor-mode-tabs">
            <button
              className={`editor-mode-tab ${mode === "write" ? "active" : ""}`}
              onClick={() => setMode("write")}
              title="编辑模式"
            >
              <Code2 size={12} />
              <span>编辑</span>
            </button>
            <button
              className={`editor-mode-tab ${mode === "split" ? "active" : ""}`}
              onClick={() => setMode("split")}
              title="分栏预览"
            >
              <span style={{ fontSize: 11, fontWeight: 700 }}>⊟</span>
              <span>分栏</span>
            </button>
            <button
              className={`editor-mode-tab ${mode === "preview" ? "active" : ""}`}
              onClick={() => setMode("preview")}
              title="预览模式"
            >
              <Eye size={12} />
              <span>预览</span>
            </button>
          </div>
        </div>
        <div className="report-editor-topbar-right">
          <button
            className="btn btn-primary btn-sm"
            style={{ minWidth: 80 }}
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
          >
            <Save size={12} />
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      {/* Meta fields */}
      <div className="report-editor-meta">
        <input
          className="report-editor-title-input"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="报告标题"
        />
        <div className="report-editor-meta-row">
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={form.stock_symbols}
            onChange={(e) => set("stock_symbols", e.target.value)}
            placeholder="关联股票代码，如 600519, 000858"
          />
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="标签，如 白酒, 消费"
          />
          <textarea
            className="form-textarea"
            style={{ flex: 2, minHeight: 36, resize: "none" }}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="摘要（选填）"
            rows={1}
          />
        </div>
      </div>

      {/* Editor panes */}
      <div className="editor-panes report-editor-panes" data-mode={mode}>
        {(mode === "write" || mode === "split") && (
          <div className="editor-pane editor-pane-write">
            <div className="editor-pane-label">Markdown</div>
            <textarea
              className="editor-raw"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder={"# 报告正文\n\n使用 Markdown 格式撰写..."}
              spellCheck={false}
            />
          </div>
        )}
        {(mode === "preview" || mode === "split") && (
          <div className="editor-pane editor-pane-preview">
            <div className="editor-pane-label">预览</div>
            <div className="editor-preview-content markdown-body">
              {form.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
              ) : (
                <span className="editor-preview-empty">尚无内容</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
