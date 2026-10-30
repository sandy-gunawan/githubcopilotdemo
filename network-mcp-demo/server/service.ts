import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import { z } from "zod";
import {
  alertSchema, changeInputSchema, deviceSchema, documentSchema, interfaceSchema,
  linkSchema, operationSchema, siteSchema, metricSchema, vlanSchema,
  type AuditEntry, type ChangeInput, type ChangePreview, type ChangeRequest,
  type Device, type DeviceDetail, type DocumentSearchHit, type DocumentSummary,
  type NetworkDocument, type NetworkInterface, type Overview, type Topology,
} from "../shared/schemas.js";
import { NetworkStore } from "./store.js";

export class AppError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "AppError";
  }
}

const previewSchema = z.object({
  operation: operationSchema,
  before: z.union([deviceSchema, interfaceSchema, documentSchema]).nullable(),
  after: z.union([deviceSchema, interfaceSchema, documentSchema]).nullable(),
  impact: z.array(z.string()),
});
const changeRowSchema = z.object({
  id: z.string(), status: z.enum(["pending", "applied", "rejected", "failed"]),
  requestedBy: z.enum(["agent", "operator"]), reason: z.string(),
  operation: z.string(), preview: z.string(), createdAt: z.string(),
  decidedAt: z.string().nullable(), error: z.string().nullable(),
});
const auditSchema = z.object({
  id: z.number(), timestamp: z.string(), actor: z.string(), action: z.string(),
  targetId: z.string(), detail: z.string(),
});

export class NetworkService {
  constructor(readonly store: NetworkStore) {}

  private rows<T>(schema: z.ZodType<T>, sql: string, ...args: SQLInputValue[]): T[] {
    return z.array(schema).parse(this.store.db.prepare(sql).all(...args));
  }

  listSites() {
    return this.rows(siteSchema, "SELECT * FROM sites ORDER BY code");
  }

  listVlans(siteId?: string) {
    return this.rows(vlanSchema, `SELECT * FROM vlans ${siteId ? "WHERE siteId = ?" : ""} ORDER BY siteId, number`,
      ...(siteId ? [siteId] : []));
  }

  listDevices(filters: { siteId?: string; status?: string; type?: string; query?: string } = {}): Device[] {
    const conditions: string[] = [];
    const values: SQLInputValue[] = [];
    for (const key of ["siteId", "status", "type"] as const) {
      if (filters[key]) {
        conditions.push(`${key} = ?`);
        values.push(filters[key]!);
      }
    }
    if (filters.query) {
      conditions.push("(instr(lower(hostname), lower(?)) > 0 OR instr(managementIp, ?) > 0 OR instr(lower(description), lower(?)) > 0)");
      values.push(filters.query, filters.query, filters.query);
    }
    return this.rows(deviceSchema,
      `SELECT * FROM devices ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY hostname`, ...values);
  }

  device(identifier: string): Device {
    const device = this.rows(deviceSchema, "SELECT * FROM devices WHERE id = ? OR hostname = ? COLLATE NOCASE",
      identifier, identifier)[0];
    if (!device) throw new AppError(404, "DEVICE_NOT_FOUND", `Device tidak ditemukan: ${identifier}`);
    return device;
  }

  networkInterface(id: string): NetworkInterface {
    const item = this.rows(interfaceSchema, "SELECT * FROM interfaces WHERE id = ?", id)[0];
    if (!item) throw new AppError(404, "INTERFACE_NOT_FOUND", `Interface tidak ditemukan: ${id}`);
    return item;
  }

  getDevice(identifier: string): DeviceDetail {
    const device = this.device(identifier);
    const site = this.listSites().find((item) => item.id === device.siteId);
    if (!site) throw new AppError(500, "DATA_INTEGRITY", "Site device tidak tersedia.");
    return {
      device, site,
      interfaces: this.rows(interfaceSchema, "SELECT * FROM interfaces WHERE deviceId = ? ORDER BY name", device.id),
      metrics: this.getMetrics(device.id),
      alerts: this.listAlerts({ deviceId: device.id }),
      documents: this.listDocuments({ deviceId: device.id }),
    };
  }

  getMetrics(identifier: string, limit = 24) {
    const device = this.device(identifier);
    return this.rows(metricSchema,
      "SELECT * FROM (SELECT * FROM metrics WHERE deviceId = ? ORDER BY timestamp DESC LIMIT ?) ORDER BY timestamp",
      device.id, limit);
  }

  listAlerts(filters: { deviceId?: string; siteId?: string; severity?: string } = {}) {
    const conditions = ["a.status != 'resolved'"];
    const values: SQLInputValue[] = [];
    for (const [field, value] of [
      ["a.deviceId", filters.deviceId], ["d.siteId", filters.siteId], ["a.severity", filters.severity],
    ]) {
      if (value) {
        conditions.push(`${field} = ?`);
        values.push(value);
      }
    }
    return this.rows(alertSchema, `SELECT a.* FROM alerts a JOIN devices d ON a.deviceId = d.id
      WHERE ${conditions.join(" AND ")} ORDER BY a.severity, a.createdAt DESC`, ...values);
  }

  overview(): Overview {
    const devices = this.listDevices();
    const health = { healthy: 0, warning: 0, critical: 0, offline: 0 };
    for (const device of devices) health[device.status]++;
    return {
      simulation: true, datasetVersion: this.store.metadata("datasetVersion") || "uninitialized",
      snapshotAt: this.store.metadata("snapshotAt") || "",
      sites: this.listSites(), health,
      counts: {
        devices: devices.length, interfaces: this.store.count("interfaces"),
        links: this.store.count("links"), documents: this.store.count("documents"), metrics: this.store.count("metrics"),
      },
      alerts: this.listAlerts(),
      scenarios: [
        { id: "congestion", title: "Branch congestion", deviceId: "br-sw-01", evidence: "Uplink 95% / loss 3.2%" },
        { id: "interface", title: "Interface down", deviceId: "dc-sw-02", evidence: "Gi0/2 admin up / oper down" },
        { id: "cpu", title: "High firewall CPU", deviceId: "hq-fw-01", evidence: "CPU 92% / memory 78%" },
      ],
    };
  }

  topology(): Topology {
    return {
      sites: this.listSites(), devices: this.listDevices(),
      interfaces: this.rows(interfaceSchema, "SELECT * FROM interfaces ORDER BY id"),
      links: this.rows(linkSchema, "SELECT * FROM links ORDER BY id"),
    };
  }

  neighbors(identifier: string) {
    const device = this.device(identifier);
    const topology = this.topology();
    const interfaceById = new Map(topology.interfaces.map((item) => [item.id, item]));
    const direct = topology.links.flatMap((link) => {
      const source = interfaceById.get(link.sourceInterfaceId)!;
      const target = interfaceById.get(link.targetInterfaceId)!;
      if (source.deviceId !== device.id && target.deviceId !== device.id) return [];
      const local = source.deviceId === device.id ? source : target;
      const peer = source.deviceId === device.id ? target : source;
      return [{ link, localInterface: local, peerInterface: peer, peerDevice: this.device(peer.deviceId) }];
    });
    const upstream = direct.find((item) => item.localInterface.role === "uplink");
    const adjacency = new Map<string, Set<string>>();
    for (const link of topology.links) {
      const left = interfaceById.get(link.sourceInterfaceId)!.deviceId;
      const right = interfaceById.get(link.targetInterfaceId)!.deviceId;
      if (!adjacency.has(left)) adjacency.set(left, new Set());
      if (!adjacency.has(right)) adjacency.set(right, new Set());
      adjacency.get(left)!.add(right);
      adjacency.get(right)!.add(left);
    }
    const visited = new Set([device.id]);
    if (upstream) visited.add(upstream.peerDevice.id);
    const queue = [...(adjacency.get(device.id) || [])].filter((id) => !visited.has(id));
    const downstream: Device[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const candidate = this.device(id);
      if (candidate.siteId !== device.siteId) continue;
      downstream.push(candidate);
      for (const next of adjacency.get(id) || []) if (!visited.has(next)) queue.push(next);
    }
    return {
      device, neighbors: direct, potentialDownstream: downstream,
      caveat: "Potensi dampak berdasarkan graph simulasi tanpa redundancy/routing dinamis; bukan bukti outage aktual.",
    };
  }

  private parseDocument(row: Record<string, unknown>): NetworkDocument {
    return documentSchema.parse({ ...row, tags: JSON.parse(z.string().parse(row.tags)) });
  }

  getDocument(id: string): NetworkDocument {
    const row = this.store.db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
    if (!row) throw new AppError(404, "DOCUMENT_NOT_FOUND", `Dokumen tidak ditemukan: ${id}`);
    return this.parseDocument(row);
  }

  listDocuments(filters: { kind?: string; deviceId?: string; siteId?: string } = {}): DocumentSummary[] {
    const conditions: string[] = [];
    const values: SQLInputValue[] = [];
    for (const key of ["kind", "deviceId", "siteId"] as const) {
      if (filters[key]) {
        conditions.push(`${key} = ?`);
        values.push(filters[key]!);
      }
    }
    return this.store.db.prepare(`SELECT * FROM documents
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY title`).all(...values)
      .map((row) => {
        const { content: _content, ...summary } = this.parseDocument(row);
        return summary;
      });
  }

  searchDocuments(query: string, filters: { kind?: string; deviceId?: string; siteId?: string } = {}): DocumentSearchHit[] {
    const tokens = query.match(/[\p{L}\p{N}_-]+/gu)?.slice(0, 12) || [];
    if (!tokens.length) throw new AppError(400, "SEARCH_EMPTY", "Masukkan kata pencarian, misalnya congestion atau interface down.");
    const match = tokens.map((token) => `"${token.replaceAll('"', '""')}"`).join(" OR ");
    const conditions = ["documents_fts MATCH ?"];
    const values: SQLInputValue[] = [match];
    for (const key of ["kind", "deviceId", "siteId"] as const) {
      if (filters[key]) {
        conditions.push(`d.${key} = ?`);
        values.push(filters[key]!);
      }
    }
    return this.store.db.prepare(`SELECT d.*, bm25(documents_fts) AS score,
      snippet(documents_fts, 1, '', '', ' ... ', 35) AS excerpt
      FROM documents_fts JOIN documents d ON d.rowid = documents_fts.rowid
      WHERE ${conditions.join(" AND ")} ORDER BY score LIMIT 20`).all(...values).map((row) => {
      const { content: _content, ...summary } = this.parseDocument(row);
      return { ...summary, score: z.number().parse(row.score), excerpt: z.string().parse(row.excerpt) };
    });
  }

  private assertVersion(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new AppError(409, "STALE_VERSION", `Versi sudah berubah (saat ini ${actual}, diminta ${expected}). Baca ulang lalu buat request baru.`);
    }
  }

  private ensureDeviceUnique(device: Device): void {
    const duplicate = this.store.db.prepare(
      "SELECT id FROM devices WHERE (hostname = ? COLLATE NOCASE OR managementIp = ?) AND id != ?",
    ).get(device.hostname, device.managementIp, device.id);
    if (duplicate) throw new AppError(409, "DEVICE_DUPLICATE", "Hostname atau management IP sudah digunakan.");
  }

  private ensureSiteAndDevice(siteId: string | null, deviceId: string | null): void {
    if (siteId && !this.listSites().some((site) => site.id === siteId)) {
      throw new AppError(400, "SITE_INVALID", `Site tidak ditemukan: ${siteId}`);
    }
    if (deviceId) {
      const device = this.device(deviceId);
      if (siteId && device.siteId !== siteId) {
        throw new AppError(400, "SITE_MISMATCH", "Site dokumen berbeda dari site device.");
      }
    }
  }

  previewChange(input: ChangeInput): ChangePreview {
    const { operation } = changeInputSchema.parse(input);
    const impact = ["Hanya database simulasi yang berubah; tidak ada koneksi ke device asli."];
    switch (operation.kind) {
      case "add_device": {
        if (this.store.db.prepare("SELECT id FROM devices WHERE id = ?").get(operation.device.id)) {
          throw new AppError(409, "DEVICE_DUPLICATE", "ID device sudah digunakan.");
        }
        const after = { ...operation.device, version: 1 };
        this.ensureSiteAndDevice(after.siteId, null);
        this.ensureDeviceUnique(after);
        impact.push("Device baru belum mempunyai interface, metrics, link atau alert.");
        return { operation, before: null, after, impact };
      }
      case "update_device": {
        const before = this.device(operation.deviceId);
        this.assertVersion(before.version, operation.expectedVersion);
        const after = { ...before, ...operation.patch, version: before.version + 1 };
        this.ensureDeviceUnique(after);
        return { operation, before, after, impact };
      }
      case "delete_device": {
        const before = this.device(operation.deviceId);
        this.assertVersion(before.version, operation.expectedVersion);
        const references = ["interfaces", "metrics", "alerts", "documents"]
          .filter((table) => Number(this.store.db.prepare(`SELECT count(*) AS total FROM ${table} WHERE deviceId = ?`).get(before.id)?.total) > 0);
        if (references.length) {
          throw new AppError(409, "DEVICE_HAS_DEPENDENCIES", `Delete ditolak: device masih dirujuk oleh ${references.join(", ")}. Gunakan device demo baru tanpa dependensi.`);
        }
        impact.push("Device dihapus permanen dari inventory simulasi setelah approval.");
        return { operation, before, after: null, impact };
      }
      case "update_interface": {
        const before = this.networkInterface(operation.interfaceId);
        this.assertVersion(before.version, operation.expectedVersion);
        const device = this.device(before.deviceId);
        if (operation.patch.vlanId) {
          const vlan = this.listVlans().find((item) => item.id === operation.patch.vlanId);
          if (!vlan || vlan.siteId !== device.siteId) {
            throw new AppError(400, "VLAN_INVALID", "VLAN harus tersedia pada site yang sama dengan interface.");
          }
        }
        const after = { ...before, ...operation.patch, version: before.version + 1 };
        if (operation.patch.adminStatus === "down") after.operStatus = "down";
        if (operation.patch.adminStatus === "up" && before.adminStatus === "down") {
          after.operStatus = "down";
          impact.push("Admin up tidak membuktikan link pulih; operStatus tetap down sampai ada observasi baru.");
        }
        impact.push(
          "Snapshot config, metrics, error counter dan alert historis tidak otomatis diubah.",
          "Perubahan VLAN bukan perbaikan otomatis untuk congestion.",
        );
        if (before.role === "uplink") impact.push("PERHATIAN: perubahan menyentuh uplink dan berpotensi memutus konektivitas downstream.");
        return { operation, before, after, impact };
      }
      case "add_document": {
        if (this.store.db.prepare("SELECT id FROM documents WHERE id = ?").get(operation.document.id)) {
          throw new AppError(409, "DOCUMENT_DUPLICATE", "ID dokumen sudah digunakan.");
        }
        this.ensureSiteAndDevice(operation.document.siteId, operation.document.deviceId);
        const after = {
          ...operation.document, sourcePath: null, version: 1, updatedAt: new Date().toISOString(),
        };
        impact.push("Konten akan masuk index full-text; file seed asli tidak diubah.");
        return { operation, before: null, after, impact };
      }
      case "update_document": {
        const before = this.getDocument(operation.documentId);
        this.assertVersion(before.version, operation.expectedVersion);
        const after = { ...before, ...operation.patch, version: before.version + 1, updatedAt: new Date().toISOString() };
        impact.push("Index full-text diperbarui dalam transaksi yang sama; file seed asli tetap.");
        return { operation, before, after, impact };
      }
      case "delete_document": {
        const before = this.getDocument(operation.documentId);
        this.assertVersion(before.version, operation.expectedVersion);
        impact.push("Dokumen dan entri index full-text dihapus; salinan sumber seed tetap tersedia.");
        return { operation, before, after: null, impact };
      }
    }
  }

  createChange(input: ChangeInput, requestedBy: "agent" | "operator"): ChangeRequest {
    const parsed = changeInputSchema.parse(input);
    return this.store.transaction(() => {
      const preview = this.previewChange(parsed);
      const id = `chg-${randomUUID()}`;
      const createdAt = new Date().toISOString();
      this.store.db.prepare(`INSERT INTO changes
        (id, status, requestedBy, reason, operation, preview, createdAt) VALUES (?, 'pending', ?, ?, ?, ?, ?)`)
        .run(id, requestedBy, parsed.reason, JSON.stringify(parsed.operation), JSON.stringify(preview), createdAt);
      this.store.audit(requestedBy, "change.requested", id, `${parsed.operation.kind}: ${parsed.reason}`);
      return this.getChange(id);
    });
  }

  getChange(id: string): ChangeRequest {
    const raw = this.store.db.prepare("SELECT * FROM changes WHERE id = ?").get(id);
    if (!raw) throw new AppError(404, "CHANGE_NOT_FOUND", `Change request tidak ditemukan: ${id}`);
    const row = changeRowSchema.parse(raw);
    return { ...row, operation: operationSchema.parse(JSON.parse(row.operation)), preview: previewSchema.parse(JSON.parse(row.preview)) };
  }

  listChanges(): ChangeRequest[] {
    return this.store.db.prepare("SELECT id FROM changes ORDER BY createdAt DESC LIMIT 100").all()
      .map((row) => this.getChange(z.string().parse(row.id)));
  }

  decideChange(id: string, decision: "approve" | "reject"): ChangeRequest {
    try {
      return this.store.transaction(() => {
        const request = this.getChange(id);
        if (request.status !== "pending") throw new AppError(409, "CHANGE_DECIDED", "Request ini sudah diproses.");
        const now = new Date().toISOString();
        if (decision === "reject") {
          this.store.db.prepare("UPDATE changes SET status = 'rejected', decidedAt = ? WHERE id = ?").run(now, id);
          this.store.audit("operator", "change.rejected", id, request.reason);
          return this.getChange(id);
        }
        const preview = this.previewChange({ reason: request.reason, operation: request.operation });
        this.apply(preview);
        this.store.db.prepare("UPDATE changes SET status = 'applied', decidedAt = ?, preview = ? WHERE id = ?")
          .run(now, JSON.stringify(preview), id);
        this.store.audit("operator", "change.approved_and_applied", id,
          `${request.operation.kind}; validasi ulang versi berhasil; ${request.reason}`);
        return this.getChange(id);
      });
    } catch (error) {
      if (error instanceof AppError && this.getChange(id).status === "pending") {
        this.store.transaction(() => {
          this.store.db.prepare("UPDATE changes SET status = 'failed', decidedAt = ?, error = ? WHERE id = ?")
            .run(new Date().toISOString(), error.message, id);
          this.store.audit("operator", "change.failed", id, error.message);
        });
      }
      throw error;
    }
  }

  private apply(preview: ChangePreview): void {
    const operation = preview.operation;
    switch (operation.kind) {
      case "add_device": {
        const device = deviceSchema.parse(preview.after);
        this.store.db.prepare(`INSERT INTO devices
          (id,hostname,type,vendor,model,managementIp,siteId,status,description,firmware,version)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
          device.id, device.hostname, device.type, device.vendor, device.model, device.managementIp,
          device.siteId, device.status, device.description, device.firmware, device.version,
        );
        break;
      }
      case "update_device": {
        const device = deviceSchema.parse(preview.after);
        this.store.db.prepare("UPDATE devices SET description = ?, managementIp = ?, firmware = ?, version = ? WHERE id = ?")
          .run(device.description, device.managementIp, device.firmware, device.version, device.id);
        break;
      }
      case "delete_device":
        this.store.db.prepare("DELETE FROM devices WHERE id = ?").run(operation.deviceId);
        break;
      case "update_interface": {
        const item = interfaceSchema.parse(preview.after);
        this.store.db.prepare("UPDATE interfaces SET adminStatus = ?, operStatus = ?, vlanId = ?, version = ? WHERE id = ?")
          .run(item.adminStatus, item.operStatus, item.vlanId, item.version, item.id);
        if (item.adminStatus === "down") {
          this.store.db.prepare("UPDATE links SET status = 'down' WHERE sourceInterfaceId = ? OR targetInterfaceId = ?")
            .run(item.id, item.id);
        }
        break;
      }
      case "add_document": {
        const item = documentSchema.parse(preview.after);
        this.store.db.prepare(`INSERT INTO documents
          (id,title,kind,siteId,deviceId,tags,content,sourcePath,version,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .run(item.id, item.title, item.kind, item.siteId, item.deviceId, JSON.stringify(item.tags),
            item.content, item.sourcePath, item.version, item.updatedAt);
        break;
      }
      case "update_document": {
        const item = documentSchema.parse(preview.after);
        this.store.db.prepare("UPDATE documents SET title = ?, content = ?, tags = ?, version = ?, updatedAt = ? WHERE id = ?")
          .run(item.title, item.content, JSON.stringify(item.tags), item.version, item.updatedAt, item.id);
        break;
      }
      case "delete_document":
        this.store.db.prepare("DELETE FROM documents WHERE id = ?").run(operation.documentId);
        break;
    }
  }

  audit(): AuditEntry[] {
    return this.rows(auditSchema, "SELECT * FROM audit ORDER BY id DESC LIMIT 200");
  }
}
