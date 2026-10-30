import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Command,
  FlaskConical,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquare,
  Network,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { codecs, useRemote } from "./api";
import { AgentPanel } from "./chat";
import type { ChatPrompt } from "./chat";
import { ChangeDialog, ChangesPage, ResetDialog } from "./changes";
import type { EditorTarget } from "./changes";
import { AuditPage, DocumentReader, GuidePage, KnowledgePage } from "./knowledge";
import { DashboardPage, DeviceDrawer, InventoryPage, TopologyPage } from "./network";
import { ErrorState, formatDate, SimulationBadge } from "./ui";

type Page = "dashboard" | "topology" | "inventory" | "knowledge" | "changes" | "audit" | "guide";
interface NavItem { id: Page; label: string; icon: LucideIcon; }
const navItems: NavItem[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "topology", label: "Topologi", icon: Network },
  { id: "inventory", label: "Inventaris", icon: Server },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "changes", label: "Perubahan", icon: GitPullRequest },
  { id: "audit", label: "Audit trail", icon: ListChecks },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [revision, setRevision] = useState(0);
  const [chatOpen, setChatOpen] = useState(() => window.matchMedia("(min-width: 1500px)").matches);
  const [chatPrompt, setChatPrompt] = useState<ChatPrompt>({ text: "", revision: 0 });
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [inventorySite, setInventorySite] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const health = useRemote("/api/health", codecs.health, revision);
  const overview = useRemote("/api/overview", codecs.overview, revision);
  const sites = useRemote("/api/sites", codecs.sites, revision);
  const changes = useRemote("/api/changes", codecs.changes, revision);
  const siteList = sites.data ?? overview.data?.sites ?? [];
  const pending = changes.data?.filter((change) => change.status === "pending").length;
  const title = page === "guide" ? "Panduan demo" : navItems.find((item) => item.id === page)?.label ?? "NetOps Lab";
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [page]);

  function navigate(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function ask(question: string) {
    setSelectedDevice(null);
    setSelectedDocument(null);
    setChatPrompt((current) => ({ text: question, revision: current.revision + 1 }));
    setChatOpen(true);
  }

  function openChanges() {
    setEditor(null);
    setSelectedDevice(null);
    setSelectedDocument(null);
    navigate("changes");
  }

  function renderPage() {
    switch (page) {
      case "dashboard": return <DashboardPage overview={overview} revision={revision} onDevice={setSelectedDevice} onTopology={() => navigate("topology")} onSite={(id) => { setInventorySite(id); navigate("inventory"); }} onAsk={ask} />;
      case "topology": return <TopologyPage revision={revision} onDevice={setSelectedDevice} />;
      case "inventory": return <InventoryPage sites={siteList} revision={revision} siteId={inventorySite} onSiteChange={setInventorySite} onDevice={setSelectedDevice} onEdit={setEditor} />;
      case "knowledge": return <KnowledgePage sites={siteList} revision={revision} onDocument={setSelectedDocument} onEdit={setEditor} />;
      case "changes": return <ChangesPage changes={changes} onRefresh={refresh} onAdvanced={() => setEditor({ kind: "advanced" })} />;
      case "audit": return <AuditPage revision={revision} />;
      case "guide": return <GuidePage onAsk={ask} />;
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Lewati navigasi, ke konten utama</a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Navigasi utama">
          <button className="brand" onClick={() => navigate("dashboard")} aria-label="NetOps Lab, buka ringkasan"><span className="brand-mark"><Network size={24} /></span><span className="brand-wordmark">netops<span>lab<span className="brand-period">.</span></span><small>NETWORK OPERATIONS</small></span></button>
          <div className="workspace-switch"><span className="workspace-avatar"><FlaskConical size={18} /></span><span><strong>Demo workspace</strong><small>Sandbox environment</small></span><span className="status-dot text-teal" /></div>
          <p className="nav-section-label">WORKSPACE</p>
          <nav className="main-nav">{navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => navigate(item.id)} aria-current={page === item.id ? "page" : undefined}><item.icon size={18} /><span>{item.label}</span>{item.id === "changes" && <span className={`nav-count ${pending ? "has-pending" : ""}`} title={changes.error ?? `${pending ?? 0} menunggu approval`}>{changes.error ? "!" : pending ?? "—"}</span>}{page === item.id && item.id !== "changes" && <ChevronRight className="nav-chevron" size={14} />}</button>)}</nav>
          <div className="sidebar-sites"><p className="nav-section-label">LOKASI DALAM SNAPSHOT</p>{siteList.map((site) => <button key={site.id} onClick={() => { setInventorySite(site.id); navigate("inventory"); }}><span className="site-sidebar-dot" /><span>{site.name}</span><small>{site.code}</small></button>)}{sites.loading && !siteList.length && <span className="small muted">Memuat lokasi…</span>}</div>
          <div className="sidebar-bottom">
            <div className="sidebar-guide"><span className="sidebar-guide-icon"><Sparkles size={20} /></span><strong>Baru di NetOps Lab?</strong><p>Ikuti alur demo dari sinyal hingga approval.</p><button className="text-button" onClick={() => navigate("guide")}>Buka panduan<ArrowUpRight size={14} /></button></div>
            <button className={`nav-item ${page === "guide" ? "active" : ""}`} onClick={() => navigate("guide")} aria-current={page === "guide" ? "page" : undefined}><CircleHelp size={18} /><span>Panduan demo</span></button>
            <button className="nav-item reset-nav" aria-label="Reset dataset demo dengan konfirmasi" onClick={() => setResetOpen(true)}><RotateCcw size={17} /><span>Reset demo</span></button>
            <div className="sidebar-environment"><ShieldCheck size={17} /><div><strong>Simulation only</strong><span>Bukan jaringan produksi</span></div></div>
          </div>
        </aside>
        <div className="main-column">
          <header className="topbar"><div className="breadcrumb"><Command size={17} /><span>Workspace</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="topbar-actions"><span className={`api-health ${health.data ? "connected" : health.error ? "disconnected" : ""}`} title={health.error ?? "Konektivitas aplikasi, bukan telemetry jaringan"}><span className="status-dot" />{health.loading ? "Memeriksa API" : health.data ? "API aktif" : "API tidak terhubung"}</span><span className="topbar-separator" /><SimulationBadge /><button className="icon-button refresh-button" aria-label="Muat ulang data aplikasi" onClick={refresh} disabled={health.loading || overview.loading}><RefreshCw size={17} className={health.loading || overview.loading ? "spin" : ""} /></button><button className={`button button-small assistant-toggle ${chatOpen ? "is-active" : ""}`} onClick={() => setChatOpen((value) => !value)} aria-expanded={chatOpen} aria-controls="copilot-panel"><MessageSquare size={16} /><span>Copilot</span><Sparkles size={12} /></button></div></header>
          <div className={`workspace ${chatOpen ? "with-assistant" : ""}`}>
            <main id="main-content" className="main-content" tabIndex={-1} ref={mainRef} aria-label={title}>
              {health.error && <div className="global-notice"><ErrorState message={health.error} retry={health.reload} /></div>}
              {sites.error && <div className="global-notice"><ErrorState message={`Daftar lokasi: ${sites.error}`} retry={sites.reload} /></div>}
              {notice && <div className="toast-notice" role="status"><ShieldCheck size={18} /><span>{notice}</span><button className="icon-button" aria-label="Tutup pemberitahuan" onClick={() => setNotice(null)}><X size={15} /></button></div>}
              <div className="page-content">{renderPage()}</div>
              <footer className="workspace-footer"><span><span className="status-dot" />NETOPS LAB <span className="muted">/</span> SANDBOX</span><span><MapPin size={11} />{overview.data ? `Seed snapshot ${formatDate(overview.data.snapshotAt)}` : "Menunggu informasi seed snapshot"}<span className="footer-source"> · Data sintetis / historis</span></span></footer>
            </main>
            <AgentPanel open={chatOpen} onClose={closeChat} prompt={chatPrompt} onDataChanged={refresh} />
          </div>
        </div>
      </div>
      {chatOpen && <button className="chat-backdrop" tabIndex={-1} aria-label="Tutup panel Copilot" onClick={closeChat} />}
      {selectedDevice && <DeviceDrawer id={selectedDevice} revision={revision} onClose={() => setSelectedDevice(null)} onEdit={setEditor} onDocument={setSelectedDocument} onAsk={ask} />}
      {selectedDocument && <DocumentReader id={selectedDocument} revision={revision} sites={siteList} onClose={() => setSelectedDocument(null)} onEdit={setEditor} onAsk={ask} />}
      {editor && <ChangeDialog target={editor} sites={siteList} revision={revision} onClose={() => setEditor(null)} onCreated={refresh} onOpenChanges={openChanges} />}
      {resetOpen && <ResetDialog onClose={() => setResetOpen(false)} onReset={() => { setResetOpen(false); setSelectedDevice(null); setSelectedDocument(null); setEditor(null); setNotice("Dataset demo telah direset oleh backend. Data sedang dimuat ulang; percakapan lama dapat merujuk snapshot sebelumnya."); refresh(); }} />}
    </>
  );
}
