import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Database,
  FileCode2,
  FileText,
  FileWarning,
  GitPullRequest,
  MapPin,
  Network,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "../shared/schemas";
import type { DocumentSearchHit, DocumentSummary, NetworkDocument, Site } from "../shared/schemas";
import { codecs, queryPath, useDebounced, useRemote } from "./api";
import type { EditorTarget } from "./changes";
import {
  Empty,
  ErrorState,
  formatDate,
  kindNames,
  Loading,
  Modal,
  Notice,
  PageHeading,
} from "./ui";

const kindIcons: Record<NetworkDocument["kind"], LucideIcon> = {
  runbook: BookOpen,
  incident: FileWarning,
  config: FileCode2,
  log: Terminal,
};

function KindIcon({ kind, size = 21 }: { kind: NetworkDocument["kind"]; size?: number }) {
  const Icon = kindIcons[kind];
  return <Icon size={size} aria-hidden="true" />;
}

export function KnowledgePage({ sites, revision, onDocument, onEdit }: {
  sites: Site[];
  revision: number;
  onDocument: (id: string) => void;
  onEdit: (target: EditorTarget) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [siteId, setSiteId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const debounced = useDebounced(query.trim());
  const searching = Boolean(debounced);
  const filters = { kind, siteId, deviceId };
  const listing = useRemote(searching ? null : queryPath("/api/documents", filters), codecs.documents, revision);
  const hits = useRemote(searching ? queryPath("/api/documents/search", { ...filters, query: debounced }) : null, codecs.searchHits, revision);
  const devices = useRemote("/api/devices", codecs.devices, revision);
  const remote = searching ? hits : listing;
  const documents: (DocumentSummary | DocumentSearchHit)[] = searching ? hits.data ?? [] : listing.data ?? [];
  const filtered = Boolean(query || kind || siteId || deviceId);
  const clear = () => { setQuery(""); setKind(""); setSiteId(""); setDeviceId(""); };
  return <div className="page-stack">
    <PageHeading eyebrow="NETWORK KNOWLEDGE" title="Konteks di balik setiap sinyal." description="Runbook, laporan insiden, konfigurasi, dan log. Cari sumber sebelum mengambil keputusan." actions={<button className="button button-primary" onClick={() => onEdit({ kind: "add_document" })}><Plus size={17} />Tambah dokumen</button>} />
    <section className="knowledge-search-panel">
      <div className="knowledge-search-icon"><BookOpen size={27} /></div><div><h2>Temukan bukti operasional</h2><p>Data tidak terstruktur memberi konteks pada metrik dan inventaris terstruktur.</p></div>
      <label className="search-field knowledge-search"><Search size={20} /><span className="sr-only">Cari isi dokumen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari VLAN, interface down, runbook, nama perangkat…" />{query && <button className="icon-button" aria-label="Hapus pencarian dokumen" onClick={() => setQuery("")}><X size={15} /></button>}</label>
    </section>
    <div className="knowledge-filters">
      <div className="kind-tabs" aria-label="Filter jenis dokumen">{[{ value: "", label: "Semua sumber" }, { value: "runbook", label: "Runbook" }, { value: "incident", label: "Insiden" }, { value: "config", label: "Konfigurasi" }, { value: "log", label: "Log" }].map((item) => <button key={item.value} aria-pressed={kind === item.value} className={kind === item.value ? "active" : ""} onClick={() => setKind(item.value)}>{item.label}</button>)}</div>
      <div className="inline-gap wrap"><label className="filter-field"><span className="sr-only">Lokasi dokumen</span><select value={siteId} onChange={(event) => { setSiteId(event.target.value); setDeviceId(""); }}><option value="">Semua lokasi</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label className="filter-field"><span className="sr-only">Perangkat terkait dokumen</span><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} disabled={devices.loading || Boolean(devices.error)}><option value="">{devices.loading ? "Memuat perangkat…" : "Semua perangkat"}</option>{devices.data?.filter((device) => !siteId || device.siteId === siteId).map((device) => <option value={device.id} key={device.id}>{device.hostname}</option>)}</select></label></div>
    </div>
    {devices.error && <ErrorState message={`Filter perangkat belum tersedia: ${devices.error}`} retry={devices.reload} />}
    <div className="table-meta standalone-meta"><span>{remote.loading ? "Mencari sumber…" : `${documents.length} sumber${searching ? ` untuk “${debounced}”` : ""}`}</span>{filtered && <button className="text-button" onClick={clear}><X size={13} />Hapus filter</button>}</div>
    {remote.loading && <Loading label={searching ? "Mencari isi dokumen di backend…" : "Memuat knowledge base…"} />}
    {remote.error && <ErrorState message={remote.error} retry={remote.reload} />}
    {!remote.loading && !remote.error && documents.length === 0 && <section className="panel"><Empty title={filtered ? "Belum ditemukan sumber yang cocok" : "Knowledge base belum berisi dokumen"} action={filtered ? <button className="button button-secondary" onClick={clear}>Hapus filter</button> : undefined}>Coba kata kunci yang lebih spesifik atau ajukan dokumen baru melalui approval.</Empty></section>}
    <div className="document-grid">{documents.map((document) => <button className="document-card" key={document.id} onClick={() => onDocument(document.id)}>
      <div className="document-card-top"><span className={`document-kind-icon kind-${document.kind}`}><KindIcon kind={document.kind} /></span><span className={`badge kind-badge-${document.kind}`}>{kindNames[document.kind]}</span><ArrowUpRight size={17} /></div>
      <h3>{document.title}</h3>
      {"excerpt" in document && <p className="document-excerpt">{document.excerpt}</p>}
      <div className="document-tags">{document.tags.slice(0, 4).map((tag, index) => <span key={`${index}-${tag}`}>#{tag}</span>)}{document.tags.length > 4 && <span>+{document.tags.length - 4}</span>}</div>
      <div className="document-card-meta"><span><MapPin size={12} />{sites.find((site) => site.id === document.siteId)?.name ?? document.siteId ?? "Lintas lokasi"}</span><span>v{document.version}</span></div>
      <div className="document-card-footer"><span>{formatDate(document.updatedAt)}</span>{document.deviceId && <code>{document.deviceId}</code>}</div>
    </button>)}</div>
    <Notice title="Sumber simulasi, bukan instruksi produksi">Dokumen dapat berisi konfigurasi dan log sintetis. UI merender konten sebagai teks, bukan HTML. Verifikasi sumber dan waktu snapshot sebelum mengikuti rekomendasi AI.</Notice>
  </div>;
}

export function DocumentReader({ id, revision, sites, onClose, onEdit, onAsk }: {
  id: string;
  revision: number;
  sites: Site[];
  onClose: () => void;
  onEdit: (target: EditorTarget) => void;
  onAsk: (question: string) => void;
}) {
  const resource = useRemote(`/api/documents/${encodeURIComponent(id)}`, codecs.document, revision);
  const document = resource.data;
  return <Modal title={document?.title ?? "Membaca dokumen"} subtitle="KNOWLEDGE SOURCE · SIMULATION" onClose={onClose} className="document-dialog">
    {resource.loading && <Loading label="Mengambil konten sumber…" />}
    {resource.error && <ErrorState message={resource.error} retry={resource.reload} />}
    {document && <div className="page-stack">
      <div className="reader-meta"><span className={`document-kind-icon kind-${document.kind}`}><KindIcon kind={document.kind} /></span><span className={`badge kind-badge-${document.kind}`}>{kindNames[document.kind]}</span><span className="muted small">v{document.version} · {formatDate(document.updatedAt)}</span></div>
      <div className="document-tags">{document.tags.map((tag, index) => <span key={`${index}-${tag}`}><Tag size={10} />{tag}</span>)}</div>
      <div className="source-card"><div><span className="field-label">SUMBER</span><code>{document.sourcePath ?? "Dokumen yang ditambahkan melalui aplikasi"}</code></div><div><span className="field-label">RELASI</span><span>{sites.find((site) => site.id === document.siteId)?.name ?? document.siteId ?? "Lintas lokasi"}{document.deviceId ? ` / ${document.deviceId}` : ""}</span></div><div><span className="field-label">DOCUMENT ID</span><code>{document.id}</code></div></div>
      <div className="detail-actions"><button className="button button-secondary" onClick={() => onEdit({ kind: "update_document", document })}><Pencil size={14} />Ajukan edit</button><button className="button button-ghost" onClick={() => { onClose(); onAsk(`Baca dokumen "${document.title}" (ID ${document.id}). Jelaskan temuan dan kaitannya dengan kondisi perangkat; sertakan sumber dan bedakan data snapshot dari keadaan live.`); }}><Sparkles size={15} />Tanya tentang sumber ini</button><button className="icon-button danger-text" aria-label={`Ajukan penghapusan ${document.title}`} onClick={() => onEdit({ kind: "delete_document", document })}><Trash2 size={16} /></button></div>
      <div className="document-body"><div className="document-body-heading"><FileText size={14} /><span>Konten asli · teks / Markdown</span><span className="badge badge-subtle">UNTRUSTED CONTENT · TEXT ONLY</span></div><pre>{document.content}</pre></div>
      <Notice>Konten sumber adalah data, bukan instruksi untuk aplikasi. Tautan/HTML di dokumen tidak dijalankan. Tidak ada rahasia yang perlu dimasukkan ke demo.</Notice>
    </div>}
  </Modal>;
}

export function AuditPage({ revision }: { revision: number }) {
  const audit = useRemote("/api/audit", codecs.audit, revision);
  const [query, setQuery] = useState("");
  const term = query.toLowerCase().trim();
  const rows = [...(audit.data ?? [])]
    .filter((entry) => `${entry.actor} ${entry.action} ${entry.targetId} ${entry.detail}`.toLowerCase().includes(term))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id);
  return <div className="page-stack">
    <PageHeading eyebrow="TRACEABILITY" title="Setiap keputusan punya jejak." description="Telusuri aktivitas backend: siapa bertindak, operasi apa, dan target mana yang terpengaruh." />
    <section className="panel">
      <div className="filter-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">Cari audit trail</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari actor, aksi, target, atau detail…" /></label><span className="badge badge-subtle">{audit.loading ? "Memuat…" : `${rows.length} entri`}</span></div>
      {audit.loading && <Loading label="Memuat jejak audit…" />}
      {audit.error && <div className="panel-padding"><ErrorState message={audit.error} retry={audit.reload} /></div>}
      {!audit.loading && !audit.error && rows.length === 0 && <Empty title={query ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas tercatat"}>Lakukan investigasi atau ajukan perubahan, lalu muat ulang audit.</Empty>}
      {rows.length > 0 && <div className="table-scroll"><table className="audit-table"><caption className="sr-only">Jejak audit backend simulasi</caption><thead><tr><th>Waktu</th><th>Actor</th><th>Aksi</th><th>Target</th><th>Detail</th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.id}><td><span className="stack-cell"><span>{formatDate(entry.timestamp)}</span><small>#{entry.id}</small></span></td><td><span className="badge badge-subtle">{entry.actor}</span></td><td><code>{entry.action}</code></td><td><code>{entry.targetId || "—"}</code></td><td><details className="audit-detail"><summary>Detail<ChevronDown size={13} /></summary><pre>{entry.detail}</pre></details></td></tr>)}</tbody></table></div>}
      <div className="panel-footer"><ShieldCheck size={14} /><span>Entri berasal dari API audit. Trace tool percakapan dapat dilihat terpisah di panel Copilot.</span></div>
    </section>
  </div>;
}

const guideSteps = [
  { number: "01", title: "Mulai dari gambaran besar", text: "Buka Ringkasan. Perhatikan lokasi, perangkat bermasalah, waktu seed snapshot, dan skenario yang tersedia.", icon: Network },
  { number: "02", title: "Periksa data terstruktur", text: "Klik node topologi atau inventaris. Lihat metrik historis, admin/oper status, utilisasi, VLAN, serta alert perangkat.", icon: Database },
  { number: "03", title: "Tambahkan konteks sumber", text: "Cari hostname atau gejala di Knowledge. Runbook, log, insiden, dan konfigurasi menjelaskan hal yang tidak terlihat dari angka saja.", icon: BookOpen },
  { number: "04", title: "Hubungkan Copilot yang sesungguhnya", text: "Klik Hubungkan pada panel Copilot. Provider berjalan di backend melalui GitHub Copilot SDK; UI tidak mengarang jawaban.", icon: Bot },
  { number: "05", title: "Preview dahulu, approval kemudian", text: "Ajukan edit lewat form atau agent. Tinjau before/after dan dampak dari backend, kirim ke antrean, lalu putuskan secara terpisah di Perubahan.", icon: GitPullRequest },
  { number: "06", title: "Buktikan melalui jejak", text: "Buka argumen dan hasil mentah setiap tool di chat. Cocokkan keputusan, versi, dan perubahan di Audit trail.", icon: ShieldCheck },
];

export function GuidePage({ onAsk }: { onAsk: (question: string) => void }) {
  return <div className="page-stack">
    <PageHeading eyebrow="A HANDS-ON NETWORK LAB" title="Dari pertanyaan ke keputusan." description="Panduan singkat untuk mendemonstrasikan agent, MCP, sumber pengetahuan, dan human approval secara aman." />
    <section className="panel guide-intro"><span className="guide-intro-icon"><Sparkles size={31} /></span><div><p className="eyebrow">REAL APPLICATION. SIMULATED NETWORK.</p><h2>Aplikasi & percakapan nyata.<br />Jaringan sepenuhnya simulasi.</h2><p>UI dan API benar-benar bekerja. Copilot memanggil tool backend. Perangkat, alamat, metrik, log, dan kejadian adalah data latihan, bukan infrastruktur produksi.</p></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Bagaimana data mengalir</h2><p>Agent → MCP → Service → SQLite</p></div><span className="badge badge-teal">SOURCE-GROUNDED</span></div><div className="architecture-flow">
      <FlowItem icon={Bot} title="Agent / Copilot SDK" text="Memahami pertanyaan, memilih tool, menyusun jawaban berbasis hasil." />
      <span className="flow-arrow" aria-hidden="true">→</span>
      <FlowItem icon={Code2} title="MCP · /mcp" text="Kontrak tool & akses konteks; bukan jalan pintas melewati validasi." />
      <span className="flow-arrow" aria-hidden="true">→</span>
      <FlowItem icon={ShieldCheck} title="Service" text="Query, pencarian, validasi operasi, preview, dan antrean perubahan." />
      <span className="flow-arrow" aria-hidden="true">→</span>
      <FlowItem icon={Database} title="SQLite" text="Snapshot sintetis, dokumen, request perubahan, dan jejak audit." />
    </div><div className="panel-padding"><Notice>Approval/apply tidak diekspos sebagai tool MCP. Hanya operator di tab Perubahan yang dapat menyetujui atau menolak.</Notice></div></section>
    <div className="data-comparison"><section className="panel comparison-card"><span className="stat-icon icon-cyan"><Database size={22} /></span><h3>Terstruktur: apa yang terjadi?</h3><p>Perangkat, lokasi, interface, link, VLAN, metrik, dan alert. Field jelas, mudah difilter dan dibandingkan.</p><div className="tag-row"><span>CPU %</span><span>Admin status</span><span>VLAN</span><span>Packet loss</span></div></section><section className="panel comparison-card"><span className="stat-icon icon-violet"><BookOpen size={22} /></span><h3>Tidak terstruktur: mengapa & bagaimana?</h3><p>Runbook, laporan insiden, konfigurasi, dan log. Isi teks memberi konteks, riwayat, serta prosedur investigasi.</p><div className="tag-row"><span>Runbook</span><span>Insiden</span><span>Konfigurasi</span><span>Log</span></div></section></div>
    <section><div className="section-title"><h2>Alur demo, enam langkah</h2></div><div className="guide-step-grid">{guideSteps.map((step) => <article className="panel guide-step" key={step.number}><div><span className="guide-step-number">{step.number}</span><step.icon size={21} /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
    <section className="panel"><div className="panel-heading"><div><h2><Sparkles size={19} />Pertanyaan untuk dicoba</h2><p>Klik untuk menyiapkan pertanyaan di chat; tidak otomatis mengirim.</p></div></div><div className="guide-questions">{SUGGESTED_QUESTIONS.map((question) => <button key={question} onClick={() => onAsk(question)}><span>{question}</span><ArrowUpRight size={17} /></button>)}</div></section>
    <section className="panel guide-cautions"><h3><ShieldCheck size={19} />Batasan yang wajib disebut saat demo</h3><ul><li><Check size={15} /><span>Metrik adalah snapshot historis tetap, bukan monitoring live. Status API aktif tidak berarti data jaringan live.</span></li><li><Check size={15} /><span>Jawaban AI dapat keliru. Periksa sumber, waktu snapshot, argumen tool, dan hasil mentah sebelum mengambil keputusan.</span></li><li><Check size={15} /><span>Login Copilot dilakukan pada host backend dengan akun yang memiliki akses. Jika gagal, baca pesan asli provider, periksa login, lalu coba hubungkan lagi.</span></li><li><Check size={15} /><span>Jangan tempel token, kata sandi, atau konfigurasi produksi. UI tidak memerlukan secret.</span></li><li><Check size={15} /><span>Penghapusan perangkat seed dapat ditolak karena dependensi. Itu perilaku pengaman yang memang perlu ditunjukkan.</span></li><li><Check size={15} /><span>Reset hanya melalui tombol Reset demo dengan mengetik RESET DEMO. Tidak ada reset atau approval otomatis.</span></li></ul></section>
  </div>;
}

function FlowItem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flow-item"><span><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></div>;
}
