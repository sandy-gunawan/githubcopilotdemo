import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  FileCheck2,
  GitPullRequest,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  changeInputSchema,
  deviceTypeSchema,
  documentKindSchema,
  healthSchema,
  operationSchema,
} from "../shared/schemas";
import type {
  ChangeInput,
  ChangePreview,
  ChangeRequest,
  Device,
  NetworkDocument,
  NetworkInterface,
  Operation,
  Site,
} from "../shared/schemas";
import { codecs, errorMessage, queryPath, request, useRemote } from "./api";
import type { Remote } from "./api";
import {
  Empty,
  ErrorState,
  formatDate,
  JsonBlock,
  Loading,
  Modal,
  Notice,
  PageHeading,
} from "./ui";

export type EditorTarget =
  | { kind: "add_device" }
  | { kind: "update_device"; device: Device }
  | { kind: "delete_device"; device: Device }
  | { kind: "update_interface"; device: Device; port: NetworkInterface }
  | { kind: "add_document" }
  | { kind: "update_document"; document: NetworkDocument }
  | { kind: "delete_document"; document: NetworkDocument }
  | { kind: "advanced" };

type DeviceDraft = Extract<Operation, { kind: "add_device" }>["device"];
type DocumentDraft = Extract<Operation, { kind: "add_document" }>["document"];

const defaultDevice: DeviceDraft = {
  id: "demo-sw-01",
  hostname: "DEMO-SW-01",
  managementIp: "10.30.0.250",
  siteId: "site-br",
  status: "healthy",
  type: "switch",
  model: "Demo",
  vendor: "Simulator",
  firmware: "demo-1.0",
  description: "Perangkat tambahan untuk latihan approval di NetOps Lab.",
};
const editorTitles: Record<EditorTarget["kind"], string> = {
  add_device: "Tambah perangkat",
  update_device: "Ubah atribut perangkat",
  delete_device: "Hapus perangkat",
  update_interface: "Ubah admin status / VLAN",
  add_document: "Tambah dokumen",
  update_document: "Ubah dokumen",
  delete_document: "Hapus dokumen",
  advanced: "Operasi lanjutan",
};
export const operationNames: Record<Operation["kind"], string> = {
  add_device: "Tambah perangkat",
  update_device: "Ubah perangkat",
  delete_device: "Hapus perangkat",
  update_interface: "Ubah interface",
  add_document: "Tambah dokumen",
  update_document: "Ubah dokumen",
  delete_document: "Hapus dokumen",
};
export const changeStatusNames: Record<ChangeRequest["status"], string> = {
  pending: "Menunggu approval",
  applied: "Diterapkan",
  rejected: "Ditolak",
  failed: "Gagal diterapkan",
};

function Field({ label, hint, children, wide = false }: {
  label: string; hint?: string; children: ReactNode; wide?: boolean;
}) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function PreviewDiff({ preview }: { preview: ChangePreview }) {
  return <div className="preview-content">
    <div className="impact-box"><h4><ShieldCheck size={17} />Dampak menurut backend</h4>{preview.impact.length ? <ul>{preview.impact.map((impact, index) => <li key={`${index}-${impact}`}>{impact}</li>)}</ul> : <p>Tidak ada catatan dampak tambahan dari backend.</p>}</div>
    <div className="diff-grid"><div className="diff-before"><span className="diff-label">SEBELUM</span><JsonBlock value={preview.before} /></div><div className="diff-after"><span className="diff-label">SESUDAH</span><JsonBlock value={preview.after} /></div></div>
    <details className="raw-operation"><summary><Code2 size={14} />Lihat operation JSON<ChevronDown size={14} /></summary><JsonBlock value={preview.operation} /></details>
  </div>;
}

function targetName(operation: Operation): string {
  switch (operation.kind) {
    case "add_device": return operation.device.hostname;
    case "update_device":
    case "delete_device": return operation.deviceId;
    case "update_interface": return operation.interfaceId;
    case "add_document": return operation.document.title;
    case "update_document":
    case "delete_document": return operation.documentId;
  }
}

export function ChangeDialog({ target, sites, revision, onClose, onCreated, onOpenChanges }: {
  target: EditorTarget;
  sites: Site[];
  revision: number;
  onClose: () => void;
  onCreated: () => void;
  onOpenChanges: () => void;
}) {
  const originalDevice = target.kind === "update_device" ? target.device : undefined;
  const originalDocument = target.kind === "update_document" ? target.document : undefined;
  const [device, setDevice] = useState<DeviceDraft>(() => originalDevice ? {
    id: originalDevice.id,
    hostname: originalDevice.hostname,
    type: originalDevice.type,
    vendor: originalDevice.vendor,
    model: originalDevice.model,
    managementIp: originalDevice.managementIp,
    siteId: originalDevice.siteId,
    status: originalDevice.status,
    description: originalDevice.description,
    firmware: originalDevice.firmware,
  } : { ...defaultDevice });
  const [document, setDocument] = useState<DocumentDraft>(() => originalDocument ? {
    id: originalDocument.id,
    title: originalDocument.title,
    kind: originalDocument.kind,
    siteId: originalDocument.siteId,
    deviceId: originalDocument.deviceId,
    content: originalDocument.content,
    tags: originalDocument.tags,
  } : { id: "demo-runbook-01", title: "", kind: "runbook", siteId: null, deviceId: null, content: "", tags: [] });
  const [tags, setTags] = useState(originalDocument?.tags.join(", ") ?? "");
  const [adminStatus, setAdminStatus] = useState<NetworkInterface["adminStatus"]>(target.kind === "update_interface" ? target.port.adminStatus : "up");
  const [vlanId, setVlanId] = useState(target.kind === "update_interface" ? target.port.vlanId ?? "" : "");
  const [reason, setReason] = useState("");
  const [advanced, setAdvanced] = useState(JSON.stringify({ kind: "add_device", device: defaultDevice }, null, 2));
  const [stage, setStage] = useState<"edit" | "preview" | "submitted">("edit");
  const [preview, setPreview] = useState<ChangePreview>();
  const [previewInput, setPreviewInput] = useState<ChangeInput>();
  const [created, setCreated] = useState<ChangeRequest>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const interfaceSite = target.kind === "update_interface" ? target.device.siteId : null;
  const vlans = useRemote(interfaceSite ? queryPath("/api/vlans", { siteId: interfaceSite }) : null, codecs.vlans, revision);
  const devices = useRemote(target.kind === "add_document" ? "/api/devices" : null, codecs.devices, revision);
  const matchingVlans = vlans.data?.filter((vlan) => vlan.siteId === interfaceSite) ?? [];
  const invalidVlan = target.kind === "update_interface" && Boolean(vlanId) && !matchingVlans.some((vlan) => vlan.id === vlanId);
  const isDocumentEdit = target.kind === "add_document" || target.kind === "update_document";
  const isDeviceEdit = target.kind === "add_device" || target.kind === "update_device";
  const isDelete = target.kind === "delete_device" || target.kind === "delete_document";

  function makeOperation(): Operation {
    const parsedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    switch (target.kind) {
      case "add_device": return { kind: target.kind, device };
      case "update_device": return {
        kind: target.kind, deviceId: target.device.id, expectedVersion: target.device.version,
        patch: { description: device.description, managementIp: device.managementIp, firmware: device.firmware },
      };
      case "delete_device": return { kind: target.kind, deviceId: target.device.id, expectedVersion: target.device.version };
      case "update_interface": return {
        kind: target.kind, interfaceId: target.port.id, expectedVersion: target.port.version,
        patch: { adminStatus, vlanId: vlanId || null },
      };
      case "add_document": return { kind: target.kind, document: { ...document, tags: parsedTags } };
      case "update_document": return {
        kind: target.kind, documentId: target.document.id, expectedVersion: target.document.version,
        patch: { title: document.title, content: document.content, tags: parsedTags },
      };
      case "delete_document": return { kind: target.kind, documentId: target.document.id, expectedVersion: target.document.version };
      case "advanced": {
        const parsed: unknown = JSON.parse(advanced);
        return operationSchema.parse(parsed);
      }
    }
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError(null);
    let input: ChangeInput;
    try {
      input = changeInputSchema.parse({ reason: reason.trim(), operation: makeOperation() });
    } catch (failure) {
      setError(failure instanceof z.ZodError
        ? failure.issues.map((issue) => `${issue.path.join(".") || "operation"}: ${issue.message}`).join("\n")
        : errorMessage(failure));
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await request("/api/changes/preview", codecs.preview, { method: "POST", body: input });
      setPreview(result);
      setPreviewInput(input);
      setStage("preview");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function submitRequest() {
    if (!previewInput || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await request("/api/changes", codecs.change, { method: "POST", body: previewInput });
      setCreated(result);
      setStage("submitted");
      onCreated();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal title={editorTitles[target.kind]} subtitle="SIMULATION · Semua perubahan melalui approval operator" onClose={onClose} busy={busy} className="change-dialog">
      <ol className="stepper" aria-label="Tahapan perubahan"><li className={stage === "edit" ? "current" : "done"}><span>{stage !== "edit" ? <Check size={13} /> : "1"}</span>Isi operasi</li><li className={stage === "preview" ? "current" : stage === "submitted" ? "done" : ""}><span>{stage === "submitted" ? <Check size={13} /> : "2"}</span>Preview server</li><li className={stage === "submitted" ? "current" : ""}><span>3</span>Antrean approval</li></ol>
      {error && <Notice tone="error" title="Permintaan tidak berhasil"><p className="preserve-lines">{error}</p>{stage === "preview" && <p>Jika hasil kirim tidak pasti, periksa antrean sebelum mencoba lagi. Tidak ada retry otomatis.</p>}</Notice>}
      {stage === "edit" && <form onSubmit={handlePreview}>
        <fieldset className="form-fieldset" disabled={busy}>
          {target.kind === "advanced" && <>
            <Notice tone="warning">Editor JSON untuk operation sesuai kontrak shared. Tidak melewati validasi, preview, version check, atau approval.</Notice>
            <Field label="Operation JSON" wide hint="Masukkan operation saja; alasan diisi pada field terpisah."><textarea className="code-input" value={advanced} onChange={(event) => setAdvanced(event.target.value)} rows={16} required spellCheck={false} /></Field>
          </>}
          {target.kind === "update_device" && <div className="immutable-summary"><ServerLabel />{target.device.hostname}<span className="muted">ID {target.device.id} · versi {target.device.version}</span></div>}
          {isDeviceEdit && <div className="form-grid">
            {target.kind === "add_device" && <>
              <Field label="ID perangkat" hint="Harus unik; gunakan ID baru, bukan ID perangkat seed."><input required value={device.id} onChange={(event) => setDevice({ ...device, id: event.target.value })} spellCheck={false} /></Field>
              <Field label="Hostname"><input required value={device.hostname} onChange={(event) => setDevice({ ...device, hostname: event.target.value })} spellCheck={false} /></Field>
              <Field label="Tipe"><select value={device.type} onChange={(event) => setDevice({ ...device, type: deviceTypeSchema.parse(event.target.value) })}><option value="router">Router</option><option value="switch">Switch</option><option value="firewall">Firewall</option><option value="access_point">Access point</option></select></Field>
              <Field label="Lokasi"><select required value={device.siteId} onChange={(event) => setDevice({ ...device, siteId: event.target.value })}><option value="" disabled>Pilih lokasi</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></Field>
              <Field label="Vendor"><input required maxLength={80} value={device.vendor} onChange={(event) => setDevice({ ...device, vendor: event.target.value })} /></Field>
              <Field label="Model"><input required maxLength={80} value={device.model} onChange={(event) => setDevice({ ...device, model: event.target.value })} /></Field>
              <Field label="Kondisi awal"><select value={device.status} onChange={(event) => setDevice({ ...device, status: healthSchema.parse(event.target.value) })}><option value="healthy">Sehat</option><option value="warning">Peringatan</option><option value="critical">Kritis</option><option value="offline">Offline</option></select></Field>
            </>}
            <Field label="Management IP" hint="Alamat IPv4 pada dataset simulasi."><input required value={device.managementIp} onChange={(event) => setDevice({ ...device, managementIp: event.target.value })} spellCheck={false} inputMode="decimal" /></Field>
            <Field label="Firmware"><input required maxLength={80} value={device.firmware} onChange={(event) => setDevice({ ...device, firmware: event.target.value })} /></Field>
            <Field label="Deskripsi" wide><textarea maxLength={500} rows={3} value={device.description} onChange={(event) => setDevice({ ...device, description: event.target.value })} /></Field>
          </div>}
          {target.kind === "update_device" && <p className="form-note">Edit hanya mengubah deskripsi, management IP, dan firmware. Identitas, lokasi, tipe, serta kondisi perangkat tidak diubah.</p>}
          {target.kind === "update_interface" && <>
            <div className="immutable-summary"><Code2 size={17} />{target.device.hostname} / {target.port.name}<span className="muted">versi {target.port.version} · {target.port.role}</span></div>
            <Notice>Admin status dan VLAN adalah konfigurasi simulasi. Oper status serta metrik tidak diedit. Hanya VLAN dari lokasi perangkat yang ditawarkan.</Notice>
            {vlans.loading && <Loading label="Memuat VLAN yang sesuai lokasi…" />}
            {vlans.error && <ErrorState message={vlans.error} retry={vlans.reload} />}
            <div className="form-grid">
              <Field label="Admin status"><select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value === "down" ? "down" : "up")}><option value="up">Up — aktif administratif</option><option value="down">Down — nonaktif administratif</option></select></Field>
              <Field label="VLAN lokasi perangkat" hint={sites.find((site) => site.id === target.device.siteId)?.name ?? target.device.siteId}><select value={vlanId} onChange={(event) => setVlanId(event.target.value)} disabled={!vlans.data}><option value="">Tanpa VLAN (null)</option>{matchingVlans.map((vlan) => <option value={vlan.id} key={vlan.id}>{vlan.number} · {vlan.name} · {vlan.subnet}</option>)}</select></Field>
            </div>
            {invalidVlan && !vlans.loading && <Notice tone="warning">VLAN terpilih tidak ditemukan di lokasi perangkat. Pilih VLAN yang sesuai atau tanpa VLAN sebelum preview.</Notice>}
          </>}
          {isDocumentEdit && <div className="form-grid">
            {target.kind === "add_document" && <>
              <Field label="ID dokumen"><input required value={document.id} onChange={(event) => setDocument({ ...document, id: event.target.value })} spellCheck={false} /></Field>
              <Field label="Jenis dokumen"><select value={document.kind} onChange={(event) => setDocument({ ...document, kind: documentKindSchema.parse(event.target.value) })}><option value="runbook">Runbook</option><option value="incident">Insiden</option><option value="config">Konfigurasi</option><option value="log">Log</option></select></Field>
              <Field label="Lokasi terkait (opsional)"><select value={document.siteId ?? ""} onChange={(event) => setDocument({ ...document, siteId: event.target.value || null, deviceId: null })}><option value="">Tidak terkait lokasi</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></Field>
              <Field label="Perangkat terkait (opsional)"><select value={document.deviceId ?? ""} onChange={(event) => setDocument({ ...document, deviceId: event.target.value || null })} disabled={devices.loading || Boolean(devices.error)}><option value="">Tidak terkait perangkat</option>{devices.data?.filter((item) => !document.siteId || item.siteId === document.siteId).map((item) => <option value={item.id} key={item.id}>{item.hostname}</option>)}</select></Field>
              {devices.error && <div className="field-wide"><ErrorState message={devices.error} retry={devices.reload} /></div>}
            </>}
            <Field label="Judul" wide><input required minLength={3} maxLength={200} value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} placeholder="Judul yang mudah ditemukan" /></Field>
            <Field label="Tags" wide hint="Pisahkan dengan koma; maksimal 15 tag, masing-masing maksimal 40 karakter."><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="network, troubleshooting, demo" /></Field>
            <Field label="Konten" wide hint="Teks / Markdown disimpan sebagai sumber pengetahuan. Jangan masukkan kredensial atau data sensitif."><textarea required rows={10} maxLength={100_000} value={document.content} onChange={(event) => setDocument({ ...document, content: event.target.value })} placeholder="Tuliskan langkah, bukti, dan konteks operasional…" /></Field>
          </div>}
          {target.kind === "update_document" && <p className="form-note">Hanya judul, konten, dan tags yang berubah. Jenis, relasi lokasi/perangkat, serta sourcePath tetap.</p>}
          {isDelete && <Notice tone="warning" title="Penghapusan tetap memerlukan preview & approval">
            <p>Target: <strong>{target.kind === "delete_device" ? target.device.hostname : target.document.title}</strong>.</p>
            {target.kind === "delete_device" ? <p>Perangkat seed memiliki dependensi interface, link, metrik, alert, atau dokumen. Backend akan menolak penghapusan yang tidak aman; pesan aslinya akan ditampilkan.</p> : <p>Konten ini akan dihapus dari knowledge base hanya setelah operator menyetujui permintaan.</p>}
          </Notice>}
          <Field label="Alasan perubahan" wide hint={`${reason.trim().length}/1000 karakter · minimal 10 karakter.`}><textarea required minLength={10} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Jelaskan tujuan dan alasan perubahan untuk reviewer…" /></Field>
          <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Batal</button><button type="submit" className="button button-primary" disabled={busy || (target.kind === "update_interface" && (vlans.loading || Boolean(vlans.error) || invalidVlan))}>{busy ? <LoaderCircle size={16} className="spin" /> : <FileCheck2 size={16} />}{busy ? "Meminta preview…" : "Preview perubahan"}<ArrowRight size={16} /></button></div>
        </fieldset>
      </form>}
      {stage === "preview" && preview && previewInput && <div className="page-stack">
        <Notice title="Belum ada data yang diubah">Preview ini berasal dari backend. Mengirim permintaan berikutnya hanya menambahkan ke antrean; operator menyetujui atau menolak pada tab Perubahan.</Notice>
        <div className="reason-summary"><span className="field-label">ALASAN</span><p>{previewInput.reason}</p></div>
        <PreviewDiff preview={preview} />
        <div className="modal-actions"><button className="button button-ghost" disabled={busy} onClick={() => { setStage("edit"); setError(null); }}><ArrowLeft size={15} />Kembali edit</button><button className="button button-primary" disabled={busy} onClick={() => void submitRequest()}>{busy ? <LoaderCircle size={16} className="spin" /> : <GitPullRequest size={16} />}{busy ? "Mengirim…" : "Kirim ke antrean"}</button></div>
      </div>}
      {stage === "submitted" && created && <div className="submitted-state">
        <span className="submitted-icon"><CheckCheck size={35} /></span><h3>Permintaan tercatat</h3><span className={`badge change-${created.status}`}>{changeStatusNames[created.status]}</span><p className="mono">{created.id}</p><p>{created.status === "pending" ? "Data belum berubah. Tinjau dan setujui secara terpisah di antrean Perubahan." : "Lihat status dan detail server pada antrean Perubahan."}</p>{created.error && <Notice tone="error">{created.error}</Notice>}<button className="button button-primary" onClick={onOpenChanges}>Buka antrean perubahan<ArrowRight size={16} /></button><button className="text-button" onClick={onClose}>Tutup</button>
      </div>}
    </Modal>
  );
}

function ServerLabel() {
  return <Code2 size={17} aria-hidden="true" />;
}

export function ChangesPage({ changes, onRefresh, onAdvanced }: {
  changes: Remote<ChangeRequest[]>;
  onRefresh: () => void;
  onAdvanced: () => void;
}) {
  const [filter, setFilter] = useState("pending");
  const [decision, setDecision] = useState<{ change: ChangeRequest; decision: "approve" | "reject" } | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const rows = [...(changes.data ?? [])]
    .filter((change) => !filter || change.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="page-stack">
    <PageHeading eyebrow="HUMAN-IN-THE-LOOP" title="Antrean perubahan" description="AI dapat mengajukan. Operator tetap memegang kendali untuk menyetujui dan menerapkan." actions={<button className="button button-secondary" onClick={onAdvanced}><Plus size={16} />Operasi JSON</button>} />
    <Notice title="Approval hanya melalui antarmuka operator">Tidak ada tool MCP untuk approve/apply. Tinjau alasan, versi, dan dampak backend sebelum menyetujui. Perubahan hanya memengaruhi database simulasi.</Notice>
    {message && <Notice tone={message.error ? "error" : "success"}>{message.text}</Notice>}
    <div className="changes-toolbar"><div className="segmented-control" aria-label="Filter status perubahan">{[
      { value: "pending", label: "Menunggu" }, { value: "applied", label: "Diterapkan" }, { value: "rejected", label: "Ditolak" }, { value: "failed", label: "Gagal" }, { value: "", label: "Semua" },
    ].map((item) => <button key={item.value} aria-pressed={filter === item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}<span>{changes.data?.filter((change) => !item.value || change.status === item.value).length ?? "—"}</span></button>)}</div><button className="icon-button" aria-label="Muat ulang antrean" onClick={changes.reload}><RefreshCw size={17} /></button></div>
    {changes.loading && <Loading label="Memuat antrean perubahan…" />}
    {changes.error && <ErrorState message={changes.error} retry={changes.reload} />}
    {!changes.loading && !changes.error && rows.length === 0 && <section className="panel"><Empty title={filter === "pending" ? "Antrean bersih. Kendali tetap di tangan Anda." : "Belum ada permintaan dengan status ini"}>Ajukan dari form perangkat, interface, dokumen, atau minta Copilot membuat change request.</Empty></section>}
    <div className="change-list">{rows.map((change) => <article className={`panel change-card change-card-${change.status}`} key={change.id}>
      <div className="change-card-heading"><span className="change-card-icon"><GitPullRequest size={22} /></span><div><h3>{operationNames[change.operation.kind]} <span className="mono">{targetName(change.operation)}</span></h3><p><code>{change.id}</code><span>·</span>{formatDate(change.createdAt)}<span>·</span>{change.requestedBy === "agent" ? "Diajukan agent" : "Diajukan operator"}</p></div><span className={`badge change-${change.status}`}>{changeStatusNames[change.status]}</span></div>
      <p className="change-reason">{change.reason}</p>
      {change.error && <Notice tone="error" title="Pesan backend">{change.error}</Notice>}
      <details className="change-details"><summary><Code2 size={15} />Tinjau before / after & dampak<ChevronDown size={15} /></summary><PreviewDiff preview={change.preview} /></details>
      <div className="change-card-footer">{change.status === "pending" ? <><span className="muted small"><Clock3 size={14} />Belum diterapkan ke dataset</span><div className="inline-gap"><button className="button button-small button-ghost danger-text" onClick={() => { setMessage(null); setDecision({ change, decision: "reject" }); }}><X size={15} />Tolak</button><button className="button button-small button-primary" onClick={() => { setMessage(null); setDecision({ change, decision: "approve" }); }}><Check size={16} />Setujui & terapkan</button></div></> : <span className="muted small"><CheckCircle2 size={14} />Diputuskan: {formatDate(change.decidedAt)}</span>}</div>
    </article>)}</div>
    {decision && <DecisionDialog value={decision} onClose={() => setDecision(null)} onDecided={(result) => {
      setDecision(null);
      setMessage({ error: result.status === "failed", text: result.status === "failed" ? `Backend gagal menerapkan ${result.id}: ${result.error ?? "Lihat detail permintaan."}` : `${result.id}: ${changeStatusNames[result.status]}.` });
      onRefresh();
    }} />}
  </div>;
}

function DecisionDialog({ value, onClose, onDecided }: {
  value: { change: ChangeRequest; decision: "approve" | "reject" };
  onClose: () => void;
  onDecided: (result: ChangeRequest) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const approve = value.decision === "approve";
  async function decide() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await request(`/api/changes/${encodeURIComponent(value.change.id)}/decision`, codecs.change, {
        method: "POST", body: { decision: value.decision },
      });
      onDecided(result);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <Modal title={approve ? "Setujui & terapkan perubahan?" : "Tolak permintaan perubahan?"} subtitle={value.change.id} busy={busy} onClose={onClose} className="change-dialog">
    <div className="page-stack"><Notice tone={approve ? "warning" : "info"}>{approve ? "Tindakan ini menerapkan operasi ke database simulasi. Backend memeriksa ulang versi dan dependensi saat approval; preview lama bukan jaminan penerapan berhasil." : "Permintaan ditolak; operasi tidak diterapkan ke dataset."}</Notice><div className="reason-summary"><span className="field-label">ALASAN PERMINTAAN</span><p>{value.change.reason}</p></div><PreviewDiff preview={value.change.preview} />{error && <Notice tone="error"><p>{error}</p><p>Jika hasil tidak pasti, tutup dan muat ulang antrean sebelum mengulang keputusan.</p></Notice>}<div className="modal-actions"><button className="button button-ghost" disabled={busy} onClick={onClose}>Batal</button><button className={`button ${approve ? "button-primary" : "button-danger"}`} disabled={busy} onClick={() => void decide()}>{busy ? <LoaderCircle size={16} className="spin" /> : approve ? <ShieldCheck size={16} /> : <X size={16} />}{busy ? "Memproses…" : approve ? "Ya, setujui & terapkan" : "Ya, tolak permintaan"}</button></div></div>
  </Modal>;
}

export function ResetDialog({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "RESET DEMO" || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await request("/api/demo/reset", codecs.overview, { method: "POST", body: { confirmation } });
      onReset();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <Modal title="Kembalikan dataset demo?" subtitle="TINDAKAN EKSPLISIT · TIDAK OTOMATIS" onClose={onClose} busy={busy} className="small-dialog"><form onSubmit={reset}><div className="page-stack"><Notice tone="warning" title="Perubahan latihan dapat hilang">Reset mengembalikan database demo ke data seed. Percakapan sebelumnya dapat merujuk kondisi yang sudah berubah. Ini tidak menyentuh perangkat jaringan nyata.</Notice>{error && <Notice tone="error">{error}</Notice>}<Field label="Ketik RESET DEMO untuk mengonfirmasi"><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="RESET DEMO" autoComplete="off" disabled={busy} required /></Field><div className="modal-actions"><button type="button" className="button button-ghost" disabled={busy} onClick={onClose}>Batal</button><button type="submit" className="button button-danger" disabled={confirmation !== "RESET DEMO" || busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <TriangleAlert size={16} />}{busy ? "Mereset…" : "Reset dataset demo"}</button></div></div></form></Modal>;
}
