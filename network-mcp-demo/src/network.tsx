import { useId, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  EthernetPort,
  FileText,
  Filter,
  Globe2,
  HardDrive,
  Layers,
  MapPin,
  Network,
  Pencil,
  Plus,
  Radio,
  Search,
  Server,
  Shield,
  Sparkles,
  Trash2,
  Wifi,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Device, Metric, Overview, Site, Topology } from "../shared/schemas";
import { SUGGESTED_QUESTIONS } from "../shared/schemas";
import { codecs, queryPath, useDebounced, useRemote } from "./api";
import type { Remote } from "./api";
import type { EditorTarget } from "./changes";
import {
  deviceTypeNames,
  Empty,
  ErrorState,
  formatDate,
  HealthBadge,
  healthNames,
  LegendDot,
  Loading,
  Modal,
  Notice,
  number,
  PageHeading,
  SimulationBadge,
} from "./ui";

const deviceIcons: Record<Device["type"], LucideIcon> = {
  router: Globe2,
  switch: Server,
  firewall: Shield,
  access_point: Wifi,
};
const typeOrder: Record<Device["type"], number> = { router: 0, firewall: 1, switch: 2, access_point: 3 };
const healthOrder: Record<Device["status"], number> = { critical: 0, offline: 1, warning: 2, healthy: 3 };

export function DeviceIcon({ type, size = 19 }: { type: Device["type"]; size?: number }) {
  const Icon = deviceIcons[type];
  return <Icon size={size} aria-hidden="true" />;
}

function NodeGlyph({ type, x, y }: { type: Device["type"]; x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {type === "access_point" ? <>
        <path d="M-9 -2 Q0 -11 9 -2 M-5 2 Q0 -4 5 2 M-1 6 H1" />
      </> : type === "firewall" ? <>
        <path d="M0 -9 L8 -5 V1 Q8 7 0 11 Q-8 7 -8 1 V-5 Z M-3 0 L0 3 L4 -2" />
      </> : type === "router" ? <>
        <path d="M-9 0 H9 M0 -8 V8 M-9 0 L-5 -3 M-9 0 L-5 3 M9 0 L5 -3 M9 0 L5 3 M0 -8 L-3 -4 M0 -8 L3 -4 M0 8 L-3 4 M0 8 L3 4" />
      </> : <>
        <rect x="-11" y="-7" width="22" height="14" rx="3" />
        <path d="M-6 2 H-4 M-1 2 H1 M4 2 H6 M-6 -2 H6" />
      </>}
    </g>
  );
}

export function TopologyGraph({
  topology,
  onDevice,
  focusSite = "",
  query = "",
  compact = false,
  zoom = 1,
}: {
  topology: Topology;
  onDevice: (id: string) => void;
  focusSite?: string;
  query?: string;
  compact?: boolean;
  zoom?: number;
}) {
  const labelId = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const groups = topology.sites.map((site) => ({
    site,
    devices: topology.devices.filter((device) => device.siteId === site.id)
      .sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.hostname.localeCompare(b.hostname)),
  }));
  const width = Math.max(groups.length, 1) * 344 + 20;
  const rows = Math.max(1, ...groups.map((group) => Math.ceil(group.devices.length / 3)));
  const height = 145 + rows * 100;
  const positions = new Map<string, { x: number; y: number }>();
  groups.forEach((group, groupIndex) => {
    group.devices.forEach((device, index) => {
      positions.set(device.id, {
        x: 74 + groupIndex * 344 + (index % 3) * 100,
        y: 145 + Math.floor(index / 3) * 100,
      });
    });
  });
  const ports = new Map(topology.interfaces.map((port) => [port.id, port]));
  const edges = topology.links.flatMap((link) => {
    const source = ports.get(link.sourceInterfaceId);
    const target = ports.get(link.targetInterfaceId);
    if (!source || !target) return [];
    const from = positions.get(source.deviceId);
    const to = positions.get(target.deviceId);
    return from && to ? [{ link, source, target, from, to }] : [];
  });
  const missingLinks = topology.links.length - edges.length;
  const unplacedDevices = topology.devices.filter((device) => !positions.has(device.id)).length;
  if (!groups.length) return <Empty title="Topologi belum tersedia">Belum ada lokasi pada dataset.</Empty>;

  return (
    <div className={`topology-container ${compact ? "topology-compact" : ""}`}>
      {(missingLinks > 0 || unplacedDevices > 0) && <Notice tone="warning">
        {missingLinks} link tidak dapat dipetakan ke interface; {unplacedDevices} perangkat tidak memiliki grup lokasi. Periksa integritas dataset.
      </Notice>}
      <div className="topology-scroll" tabIndex={0} role="region" aria-label="Kanvas topologi; dapat digulir horizontal">
        <svg
          className="topology-svg"
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: `${zoom * 100}%`, minWidth: (compact ? 720 : 880) * zoom }}
          role="group"
          aria-labelledby={labelId}
        >
          <title id={labelId}>Topologi simulasi {topology.sites.length} lokasi, {topology.devices.length} perangkat, {topology.links.length} link. Pilih node untuk detail perangkat.</title>
          <defs>
            <pattern id={`${labelId}-grid`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="#26394c" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill={`url(#${labelId}-grid)`} />
          {groups.map(({ site, devices }, index) => (
            <g key={site.id} opacity={focusSite && focusSite !== site.id ? 0.4 : 1}>
              <rect className="site-group" x={20 + index * 344} y="25" width="320" height={height - 44} rx="16" />
              <rect className="site-code-bg" x={36 + index * 344} y="42" width="42" height="26" rx="7" />
              <text className="site-code" x={57 + index * 344} y="59" textAnchor="middle">{site.code}</text>
              <text className="site-title" x={90 + index * 344} y="53">{site.name}</text>
              <text className="site-caption" x={90 + index * 344} y="71">{site.region} · {devices.length} perangkat</text>
              <line className="site-divider" x1={36 + index * 344} x2={324 + index * 344} y1="87" y2="87" />
            </g>
          ))}
          {edges.map(({ link, source, target, from, to }) => {
            const active = !hovered || source.deviceId === hovered || target.deviceId === hovered;
            const sameColumn = Math.abs(from.x - to.x) < 10;
            const path = sameColumn
              ? `M ${from.x} ${from.y} C ${from.x + 42} ${from.y + 25}, ${to.x + 42} ${to.y - 25}, ${to.x} ${to.y}`
              : `M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`;
            return <path
              key={link.id}
              d={path}
              className={`topology-link link-${link.status} ${source.role === "wan" || target.role === "wan" ? "link-wan" : ""}`}
              opacity={active ? 0.8 : 0.13}
            ><title>{source.deviceId} / {source.name} ↔ {target.deviceId} / {target.name} · {number(link.bandwidthMbps)} Mbps · {link.status}</title></path>;
          })}
          {topology.devices.map((device) => {
            const position = positions.get(device.id);
            if (!position) return null;
            const matches = (!focusSite || focusSite === device.siteId) &&
              (!query || `${device.hostname} ${device.managementIp}`.toLowerCase().includes(query.toLowerCase()));
            return <g
              key={device.id}
              className={`topology-node node-${device.status}`}
              transform={`translate(${position.x}, ${position.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${device.hostname}, ${deviceTypeNames[device.type]}, ${healthNames[device.status]}. Buka detail.`}
              opacity={matches ? 1 : 0.24}
              onClick={() => onDevice(device.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onDevice(device.id); }
              }}
              onMouseEnter={() => setHovered(device.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(device.id)}
              onBlur={() => setHovered(null)}
            >
              <title>{device.hostname} · {device.managementIp} · {healthNames[device.status]}</title>
              <rect className="node-box" x="-29" y="-27" width="58" height="49" rx="11" />
              <NodeGlyph type={device.type} x={0} y={-3} />
              <circle className="node-health" cx="24" cy="-22" r="4.5" />
              <text className="node-name" y="39" textAnchor="middle">{device.hostname}</text>
              {!compact && <text className="node-ip" y="53" textAnchor="middle">{device.managementIp}</text>}
            </g>;
          })}
        </svg>
      </div>
      <div className="topology-legend">
        <div className="legend-group">
          <LegendDot className="text-teal">Sehat</LegendDot>
          <LegendDot className="text-amber">Peringatan</LegendDot>
          <LegendDot className="text-red">Kritis</LegendDot>
          <LegendDot className="text-muted">Offline</LegendDot>
        </div>
        <span className="muted small">Garis = link API · merah = down · putus-putus = WAN</span>
      </div>
    </div>
  );
}

export function DashboardPage({
  overview,
  revision,
  onDevice,
  onTopology,
  onSite,
  onAsk,
}: {
  overview: Remote<Overview>;
  revision: number;
  onDevice: (id: string) => void;
  onTopology: () => void;
  onSite: (id: string) => void;
  onAsk: (question: string) => void;
}) {
  const topology = useRemote("/api/topology", codecs.topology, revision);
  const alerts = useRemote("/api/alerts", codecs.alerts, revision);
  const data = overview.data;
  const topologyData = topology.data;
  const activeAlerts = alerts.data?.filter((alert) => alert.status !== "resolved");
  const healthyRatio = data && data.counts.devices ? Math.round(data.health.healthy / data.counts.devices * 100) : undefined;
  return (
    <div className="page-stack">
      <PageHeading eyebrow="NETWORK OPERATIONS" title="Ringkasan jaringan" description="Satu workspace untuk perangkat, pengetahuan, dan keputusan operasional." />
      <section className="hero-panel">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <div className="inline-gap"><span className="badge hero-badge"><Sparkles size={12} />YOUR NETWORK, IN CONTEXT</span><SimulationBadge /></div>
          <h2>Kenali jaringan.<br /><span>Temukan konteksnya.</span></h2>
          <p>Jelajahi data jaringan sintetis, hubungkan bukti dari dokumen, dan ajukan perubahan dengan approval manusia.</p>
          <button className="button button-primary" onClick={() => onAsk(SUGGESTED_QUESTIONS[0])}><Sparkles size={17} />Tanya Copilot<ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-center"><Network size={44} /></div>
          <div className="hero-satellite satellite-one"><Shield size={22} /></div>
          <div className="hero-satellite satellite-two"><Server size={22} /></div>
          <div className="hero-satellite satellite-three"><Wifi size={22} /></div>
          <span className="hero-art-label">OBSERVE · UNDERSTAND · APPROVE</span>
        </div>
      </section>
      {overview.error && <ErrorState message={overview.error} retry={overview.reload} />}
      {overview.loading && <Loading label="Mengambil snapshot jaringan…" />}
      <div className="stats-grid">
        <StatCard label="Total perangkat" value={number(data?.counts.devices)} caption={`${number(data?.sites.length)} lokasi terhubung dalam dataset`} icon={Server} tone="cyan" />
        <StatCard label="Perangkat sehat" value={number(data?.health.healthy)} caption={healthyRatio === undefined ? "Menunggu snapshot" : `${healthyRatio}% dari inventaris`} icon={CheckCircle2} tone="teal" />
        <StatCard label="Alert aktif" value={alerts.error ? "!" : number(activeAlerts?.length)} caption={alerts.error ? "Gagal memuat alert" : `${number(activeAlerts?.filter((alert) => alert.severity === "critical").length)} kritis perlu ditinjau`} icon={BellRing} tone="amber" />
        <StatCard label="Knowledge sources" value={number(data?.counts.documents)} caption="Runbook, insiden, konfigurasi & log" icon={BookOpen} tone="violet" />
      </div>
      {data && <div className="snapshot-strip"><Activity size={15} /><span>Snapshot seed: <strong>{formatDate(data.snapshotAt)}</strong></span><span className="snapshot-divider" /><span>{data.datasetVersion}</span><span className="muted">Historis & sintetis — bukan monitoring real-time.</span></div>}
      {topologyData && <div className="site-cards">
        {topologyData.sites.map((site) => {
          const devices = topologyData.devices.filter((device) => device.siteId === site.id);
          const attention = devices.filter((device) => device.status !== "healthy").length;
          return <button className="site-card" key={site.id} onClick={() => onSite(site.id)}>
            <div className="site-card-top"><span className="site-icon"><Building2 size={20} /></span><span className={`badge ${attention ? "badge-amber" : "badge-teal"}`}>{attention ? `${attention} perhatian` : "Sehat"}</span></div>
            <h3>{site.name}</h3><span className="muted small"><MapPin size={12} />{site.region}</span>
            <div className="site-card-bottom"><span><strong>{devices.length}</strong> perangkat <span className="muted">/ {site.code}</span></span><ArrowUpRight size={16} /></div>
          </button>;
        })}
      </div>}
      <section className="panel">
        <div className="panel-heading"><div><h2><Network size={19} />Peta konektivitas</h2><p>Node interaktif, link dari interface aktual di dataset.</p></div><button className="text-button" onClick={onTopology}>Buka topologi<ArrowUpRight size={15} /></button></div>
        {topology.loading && <Loading />}
        {topology.error && <div className="panel-padding"><ErrorState message={topology.error} retry={topology.reload} /></div>}
        {topology.data && <TopologyGraph topology={topology.data} onDevice={onDevice} compact />}
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading"><div><h2><BellRing size={18} />Perlu perhatian</h2><p>Alert dari snapshot simulasi.</p></div><span className="badge badge-amber">{number(activeAlerts?.length)} aktif</span></div>
          {alerts.loading && <Loading />}
          {alerts.error && <div className="panel-padding"><ErrorState message={alerts.error} retry={alerts.reload} /></div>}
          {activeAlerts?.length === 0 && <Empty title="Tidak ada alert aktif">Semua alert pada snapshot telah diselesaikan.</Empty>}
          <div className="alert-list">{activeAlerts?.slice(0, 5).map((alert) => <button className="alert-item" key={alert.id} onClick={() => onDevice(alert.deviceId)}>
            <span className={`alert-indicator ${alert.severity}`}><BellRing size={16} /></span><span className="alert-copy"><strong>{alert.title}</strong><span>{alert.deviceId} · {alert.code}</span></span><ChevronRight size={16} />
          </button>)}</div>
        </section>
        <section className="panel scenario-panel">
          <div className="panel-heading"><div><h2><Layers size={18} />Mulai investigasi</h2><p>Skenario dengan evidence dari dataset.</p></div></div>
          {!data && !overview.loading && <Empty title="Skenario belum tersedia">Muat ulang ringkasan jaringan.</Empty>}
          {data?.scenarios.length === 0 && <Empty title="Belum ada skenario" />}
          <div className="scenario-list">{data?.scenarios.map((scenario, index) => <button className="scenario-item" key={scenario.id} onClick={() => onDevice(scenario.deviceId)}>
            <span className="scenario-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{scenario.title}</strong><span>{scenario.evidence}</span></span><ArrowUpRight size={16} />
          </button>)}</div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, caption, icon: Icon, tone }: {
  label: string; value: string; caption: string; icon: LucideIcon; tone: string;
}) {
  return <section className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon icon-${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{value}</strong><p>{caption}</p></section>;
}

export function TopologyPage({ revision, onDevice }: { revision: number; onDevice: (id: string) => void }) {
  const topology = useRemote("/api/topology", codecs.topology, revision);
  const [site, setSite] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  return (
    <div className="page-stack">
      <PageHeading eyebrow="TOPOLOGY EXPLORER" title="Lihat hubungan, bukan sekadar perangkat." description="Pilih node untuk investigasi. Semua koneksi dipetakan dari source dan target interface API." actions={<SimulationBadge />} />
      <section className="panel">
        <div className="topology-toolbar">
          <label className="search-field"><Search size={16} /><span className="sr-only">Sorot hostname atau IP</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sorot hostname atau IP…" /></label>
          <label className="inline-select"><span className="sr-only">Fokus lokasi</span><MapPin size={16} /><select value={site} onChange={(event) => setSite(event.target.value)}><option value="">Semua lokasi</option>{topology.data?.sites.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <div className="zoom-controls"><button className="icon-button" disabled={zoom <= 0.75} aria-label="Perkecil topologi" onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}><ZoomOut size={17} /></button><button className="text-button" onClick={() => { setZoom(1); setSite(""); setQuery(""); }} aria-label="Reset tampilan topologi">{Math.round(zoom * 100)}%</button><button className="icon-button" disabled={zoom >= 2} aria-label="Perbesar topologi" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}><ZoomIn size={17} /></button></div>
        </div>
        {topology.loading && <Loading label="Memetakan perangkat dan interface…" />}
        {topology.error && <div className="panel-padding"><ErrorState message={topology.error} retry={topology.reload} /></div>}
        {topology.data && <TopologyGraph topology={topology.data} onDevice={onDevice} focusSite={site} query={query} zoom={zoom} />}
        {topology.data && <div className="panel-footer"><span><strong>{topology.data.sites.length}</strong> lokasi</span><span><strong>{topology.data.devices.length}</strong> perangkat</span><span><strong>{topology.data.links.length}</strong> link</span><span><strong>{topology.data.interfaces.length}</strong> interface</span><span className="muted">Tab + Enter untuk membuka node dengan keyboard.</span></div>}
      </section>
      <Notice>Warna node menunjukkan status pada seed snapshot, bukan hasil polling langsung. Garis hanya menggambarkan link yang disediakan API; tidak ada koneksi yang direkayasa UI.</Notice>
    </div>
  );
}

export function InventoryPage({ sites, revision, siteId, onSiteChange, onDevice, onEdit }: {
  sites: Site[];
  revision: number;
  siteId: string;
  onSiteChange: (value: string) => void;
  onDevice: (id: string) => void;
  onEdit: (target: EditorTarget) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("hostname");
  const debounced = useDebounced(query);
  const path = queryPath("/api/devices", { siteId, status, type, query: debounced });
  const devices = useRemote(path, codecs.devices, revision);
  const rows = useMemo(() => [...(devices.data ?? [])].sort((a, b) =>
    sort === "status" ? healthOrder[a.status] - healthOrder[b.status] || a.hostname.localeCompare(b.hostname) : a.hostname.localeCompare(b.hostname),
  ), [devices.data, sort]);
  const clear = () => { setQuery(""); setStatus(""); setType(""); onSiteChange(""); };
  const filtered = Boolean(query || status || type || siteId);
  return (
    <div className="page-stack">
      <PageHeading eyebrow="DEVICE INVENTORY" title="Perangkat & interface" description="Cari perangkat, pahami kondisinya, dan ajukan perubahan yang dapat ditelusuri." actions={<button className="button button-primary" onClick={() => onEdit({ kind: "add_device" })}><Plus size={17} />Tambah perangkat</button>} />
      <section className="panel">
        <div className="filter-toolbar">
          <label className="search-field"><Search size={17} /><span className="sr-only">Cari perangkat</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hostname, IP, vendor…" /></label>
          <label className="filter-field"><span>Lokasi</span><select value={siteId} onChange={(event) => onSiteChange(event.target.value)}><option value="">Semua lokasi</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
          <label className="filter-field"><span>Kondisi</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua kondisi</option><option value="healthy">Sehat</option><option value="warning">Peringatan</option><option value="critical">Kritis</option><option value="offline">Offline</option></select></label>
          <label className="filter-field"><span>Tipe</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Semua tipe</option><option value="router">Router</option><option value="switch">Switch</option><option value="firewall">Firewall</option><option value="access_point">Access point</option></select></label>
        </div>
        <div className="table-meta"><span><Filter size={14} />{devices.loading ? "Mencari…" : `${rows.length} perangkat ditemukan`}</span><div className="inline-gap">{filtered && <button className="text-button" onClick={clear}><X size={13} />Hapus filter</button>}<label className="sort-field"><span className="sr-only">Urutkan perangkat</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="hostname">Hostname A–Z</option><option value="status">Prioritas kondisi</option></select></label></div></div>
        {devices.loading && <Loading />}
        {devices.error && <div className="panel-padding"><ErrorState message={devices.error} retry={devices.reload} /></div>}
        {!devices.loading && !devices.error && rows.length === 0 && <Empty title={filtered ? "Tidak ada perangkat yang cocok" : "Inventaris masih kosong"} action={filtered ? <button className="button button-secondary" onClick={clear}>Hapus filter</button> : undefined}>Coba kata kunci atau filter lain, atau ajukan penambahan perangkat.</Empty>}
        {rows.length > 0 && <div className="table-scroll"><table><caption className="sr-only">Inventaris perangkat jaringan simulasi</caption><thead><tr><th>Perangkat</th><th>Lokasi</th><th>Management IP</th><th>Vendor / model</th><th>Kondisi</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{rows.map((device) => <tr key={device.id}>
          <td><button className="device-link" onClick={() => onDevice(device.id)}><span className={`device-avatar type-${device.type}`}><DeviceIcon type={device.type} /></span><span><strong>{device.hostname}</strong><span>{deviceTypeNames[device.type]}</span></span></button></td>
          <td><span className="location-cell"><MapPin size={13} />{sites.find((site) => site.id === device.siteId)?.name ?? device.siteId}</span></td>
          <td className="mono">{device.managementIp}</td><td><span className="stack-cell">{device.vendor}<small>{device.model}</small></span></td><td><HealthBadge status={device.status} /></td>
          <td><button className="icon-button" aria-label={`Buka detail ${device.hostname}`} onClick={() => onDevice(device.id)}><ChevronRight size={18} /></button></td>
        </tr>)}</tbody></table></div>}
        <div className="panel-footer"><Shield size={14} /><span>Tambah, edit, dan hapus selalu melalui preview & approval. Tidak ada perubahan langsung.</span></div>
      </section>
    </div>
  );
}

function MetricTrend({ metrics }: { metrics: Metric[] }) {
  const id = useId();
  const points = [...metrics].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (!points.length) return <Empty title="Tidak ada histori metrik">Snapshot ini tidak memiliki sampel metrik untuk perangkat.</Empty>;
  const x = (index: number) => 35 + (points.length <= 1 ? 260 : index / (points.length - 1) * 530);
  const y = (value: number) => 132 - value / 100 * 108;
  const line = (field: "cpuPct" | "memoryPct") => points.map((point, index) => `${x(index)},${y(point[field])}`).join(" ");
  const last = points[points.length - 1];
  return (
    <div className="metric-chart">
      <div className="chart-legend"><LegendDot className="text-cyan">CPU</LegendDot><LegendDot className="text-violet">Memory</LegendDot><span className="muted small">{points.length} sampel historis</span></div>
      <svg viewBox="0 0 600 160" role="img" aria-labelledby={id}>
        <title id={id}>Tren historis CPU dan memory. CPU terakhir {number(last?.cpuPct)} persen; memory {number(last?.memoryPct)} persen.</title>
        {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1="35" x2="568" y1={y(value)} y2={y(value)} className="chart-grid" /><text x="23" y={y(value) + 4} textAnchor="end" className="chart-label">{value}</text></g>)}
        <polyline points={line("memoryPct")} fill="none" className="memory-line" />
        <polyline points={line("cpuPct")} fill="none" className="cpu-line" />
        {points.map((point, index) => <g key={point.id}><circle cx={x(index)} cy={y(point.cpuPct)} r="3" className="cpu-point"><title>{formatDate(point.timestamp)} · CPU {number(point.cpuPct)}%</title></circle><circle cx={x(index)} cy={y(point.memoryPct)} r="2.5" className="memory-point"><title>{formatDate(point.timestamp)} · Memory {number(point.memoryPct)}%</title></circle></g>)}
      </svg>
      <div className="chart-dates"><span>{formatDate(points[0]?.timestamp)}</span><span>{formatDate(last?.timestamp)}</span></div>
    </div>
  );
}

export function DeviceDrawer({ id, revision, onClose, onEdit, onDocument, onAsk }: {
  id: string;
  revision: number;
  onClose: () => void;
  onEdit: (target: EditorTarget) => void;
  onDocument: (id: string) => void;
  onAsk: (question: string) => void;
}) {
  const detail = useRemote(`/api/devices/${encodeURIComponent(id)}`, codecs.device, revision);
  const siteId = detail.data?.device.siteId;
  const vlans = useRemote(siteId ? queryPath("/api/vlans", { siteId }) : null, codecs.vlans, revision);
  const device = detail.data?.device;
  const latest = detail.data?.metrics.reduce<Metric | undefined>((current, point) => !current || point.timestamp > current.timestamp ? point : current, undefined);
  return (
    <Modal title={device?.hostname ?? "Detail perangkat"} subtitle="NETWORK INVENTORY · SIMULATION" onClose={onClose} className="device-drawer">
      {detail.loading && <Loading label="Memuat perangkat, interface, dan metrik…" />}
      {detail.error && <ErrorState message={detail.error} retry={detail.reload} />}
      {device && detail.data && <div className="page-stack">
        <div className="device-detail-hero"><span className={`device-avatar device-avatar-large type-${device.type}`}><DeviceIcon type={device.type} size={29} /></span><div><div className="inline-gap"><h3>{device.hostname}</h3><HealthBadge status={device.status} /></div><p>{device.vendor} {device.model} · {deviceTypeNames[device.type]} · {detail.data.site.name}</p><p className="mono">{device.managementIp} <span className="muted">/ v{device.version}</span></p></div></div>
        <p className="detail-description">{device.description || "Belum ada deskripsi perangkat."}</p>
        <div className="detail-actions"><button className="button button-secondary" onClick={() => onEdit({ kind: "update_device", device })}><Pencil size={15} />Ubah atribut</button><button className="button button-ghost" onClick={() => { onClose(); onAsk(`Investigasi kondisi ${device.hostname}. Gunakan metrics, interface, alert, dan dokumen terkait; sertakan sumber dan waktu snapshot.`); }}><Sparkles size={15} />Investigasi dengan Copilot</button><button className="icon-button danger-text" aria-label={`Ajukan penghapusan ${device.hostname}`} onClick={() => onEdit({ kind: "delete_device", device })}><Trash2 size={17} /></button></div>
        <div className="detail-facts"><span><HardDrive size={14} />Firmware <strong>{device.firmware}</strong></span><span><MapPin size={14} />{detail.data.site.region}</span><span><Database size={14} />ID <code>{device.id}</code></span></div>
        <section className="detail-section">
          <div className="section-title"><h3><Activity size={17} />Metrik snapshot</h3><span className="badge badge-subtle">HISTORICAL · NOT LIVE</span></div>
          <p className="muted small">Sampel terakhir: {formatDate(latest?.timestamp)}. Tidak ada polling perangkat fisik.</p>
          <div className="metric-grid">
            <div><Cpu size={15} /><span>CPU</span><strong>{number(latest?.cpuPct)}<small>%</small></strong></div>
            <div><Layers size={15} /><span>Memory</span><strong>{number(latest?.memoryPct)}<small>%</small></strong></div>
            <div><ArrowDownLeft size={15} /><span>Bandwidth in / out</span><strong>{number(latest?.bandwidthInMbps)} <small>/ {number(latest?.bandwidthOutMbps)} Mbps</small></strong></div>
            <div><Radio size={15} /><span>Packet loss</span><strong className={latest && latest.packetLossPct > 0 ? "text-amber" : ""}>{number(latest?.packetLossPct)}<small>%</small></strong></div>
          </div>
          <MetricTrend metrics={detail.data.metrics} />
        </section>
        <section className="detail-section">
          <div className="section-title"><h3><EthernetPort size={17} />Interface & VLAN</h3><span className="muted small">{detail.data.interfaces.length} interface</span></div>
          {vlans.loading && <Loading label="Memuat VLAN lokasi…" />}
          {vlans.error && <ErrorState message={vlans.error} retry={vlans.reload} />}
          {detail.data.interfaces.length === 0 ? <Empty title="Belum ada interface" /> : <div className="table-scroll"><table className="interface-table"><thead><tr><th>Interface</th><th>Admin / oper</th><th>VLAN</th><th>Utilisasi</th><th>Error</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>{detail.data.interfaces.map((port) => {
            const vlan = vlans.data?.find((item) => item.id === port.vlanId);
            return <tr key={port.id}><td><span className="stack-cell"><strong className="mono">{port.name}</strong><small>{port.role} · {number(port.speedMbps)} Mbps</small></span></td><td><span className="port-status"><span className={`text-${port.adminStatus === "up" ? "teal" : "red"}`}>{port.adminStatus}</span><span>/</span><span className={`text-${port.operStatus === "up" ? "teal" : "red"}`}>{port.operStatus}</span></span></td><td>{port.vlanId === null ? "—" : vlan ? `${vlan.number} · ${vlan.name}` : port.vlanId}</td><td><span className="utilization"><span><i style={{ width: `${port.utilizationPct}%` }} className={port.utilizationPct > 75 ? "utilization-warning" : ""} /></span>{number(port.utilizationPct)}%</span></td><td className={port.errors > 0 ? "text-amber mono" : "mono muted"}>{number(port.errors)}</td><td><button className="icon-button" aria-label={`Ajukan edit admin status atau VLAN ${port.name}`} onClick={() => onEdit({ kind: "update_interface", device, port })}><Pencil size={14} /></button></td></tr>;
          })}</tbody></table></div>}
        </section>
        <section className="detail-section">
          <div className="section-title"><h3><BellRing size={17} />Alert perangkat</h3></div>
          {!detail.data.alerts.length && <p className="muted small">Tidak ada alert terkait perangkat pada snapshot ini.</p>}
          {detail.data.alerts.map((alert) => <div className={`device-alert ${alert.severity}`} key={alert.id}><BellRing size={17} /><div><strong>{alert.title}</strong><p>{alert.description}</p><span className="muted small">{alert.code} · {alert.status} · {formatDate(alert.createdAt)}</span></div></div>)}
        </section>
        <section className="detail-section">
          <div className="section-title"><h3><FileText size={17} />Dokumen terkait</h3></div>
          {!detail.data.documents.length && <p className="muted small">Belum ada dokumen terkait perangkat.</p>}
          {detail.data.documents.map((document) => <button className="document-link" key={document.id} onClick={() => onDocument(document.id)}><FileText size={17} /><span><strong>{document.title}</strong><small>{document.kind} · v{document.version}</small></span><ArrowRight size={16} /></button>)}
        </section>
      </div>}
    </Modal>
  );
}
