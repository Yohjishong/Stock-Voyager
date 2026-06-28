import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Send, Settings, Loader2, Bot, User, Trash2, AlertCircle,
  Plus, MessageSquare, Edit2, Check, X as XIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StockWithCalc, SummaryStats } from "../types/stock";

interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

interface LLMProfile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

const DEFAULT_PROFILES: LLMProfile[] = [
  { id: "openai", name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", apiKey: "", model: "gpt-4o-mini" },
  { id: "deepseek", name: "DeepSeek", endpoint: "https://api.deepseek.com/v1/chat/completions", apiKey: "", model: "deepseek-chat" },
];

function loadProfiles(): LLMProfile[] {
  try {
    const raw = localStorage.getItem("sv_llm_profiles");
    if (raw) {
      const parsed = JSON.parse(raw) as LLMProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_PROFILES;
}

function saveProfiles(profiles: LLMProfile[]) {
  localStorage.setItem("sv_llm_profiles", JSON.stringify(profiles));
}

function loadActiveProfileId(): string {
  return localStorage.getItem("sv_llm_active_profile") ?? "";
}

function saveActiveProfileId(id: string) {
  localStorage.setItem("sv_llm_active_profile", id);
}

function profileToConfig(p: LLMProfile): LLMConfig {
  return { endpoint: p.endpoint, apiKey: p.apiKey, model: p.model };
}

type ContextMode = "none" | "basic" | "full";

function fmt(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + "万";
  return n.toFixed(2);
}
function pct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

function buildPortfolioContext(stocks: StockWithCalc[], stats: SummaryStats, mode: ContextMode): string {
  if (mode === "none" || stocks.length === 0) return "";

  let ctx = `## 当前持仓概览
总资产: ${fmt(stats.total_assets)} 元，总市值: ${fmt(stats.total_market_value)} 元
现金: ${fmt(stats.cash)} 元，累计投入: ${fmt(stats.invested_capital)} 元
总收益: ${fmt(stats.total_return)} 元 (${pct(stats.total_return_pct)})，当日浮动: ${fmt(stats.total_day_change)} 元

## 持仓明细\n`;

  if (mode === "basic") {
    ctx += stocks.map((s) =>
      `- ${s.name}(${s.symbol}) [${s.market}] 股价:${s.current_price} 成本:${s.cost_price} 持仓:${s.shares}股 市值:${fmt(s.market_value)} 盈亏:${fmt(s.profit_loss)}(${pct(s.profit_loss_pct)})`
    ).join("\n");
  } else {
    ctx += stocks.map((s) =>
      `- ${s.name}(${s.symbol}) [${s.market}] 股价:${s.current_price} 成本:${s.cost_price} 持仓:${s.shares}股 市值:${fmt(s.market_value)} 盈亏:${fmt(s.profit_loss)}(${pct(s.profit_loss_pct)}) PE_TTM:${s.pe_ttm ?? "N/A"} PB:${s.pb ?? "N/A"} ROE:${s.roe ? pct(s.roe) : "N/A"} 股息率:${pct(s.dividend_yield_pct)}`
    ).join("\n");
  }
  return ctx;
}

const SYSTEM_PROMPT = `你是 Stock Voyager 的智能投资助手。你能帮助用户分析股票、解读财务指标、讨论投资策略。
你可以回答关于投资组合、估值方法（PE、PB、DCF）、财务报表分析等问题。
请保持专业简洁，中文回复，关键数字加粗。`;

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AgentMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

interface Props {
  stocks: StockWithCalc[];
  stats: SummaryStats;
}

export default function StockAgentPage({ stocks, stats }: Props) {
  const [profiles, setProfiles] = useState<LLMProfile[]>(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const id = loadActiveProfileId();
    const loaded = loadProfiles();
    return loaded.find((p) => p.id === id) ? id : (loaded[0]?.id ?? "");
  });
  const [showConfig, setShowConfig] = useState(false);
  const [profileDraft, setProfileDraft] = useState<LLMProfile | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [showNewProfile, setShowNewProfile] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const config: LLMConfig = activeProfile ? profileToConfig(activeProfile) : { endpoint: "", apiKey: "", model: "" };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convLoading, setConvLoading] = useState(true);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [contextMode, setContextMode] = useState<ContextMode>("basic");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (editingConvId) editInputRef.current?.focus();
  }, [editingConvId]);

  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const list = await invoke<Conversation[]>("list_agent_conversations");
      setConversations(list);
    } catch {
      // ignore
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function selectConversation(convId: string) {
    if (convId === activeConvId) return;
    setActiveConvId(convId);
    setError(null);
    setMessages([]);
    try {
      const msgs = await invoke<AgentMessage[]>("list_agent_messages", { conversationId: convId });
      setMessages(msgs);
    } catch (e) {
      setError(String(e));
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function createNewConversation() {
    try {
      const conv = await invoke<Conversation>("create_agent_conversation", { title: "新对话" });
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await invoke("delete_agent_conversation", { id });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch {
      // ignore
    }
  }

  function startEditTitle(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  }

  async function saveTitle(id: string) {
    const trimmed = editingTitle.trim() || "新对话";
    try {
      await invoke("update_agent_conversation_title", { id, title: trimmed });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
      );
    } catch {
      // ignore
    } finally {
      setEditingConvId(null);
    }
  }

  function selectProfile(id: string) {
    setActiveProfileId(id);
    saveActiveProfileId(id);
    const p = profiles.find((x) => x.id === id);
    if (p) setProfileDraft({ ...p });
  }

  function openConfig() {
    const p = activeProfile ?? profiles[0];
    setProfileDraft(p ? { ...p } : null);
    setShowNewProfile(false);
    setShowConfig(!showConfig);
  }

  function saveProfileDraft() {
    if (!profileDraft) return;
    const updated = profiles.map((p) => (p.id === profileDraft.id ? profileDraft : p));
    setProfiles(updated);
    saveProfiles(updated);
    if (activeProfileId !== profileDraft.id) {
      setActiveProfileId(profileDraft.id);
      saveActiveProfileId(profileDraft.id);
    }
    setShowConfig(false);
  }

  function addNewProfile() {
    const name = newProfileName.trim() || "新配置";
    const id = `profile-${Date.now()}`;
    const newP: LLMProfile = { id, name, endpoint: "", apiKey: "", model: "" };
    const updated = [...profiles, newP];
    setProfiles(updated);
    saveProfiles(updated);
    setActiveProfileId(id);
    saveActiveProfileId(id);
    setProfileDraft({ ...newP });
    setNewProfileName("");
    setShowNewProfile(false);
  }

  function deleteProfile(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (profiles.length <= 1) return;
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    saveProfiles(updated);
    if (activeProfileId === id) {
      const next = updated[0].id;
      setActiveProfileId(next);
      saveActiveProfileId(next);
      setProfileDraft({ ...updated[0] });
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    if (!config.apiKey) {
      setError("请先配置 API Key");
      setShowConfig(true);
      return;
    }

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await invoke<Conversation>("create_agent_conversation", { title: "新对话" });
        setConversations((prev) => [conv, ...prev]);
        setActiveConvId(conv.id);
        convId = conv.id;
      } catch (e) {
        setError(String(e));
        return;
      }
    }

    const now = new Date().toISOString();
    const tempUserMsg: AgentMessage = {
      id: `tmp-user-${Date.now()}`,
      conversation_id: convId,
      role: "user",
      content: text,
      created_at: now,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const history = [...messages, tempUserMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const savedUser = await invoke<AgentMessage>("append_agent_message", {
        conversationId: convId,
        role: "user",
        content: text,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempUserMsg.id ? savedUser : m))
      );

      // 自动设置标题（第一条消息）
      if (messages.length === 0) {
        const title = text.length > 20 ? text.slice(0, 20) + "…" : text;
        invoke("update_agent_conversation_title", { id: convId, title }).then(() => {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, title } : c))
          );
        });
      }

      const portfolioCtx = buildPortfolioContext(stocks, stats, contextMode);
      const systemContent = portfolioCtx
        ? `${SYSTEM_PROMPT}\n\n${portfolioCtx}`
        : SYSTEM_PROMPT;

      const reply = await invoke<string>("chat_completion", {
        req: {
          endpoint: config.endpoint,
          api_key: config.apiKey,
          model: config.model,
          messages: [{ role: "system", content: systemContent }, ...history],
        },
      });

      const savedAssist = await invoke<AgentMessage>("append_agent_message", {
        conversationId: convId,
        role: "assistant",
        content: reply,
      });
      setMessages((prev) => [...prev, savedAssist]);

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, updated_at: savedAssist.created_at } : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="agent-layout">
      {/* Conversation sidebar */}
      <div className="agent-sidebar">
        <div className="agent-sidebar-header">
          <span className="agent-sidebar-title">对话列表</span>
          <button className="btn btn-ghost btn-sm" onClick={createNewConversation} title="新建对话">
            <Plus size={13} />
          </button>
        </div>

        <div className="agent-conv-list">
          {convLoading ? (
            <div className="agent-conv-loading">
              <Loader2 size={14} className="spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="agent-conv-empty">点击 + 开始新对话</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`agent-conv-item ${conv.id === activeConvId ? "active" : ""}`}
                onClick={() => selectConversation(conv.id)}
              >
                <MessageSquare size={12} className="agent-conv-icon" />
                {editingConvId === conv.id ? (
                  <div className="agent-conv-edit" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      className="agent-conv-edit-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(conv.id);
                        if (e.key === "Escape") setEditingConvId(null);
                      }}
                    />
                    <button className="agent-conv-edit-btn" onClick={() => saveTitle(conv.id)}>
                      <Check size={11} />
                    </button>
                    <button className="agent-conv-edit-btn" onClick={() => setEditingConvId(null)}>
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="agent-conv-info">
                      <span className="agent-conv-name">{conv.title}</span>
                      <span className="agent-conv-date">{formatDate(conv.updated_at)}</span>
                    </div>
                    <div className="agent-conv-actions">
                      <button
                        className="agent-conv-action-btn"
                        onClick={(e) => startEditTitle(conv, e)}
                        title="重命名"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        className="agent-conv-action-btn danger"
                        onClick={(e) => deleteConversation(conv.id, e)}
                        title="删除"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat main area */}
      <div className="agent-page">
        {/* Header */}
        <div className="agent-header">
          <div className="agent-header-left">
            <Bot size={16} style={{ color: "var(--color-text-muted)" }} />
            <span className="agent-header-title">
              {activeConv ? activeConv.title : "Stock Agent"}
            </span>
            <span className="agent-header-sub">智能投资助手</span>
          </div>
          <div className="agent-header-actions">
            <button
              className={`btn btn-ghost btn-sm ${showConfig ? "active" : ""}`}
              onClick={openConfig}
            >
              <Settings size={12} />
              API 配置
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="agent-config-panel">
            {/* Profile selector row */}
            <div className="agent-profile-row">
              <span className="agent-profile-label">配置方案</span>
              <div className="agent-profile-list">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`agent-profile-chip ${p.id === (profileDraft?.id ?? activeProfileId) ? "active" : ""}`}
                    onClick={() => {
                      setActiveProfileId(p.id);
                      saveActiveProfileId(p.id);
                      setProfileDraft({ ...p });
                    }}
                  >
                    <span>{p.name}</span>
                    {profiles.length > 1 && (
                      <button
                        className="agent-profile-del"
                        onClick={(e) => deleteProfile(p.id, e)}
                        title="删除此配置"
                      >
                        <XIcon size={9} />
                      </button>
                    )}
                  </div>
                ))}
                {showNewProfile ? (
                  <div className="agent-profile-new-row">
                    <input
                      className="agent-profile-new-input"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="配置名称"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addNewProfile();
                        if (e.key === "Escape") setShowNewProfile(false);
                      }}
                      autoFocus
                    />
                    <button className="agent-conv-edit-btn" onClick={addNewProfile}><Check size={11} /></button>
                    <button className="agent-conv-edit-btn" onClick={() => setShowNewProfile(false)}><XIcon size={11} /></button>
                  </div>
                ) : (
                  <button className="agent-profile-add" onClick={() => setShowNewProfile(true)} title="新建配置">
                    <Plus size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Fields for selected profile */}
            {profileDraft && (
              <>
                <div className="agent-config-grid">
                  <div className="form-group">
                    <label className="form-label">配置名称</label>
                    <input
                      className="form-input"
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft((d) => d ? { ...d, name: e.target.value } : d)}
                      placeholder="例如: 我的 GPT"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input
                      className="form-input"
                      value={profileDraft.model}
                      onChange={(e) => setProfileDraft((d) => d ? { ...d, model: e.target.value } : d)}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">API Endpoint</label>
                    <input
                      className="form-input"
                      value={profileDraft.endpoint}
                      onChange={(e) => setProfileDraft((d) => d ? { ...d, endpoint: e.target.value } : d)}
                      placeholder="https://api.openai.com/v1/chat/completions"
                    />
                    <div className="agent-config-endpoint-hint">
                      快速填入：
                      {[
                        ["OpenAI", "https://api.openai.com/v1/chat/completions"],
                        ["DeepSeek", "https://api.deepseek.com/v1/chat/completions"],
                        ["火山引擎", "https://ark.cn-beijing.volces.com/api/v3/chat/completions"],
                      ].map(([label, url]) => (
                        <button
                          key={label}
                          className="agent-endpoint-preset"
                          onClick={() => setProfileDraft((d) => d ? { ...d, endpoint: url } : d)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">API Key</label>
                    <input
                      className="form-input"
                      type="password"
                      value={profileDraft.apiKey}
                      onChange={(e) => setProfileDraft((d) => d ? { ...d, apiKey: e.target.value } : d)}
                      placeholder="sk-..."
                    />
                  </div>
                </div>
                <div className="agent-config-footer">
                  <span className="agent-config-hint">配置保存在本地 localStorage</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ minWidth: 56 }} onClick={() => setShowConfig(false)}>取消</button>
                    <button className="btn btn-primary btn-sm" style={{ minWidth: 56 }} onClick={saveProfileDraft}>保存</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="agent-messages">
          {messages.length === 0 && !loading && (
            <div className="agent-empty">
              <Bot size={32} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
              <div className="agent-empty-title">Stock Agent 待命中</div>
              <div className="agent-empty-sub">
                可以询问股票分析、财务指标解读、投资组合建议等问题
              </div>
              <div className="agent-suggestions">
                {["帮我分析一下 PE 和 PB 的投资意义", "如何判断一只股票是否被低估？", "解释一下 ROE 对估值的影响"].map((s) => (
                  <button key={s} className="agent-suggestion-chip" onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`agent-msg agent-msg-${msg.role}`}>
              <div className="agent-msg-avatar">
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className="agent-msg-body">
                <div className="agent-msg-content">
                  {msg.role === "assistant" ? (
                    <div className="markdown-body agent-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="agent-msg-time">{formatTime(msg.created_at)}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="agent-msg agent-msg-assistant">
              <div className="agent-msg-avatar">
                <Bot size={13} />
              </div>
              <div className="agent-msg-body">
                <div className="agent-msg-thinking">
                  <Loader2 size={12} className="spin" />
                  <span>思考中…</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="agent-error">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Context mode toggle */}
        <div className="agent-context-bar">
          <span className="agent-context-label">持仓数据：</span>
          {([
            ["none", "不注入"],
            ["basic", "基础持仓"],
            ["full", "完整持仓"],
          ] as [ContextMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              className={`agent-context-btn ${contextMode === mode ? "active" : ""}`}
              onClick={() => setContextMode(mode)}
            >
              {label}
            </button>
          ))}
          {contextMode !== "none" && stocks.length > 0 && (
            <span className="agent-context-count">{stocks.length} 只股票已就绪</span>
          )}
          {contextMode !== "none" && stocks.length === 0 && (
            <span className="agent-context-count empty">暂无持仓</span>
          )}
        </div>

        {/* Input */}
        <div className="agent-input-bar">
          <div className="agent-input-wrap">
            <textarea
              ref={inputRef}
              className="agent-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，Enter 发送，Shift+Enter 换行"
              rows={1}
              disabled={loading}
            />
            <button
              className="agent-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            </button>
          </div>
          <div className="agent-input-hint">
            {activeProfile?.name ?? "未配置"} · {config.model} · {config.endpoint.replace(/https?:\/\//, "").split("/")[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
