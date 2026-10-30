import { z } from "zod";

export const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/);
export const deviceTypeSchema = z.enum(["router", "switch", "firewall", "access_point"]);
export const healthSchema = z.enum(["healthy", "warning", "critical", "offline"]);
export const documentKindSchema = z.enum(["runbook", "incident", "config", "log"]);
const percent = z.number().min(0).max(100);

export const siteSchema = z.object({
  id: idSchema,
  name: z.string(),
  code: z.string(),
  region: z.string(),
  type: z.enum(["head_office", "data_center", "branch"]),
});
export const deviceSchema = z.object({
  id: idSchema,
  hostname: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,49}$/),
  type: deviceTypeSchema,
  vendor: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  managementIp: z.ipv4(),
  siteId: idSchema,
  status: healthSchema,
  description: z.string().max(500),
  firmware: z.string().min(1).max(80),
  version: z.number().int().positive(),
});
export const vlanSchema = z.object({
  id: idSchema,
  siteId: idSchema,
  number: z.number().int().min(1).max(4094),
  name: z.string(),
  subnet: z.string(),
});
export const interfaceSchema = z.object({
  id: idSchema,
  deviceId: idSchema,
  name: z.string(),
  role: z.enum(["uplink", "access", "wan"]),
  adminStatus: z.enum(["up", "down"]),
  operStatus: z.enum(["up", "down"]),
  speedMbps: z.number().positive(),
  vlanId: idSchema.nullable(),
  utilizationPct: percent,
  errors: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export const linkSchema = z.object({
  id: idSchema,
  sourceInterfaceId: idSchema,
  targetInterfaceId: idSchema,
  bandwidthMbps: z.number().positive(),
  status: z.enum(["up", "down"]),
});
export const metricSchema = z.object({
  id: idSchema,
  deviceId: idSchema,
  timestamp: z.iso.datetime(),
  cpuPct: percent,
  memoryPct: percent,
  bandwidthInMbps: z.number().nonnegative(),
  bandwidthOutMbps: z.number().nonnegative(),
  packetLossPct: percent,
});
export const alertSchema = z.object({
  id: idSchema,
  deviceId: idSchema,
  interfaceId: idSchema.nullable(),
  severity: z.enum(["warning", "critical"]),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["open", "acknowledged", "resolved"]),
  createdAt: z.iso.datetime(),
});
export const documentSchema = z.object({
  id: idSchema,
  title: z.string().min(3).max(200),
  kind: documentKindSchema,
  siteId: idSchema.nullable(),
  deviceId: idSchema.nullable(),
  tags: z.array(z.string().min(1).max(40)).max(15),
  content: z.string().min(1).max(100_000),
  sourcePath: z.string().nullable(),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});
export const seedSchema = z.object({
  datasetVersion: z.literal("netops-demo-v1"),
  snapshotAt: z.iso.datetime(),
  sites: z.array(siteSchema),
  devices: z.array(deviceSchema),
  vlans: z.array(vlanSchema),
  interfaces: z.array(interfaceSchema),
  links: z.array(linkSchema),
  metrics: z.array(metricSchema),
  alerts: z.array(alertSchema),
  documents: z.array(documentSchema),
});

export const deviceCreateSchema = deviceSchema.omit({ version: true }).strict();
export const documentCreateSchema = documentSchema.omit({
  version: true,
  updatedAt: true,
  sourcePath: true,
}).strict();
export const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add_device"), device: deviceCreateSchema }).strict(),
  z.object({
    kind: z.literal("update_device"),
    deviceId: idSchema,
    expectedVersion: z.number().int().positive(),
    patch: deviceSchema.pick({
      description: true, managementIp: true, firmware: true,
    }).partial().strict().refine((value) => Object.keys(value).length > 0, "Patch tidak boleh kosong."),
  }).strict(),
  z.object({
    kind: z.literal("delete_device"),
    deviceId: idSchema,
    expectedVersion: z.number().int().positive(),
  }).strict(),
  z.object({
    kind: z.literal("update_interface"),
    interfaceId: idSchema,
    expectedVersion: z.number().int().positive(),
    patch: interfaceSchema.pick({ adminStatus: true, vlanId: true }).partial().strict()
      .refine((value) => Object.keys(value).length > 0, "Patch tidak boleh kosong."),
  }).strict(),
  z.object({ kind: z.literal("add_document"), document: documentCreateSchema }).strict(),
  z.object({
    kind: z.literal("update_document"),
    documentId: idSchema,
    expectedVersion: z.number().int().positive(),
    patch: documentSchema.pick({ title: true, content: true, tags: true }).partial().strict()
      .refine((value) => Object.keys(value).length > 0, "Patch tidak boleh kosong."),
  }).strict(),
  z.object({
    kind: z.literal("delete_document"),
    documentId: idSchema,
    expectedVersion: z.number().int().positive(),
  }).strict(),
]);
export const changeInputSchema = z.object({
  reason: z.string().min(10).max(1000),
  operation: operationSchema,
}).strict();

export type Site = z.infer<typeof siteSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type Vlan = z.infer<typeof vlanSchema>;
export type NetworkInterface = z.infer<typeof interfaceSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type NetworkDocument = z.infer<typeof documentSchema>;
export type SeedBundle = z.infer<typeof seedSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type ChangeInput = z.infer<typeof changeInputSchema>;

export interface ChangePreview {
  operation: Operation;
  before: Device | NetworkInterface | NetworkDocument | null;
  after: Device | NetworkInterface | NetworkDocument | null;
  impact: string[];
}
export interface ChangeRequest extends ChangeInput {
  id: string;
  status: "pending" | "applied" | "rejected" | "failed";
  requestedBy: "agent" | "operator";
  createdAt: string;
  decidedAt: string | null;
  error: string | null;
  preview: ChangePreview;
}
export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  targetId: string;
  detail: string;
}
export type DocumentSummary = Omit<NetworkDocument, "content">;
export interface DocumentSearchHit extends DocumentSummary {
  excerpt: string;
  score: number;
}
export interface DeviceDetail {
  device: Device;
  site: Site;
  interfaces: NetworkInterface[];
  metrics: Metric[];
  alerts: Alert[];
  documents: DocumentSummary[];
}
export interface Topology {
  sites: Site[];
  devices: Device[];
  interfaces: NetworkInterface[];
  links: Link[];
}
export interface Overview {
  simulation: true;
  datasetVersion: string;
  snapshotAt: string;
  sites: Site[];
  counts: { devices: number; interfaces: number; links: number; documents: number; metrics: number };
  health: Record<Device["status"], number>;
  alerts: Alert[];
  scenarios: { id: string; title: string; deviceId: string; evidence: string }[];
}
export interface AgentStatus {
  status: "not_started" | "ready" | "unavailable";
  provider: "GitHub Copilot SDK";
  model: string;
  message: string;
}
export interface ToolTrace {
  id: string;
  tool: string;
  arguments: unknown;
  result?: unknown;
  success?: boolean;
  startedAt: string;
  completedAt?: string;
}
export interface ChatResponse {
  conversationId: string;
  content: string;
  traces: ToolTrace[];
  provider: "GitHub Copilot SDK";
}
export const SUGGESTED_QUESTIONS = [
  "Bagaimana kesehatan network di semua lokasi?",
  "Mengapa koneksi branch Bandung lambat? Gabungkan metrics, log, dan runbook.",
  "Cari runbook untuk interface down dan cek kondisi DC-SW-02.",
  "Tunjukkan device yang berpotensi terdampak uplink BR-SW-01.",
  "Buat change request untuk mengubah VLAN port Gi0/2 pada BR-SW-01 ke VLAN 20. Jangan terapkan sebelum approval.",
] as const;
