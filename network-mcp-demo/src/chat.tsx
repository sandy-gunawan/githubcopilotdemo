import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  PlugZap,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { SUGGESTED_QUESTIONS } from "../shared/schemas";
import type { AgentStatus, ChatResponse, ToolTrace } from "../shared/schemas";
import { ApiError, codecs, deleteConversation, errorMessage, request, useRemote } from "./api";
import { ErrorState, formatDate, JsonBlock, Loading, Modal, Notice } from "./ui";

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  traces: ToolTrace[];
  timestamp: string;
  provider?: ChatResponse["provider"];
  retryPrompt?: string;
}

export interface ChatPrompt {
  text: string;
  revision: number;
}

function ProviderHint() {
  return <p className="provider-login-hint"><Terminal size={14} /><span>Periksa login GitHub Copilot pada <strong>host backend</strong> dan akses akun/model, lalu hubungkan lagi. Tidak perlu memasukkan token di browser.</span></p>;
}

function TraceList({ traces }: { traces: ToolTrace[] }) {
  if (!traces.length) return null;
  return <details className="tool-traces">
    <summary><Wrench size={14} /><span>{traces.length} tool trace · lihat bukti</span><ChevronDown size={14} /></summary>
    <div className="trace-list">{traces.map((trace) => {
      const duration = trace.completedAt ? new Date(trace.completedAt).getTime() - new Date(trace.startedAt).getTime() : undefined;
      return <details className="trace-item" key={trace.id}>
        <summary><span className={`trace-status ${trace.success === true ? "text-teal" : trace.success === false ? "text-red" : "text-muted"}`}>{trace.success === true ? <CheckCircle2 size={13} /> : trace.success === false ? <CircleAlert size={13} /> : <Wrench size={13} />}</span><code>{trace.tool}</code><ChevronDown size={13} /></summary>
        <div className="trace-body"><p className="small muted">{formatDate(trace.startedAt)}{duration !== undefined && Number.isFinite(duration) && duration >= 0 ? ` · ${duration} ms` : ""}</p><p className="small">{trace.success === true ? "Berhasil" : trace.success === false ? "Tool melaporkan gagal" : "Status akhir tidak disediakan backend"}</p><JsonBlock label="ARGUMENTS · RAW" value={trace.arguments} /><JsonBlock label="RESULT · RAW" value={trace.result} /></div>
      </details>;
    })}</div>
  </details>;
}

export function AgentPanel({ open, onClose, prompt, onDataChanged }: {
  open: boolean;
  onClose: () => void;
  prompt: ChatPrompt;
  onDataChanged: () => void;
}) {
  const statusResource = useRemote("/api/agent/status", codecs.agent);
  const [connected, setConnected] = useState<AgentStatus>();
  const [providerError, setProviderError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendLock = useRef(false);
  const connectLock = useRef(false);
  const clearLock = useRef(false);
  const appliedPrompt = useRef(0);
  const provider = connected ?? statusResource.data;
  const available = provider?.status === "ready";
  const canSend = available && !busy && !connecting && !clearing;

  useEffect(() => {
    if (prompt.revision && appliedPrompt.current !== prompt.revision) {
      appliedPrompt.current = prompt.revision;
      setInput(prompt.text);
    }
    if (open) inputRef.current?.focus();
  }, [prompt, open]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function connect() {
    if (connectLock.current || sendLock.current || clearLock.current) return;
    connectLock.current = true;
    setConnecting(true);
    setProviderError(null);
    try {
      const result = await request("/api/agent/connect", codecs.agent, { method: "POST", body: {}, timeoutMs: 135_000 });
      setConnected(result);
      if (result.status === "ready") inputRef.current?.focus();
    } catch (failure) {
      setProviderError(errorMessage(failure));
      setConnected(undefined);
      statusResource.reload();
    } finally {
      connectLock.current = false;
      setConnecting(false);
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || !available || sendLock.current || connectLock.current || clearLock.current) return;
    sendLock.current = true;
    setBusy(true);
    setElapsed(0);
    setInput("");
    setMessages((current) => [...current, {
      id: crypto.randomUUID(), role: "user", content: message, traces: [], timestamp: new Date().toISOString(),
    }]);
    try {
      const result = await request("/api/chat", codecs.chat, {
        method: "POST",
        body: conversationId ? { message, conversationId } : { message },
        timeoutMs: 135_000,
      });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant", content: result.content,
        traces: result.traces, provider: result.provider, timestamp: new Date().toISOString(),
      }]);
      onDataChanged();
    } catch (failure) {
      const traces = failure instanceof ApiError ? failure.traces : [];
      if (failure instanceof ApiError && failure.conversationId) setConversationId(failure.conversationId);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "error", content: errorMessage(failure),
        traces, timestamp: new Date().toISOString(), retryPrompt: message,
      }]);
      setConnected(undefined);
      statusResource.reload();
      onDataChanged();
    } finally {
      sendLock.current = false;
      setBusy(false);
    }
  }

  async function clearConversation() {
    if (clearLock.current || sendLock.current || connectLock.current) return;
    clearLock.current = true;
    setClearing(true);
    setClearError(null);
    try {
      if (conversationId) await deleteConversation(conversationId);
      setMessages([]);
      setConversationId(undefined);
      setInput("");
      setConfirmClear(false);
    } catch (failure) {
      setClearError(errorMessage(failure));
    } finally {
      clearLock.current = false;
      setClearing(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) void send(input);
  }

  function retryMessage(message: Message) {
    if (!message.retryPrompt) return;
    if (available) void send(message.retryPrompt);
    else {
      setInput(message.retryPrompt);
      void connect();
    }
  }

  return <aside id="copilot-panel" className="assistant-panel" hidden={!open} aria-label="Asisten GitHub Copilot">
    <header className="assistant-header"><span className="assistant-logo"><Sparkles size={20} /></span><div><h2>Copilot assistant</h2><p><Terminal size={12} />GitHub Copilot SDK</p></div><div className="inline-gap"><button className="icon-button" disabled={busy || connecting || clearing || !messages.length} aria-label="Hapus percakapan dan mulai baru" onClick={() => { setClearError(null); setConfirmClear(true); }}><RotateCcw size={17} /></button><button className="icon-button" aria-label="Tutup panel Copilot" onClick={onClose}><X size={20} /></button></div></header>
    <section className="provider-card" aria-label="Status provider">
      <div className="provider-topline"><span className={`provider-state ${available ? "text-teal" : provider?.status === "unavailable" ? "text-red" : "text-amber"}`}><span className="status-dot" />{connecting ? "Menghubungkan…" : available ? "Provider terhubung" : provider?.status === "unavailable" ? "Provider tidak tersedia" : "Belum terhubung"}</span><button className="icon-button" disabled={connecting || busy} aria-label="Periksa ulang status provider" onClick={() => { setConnected(undefined); statusResource.reload(); }}><RefreshCw size={13} className={statusResource.loading ? "spin" : ""} /></button></div>
      {statusResource.loading && !provider && <Loading label="Memeriksa status SDK…" />}
      {provider && <><p className="provider-model"><span>Model</span><code>{provider.model || "Belum ditentukan backend"}</code></p><p className="provider-message">{provider.message}</p></>}
      {statusResource.error && <ErrorState message={statusResource.error} retry={statusResource.reload} />}
      {providerError && <Notice tone="error" title="Koneksi provider gagal">{providerError}</Notice>}
      {(!available || providerError) && <ProviderHint />}
      <button className={`button button-small ${available ? "button-ghost" : "button-primary"}`} disabled={connecting || busy || clearing} onClick={() => void connect()}>{connecting ? <LoaderCircle size={14} className="spin" /> : <PlugZap size={14} />}{connecting ? "Menunggu provider…" : available ? "Hubungkan ulang" : provider?.status === "unavailable" || providerError ? "Coba hubungkan lagi" : "Hubungkan Copilot"}{!connecting && <ExternalLink size={12} />}</button>
    </section>
    <div className="chat-scroll" ref={scrollRef}>
      {!messages.length && <div className="chat-welcome"><span className="chat-welcome-icon"><Bot size={31} /></span><p className="eyebrow">YOUR INVESTIGATION PARTNER</p><h3>Dari gejala<br />ke bukti.</h3><p>Tanyakan kondisi jaringan. Copilot mengambil konteks melalui tool MCP dan sumber pengetahuan.</p><span className="badge badge-subtle"><ShieldCheck size={11} />Approval tetap di tangan Anda</span></div>}
      {messages.length > 0 && <div className="chat-messages" role="log" aria-label="Percakapan dengan Copilot" aria-live="polite" aria-relevant="additions">{messages.map((message) => <article key={message.id} className={`chat-message message-${message.role}`}>
        <div className="message-author"><span className="message-avatar">{message.role === "user" ? <UserRound size={13} /> : message.role === "error" ? <CircleAlert size={14} /> : <Sparkles size={13} />}</span><strong>{message.role === "user" ? "Anda" : message.role === "error" ? "Permintaan gagal" : "Copilot"}</strong><time dateTime={message.timestamp}>{new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.timestamp))}</time></div>
        {message.content ? <div className="message-content">{message.content}</div> : <Notice tone="warning">Provider mengembalikan konten kosong. Periksa trace atau kirim pertanyaan baru.</Notice>}
        {message.role === "error" && <><ProviderHint /><p className="small muted">Tool mungkin sudah berjalan sebelum error. Periksa trace dan antrean perubahan sebelum mengulang.</p><button className="button button-small button-secondary" disabled={busy || connecting || clearing} onClick={() => retryMessage(message)}><RefreshCw size={13} />{available ? "Coba lagi" : "Hubungkan & siapkan ulang"}</button></>}
        {message.provider && <span className="message-provider">{message.provider} · respons backend</span>}
        <TraceList traces={message.traces} />
      </article>)}</div>}
      {busy && <div className="chat-pending" role="status"><LoaderCircle size={18} className="spin" /><div><strong>Copilot sedang memproses…</strong><p>Menunggu respons dan tool backend · {elapsed} detik</p><span>Dapat memerlukan hingga 120 detik. Tidak ada jawaban simulasi.</span></div></div>}
      <details className="chat-suggestions" open={!messages.length}>
        <summary><Sparkles size={13} />{messages.length ? "Coba pertanyaan lain" : "Mulai dengan pertanyaan"}<ChevronDown size={14} /></summary>
        <div>{SUGGESTED_QUESTIONS.map((question) => <button key={question} disabled={busy || connecting || clearing} onClick={() => { setInput(question); inputRef.current?.focus(); }}><span>{question}</span><ArrowUp size={13} /></button>)}</div>
      </details>
    </div>
    <footer className="chat-composer">
      <form onSubmit={submit}><label className="sr-only" htmlFor="chat-message-input">Pertanyaan untuk Copilot</label><textarea id="chat-message-input" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} disabled={busy || clearing} placeholder={available ? "Tanyakan tentang jaringan…" : "Siapkan pertanyaan, lalu hubungkan Copilot…"} rows={3} onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (canSend) void send(input);
        }
      }} /><div className="composer-bottom"><span><span className="status-dot" />{conversationId ? "Sesi aktif" : "Percakapan baru"}<span className="composer-key">Shift + Enter ↵</span></span><button type="submit" className="send-button" disabled={!canSend || !input.trim()} aria-label={busy ? "Menunggu jawaban Copilot" : "Kirim pertanyaan ke Copilot"}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button></div></form>
      <p className="chat-disclaimer">AI dapat keliru. Verifikasi sumber & trace. Jangan masukkan secret. Data jaringan: <strong>SIMULATION</strong>.</p>
    </footer>
    {confirmClear && <Modal title="Hapus percakapan ini?" subtitle="Pesan dan konteks sesi Copilot akan dibersihkan" onClose={() => setConfirmClear(false)} busy={clearing} className="small-dialog"><div className="page-stack"><Notice>Pembersihan percakapan tidak membatalkan change request yang sudah diajukan dan tidak mereset dataset jaringan.</Notice>{clearError && <Notice tone="error">{clearError}</Notice>}<div className="modal-actions"><button className="button button-ghost" disabled={clearing} onClick={() => setConfirmClear(false)}>Batal</button><button className="button button-danger" disabled={clearing} onClick={() => void clearConversation()}>{clearing ? <LoaderCircle size={15} className="spin" /> : <RotateCcw size={15} />}{clearing ? "Membersihkan…" : "Hapus & mulai baru"}</button></div></div></Modal>}
  </aside>;
}
