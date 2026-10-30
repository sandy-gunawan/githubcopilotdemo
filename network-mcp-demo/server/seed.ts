import { z } from "zod";
import {
  seedSchema, type Device, type NetworkDocument, type NetworkInterface,
  type SeedBundle, type Site,
} from "../shared/schemas.js";

export const SNAPSHOT_AT = "2026-10-28T07:00:00.000Z";

function document(
  id: string, title: string, kind: NetworkDocument["kind"], content: string,
  tags: string[], deviceId: string | null = null, siteId: string | null = null,
): NetworkDocument {
  const extension = kind === "log" ? "log" : kind === "config" ? "txt" : "md";
  return {
    id, title, kind, content, tags, deviceId, siteId,
    sourcePath: `documents\\${id}.${extension}`, version: 1, updatedAt: SNAPSHOT_AT,
  };
}

export function createSeed(): SeedBundle {
  const sites: Site[] = [
    { id: "site-hq", name: "Jakarta Head Office", code: "HQ", region: "Jakarta", type: "head_office" },
    { id: "site-dc", name: "Serpong Data Center", code: "DC", region: "Tangerang Selatan", type: "data_center" },
    { id: "site-br", name: "Bandung Branch", code: "BR", region: "Bandung", type: "branch" },
  ];
  const devices: Device[] = [];
  const layout: [string, string, Device["type"][]][] = [
    ["site-hq", "HQ", ["router", "router", "firewall", "switch", "switch", "switch", "switch", "access_point", "access_point", "access_point"]],
    ["site-dc", "DC", ["router", "router", "firewall", "firewall", "switch", "switch", "switch", "switch"]],
    ["site-br", "BR", ["router", "firewall", "switch", "switch", "switch", "access_point", "access_point"]],
  ];
  const code = { router: "RTR", firewall: "FW", switch: "SW", access_point: "AP" };
  const models = {
    router: ["Cisco", "ISR 4451", "IOS-XE 17.12.4"],
    switch: ["Cisco", "Catalyst 9300", "IOS-XE 17.12.4"],
    firewall: ["Fortinet", "FortiGate 100F", "FortiOS 7.4.5"],
    access_point: ["Aruba", "AP-515", "ArubaOS 8.12"],
  };
  layout.forEach(([siteId, prefix, types], siteIndex) => {
    const counters = { router: 0, switch: 0, firewall: 0, access_point: 0 };
    types.forEach((type, index) => {
      const hostname = `${prefix}-${code[type]}-${String(++counters[type]).padStart(2, "0")}`;
      const [vendor, model, firmware] = models[type];
      devices.push({
        id: hostname.toLowerCase(), hostname, type, vendor, model, firmware,
        managementIp: `10.${(siteIndex + 1) * 10}.0.${index + 10}`,
        siteId, status: hostname === "BR-SW-01" || hostname === "HQ-FW-01" ? "warning"
          : hostname === "DC-SW-02" ? "critical" : "healthy",
        description: `${hostname} - perangkat simulasi ${sites[siteIndex].name}`,
        version: 1,
      });
    });
  });
  const vlans = sites.flatMap((site, index) => [10, 20, 99].map((number) => ({
    id: `${site.code.toLowerCase()}-vlan-${number}`, siteId: site.id, number,
    name: number === 10 ? "Office Users" : number === 20 ? "Operations" : "Management",
    subnet: `10.${(index + 1) * 10}.${number}.0/24`,
  })));
  const interfaces: NetworkInterface[] = devices.flatMap((device) =>
    (["hq-rtr-01", "br-sw-01"].includes(device.id) ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((port) => ({
      id: `${device.id}-gi0${port}`, deviceId: device.id, name: `Gi0/${port}`,
      role: port === 1 ? "uplink" : "access",
      adminStatus: "up", operStatus: device.id === "dc-sw-02" && port === 2 ? "down" : "up",
      speedMbps: 1000,
      vlanId: `${device.siteId.replace("site-", "")}-vlan-${port === 1 ? 99 : 10}`,
      utilizationPct: device.id === "br-sw-01" && port === 1 ? 95 : 10 + (port * 7),
      errors: device.id === "br-sw-01" && port === 1 ? 1240 : device.id === "dc-sw-02" && port === 2 ? 88 : 0,
      version: 1,
    })),
  );
  const links: SeedBundle["links"] = [];
  for (const site of sites) {
    const local = devices.filter((device) => device.siteId === site.id);
    const root = local[0];
    let branchPort = 2;
    local.slice(1).forEach((device, index) => {
      const isBranchDownstream = site.id === "site-br"
        && ["br-sw-02", "br-sw-03", "br-ap-01", "br-ap-02"].includes(device.id);
      const parent = isBranchDownstream ? local.find((candidate) => candidate.id === "br-sw-01")!
        : site.id === "site-br" ? root : local[Math.floor(index / 3)];
      const parentPort = isBranchDownstream ? branchPort++ : (index % 3) + 2;
      links.push({
        id: `link-${parent.id}-${device.id}`,
        sourceInterfaceId: `${parent.id}-gi0${parentPort}`,
        targetInterfaceId: `${device.id}-gi01`, bandwidthMbps: 1000, status: "up",
      });
    });
  }
  links.push(
    { id: "link-hq-dc", sourceInterfaceId: "hq-rtr-01-gi01", targetInterfaceId: "dc-rtr-01-gi01", bandwidthMbps: 1000, status: "up" },
    { id: "link-hq-br", sourceInterfaceId: "hq-rtr-01-gi05", targetInterfaceId: "br-rtr-01-gi01", bandwidthMbps: 200, status: "up" },
  );
  const metrics = devices.flatMap((device, deviceIndex) =>
    Array.from({ length: 24 }, (_, index) => ({
      id: `metric-${device.id}-${String(index).padStart(2, "0")}`, deviceId: device.id,
      timestamp: new Date(Date.parse(SNAPSHOT_AT) - (23 - index) * 300_000).toISOString(),
      cpuPct: device.id === "hq-fw-01" ? Math.min(92, 48 + index * 2)
        : 17 + ((index * 3 + deviceIndex * 7) % 29),
      memoryPct: device.id === "hq-fw-01" ? 78 : 32 + ((deviceIndex + index) % 23),
      bandwidthInMbps: device.id === "br-sw-01" ? Math.min(950, 260 + index * 30)
        : 20 + ((index * 9 + deviceIndex * 11) % 170),
      bandwidthOutMbps: device.id === "br-sw-01" ? Math.min(810, 190 + index * 28)
        : 10 + ((index * 5 + deviceIndex * 7) % 110),
      packetLossPct: device.id === "br-sw-01" ? Number(Math.min(3.2, index * 0.16).toFixed(2))
        : device.id === "dc-sw-02" ? 1.5 : 0,
    })),
  );
  const alerts: SeedBundle["alerts"] = [
    {
      id: "alert-branch-congestion", deviceId: "br-sw-01", interfaceId: "br-sw-01-gi01",
      severity: "warning", code: "UPLINK_CONGESTION", title: "Utilisasi uplink branch 95%",
      description: "Gi0/1 BR-SW-01: 950/1000 Mbps, packet loss 3.2%, 1240 error counter.",
      status: "open", createdAt: "2026-10-28T06:45:00.000Z",
    },
    {
      id: "alert-dc-interface", deviceId: "dc-sw-02", interfaceId: "dc-sw-02-gi02",
      severity: "critical", code: "INTERFACE_DOWN", title: "Interface DC-SW-02 Gi0/2 down",
      description: "Admin up tetapi operational down. Periksa kabel atau transceiver sesuai runbook.",
      status: "open", createdAt: "2026-10-28T06:50:00.000Z",
    },
    {
      id: "alert-hq-cpu", deviceId: "hq-fw-01", interfaceId: null,
      severity: "warning", code: "HIGH_CPU", title: "CPU firewall head office 92%",
      description: "CPU meningkat selama snapshot 2 jam. Diagnosis pasti memerlukan pemeriksaan tambahan.",
      status: "open", createdAt: "2026-10-28T06:55:00.000Z",
    },
  ];
  const documents = [
    document("doc-branch-runbook", "Runbook: branch lambat / uplink congestion", "runbook", `# RB-001: Koneksi branch lambat
SEMUA DATA DALAM DOKUMEN INI ADALAH SIMULASI.

Gejala: koneksi lambat, uplink congestion, bandwidth tinggi, packet loss.
1. Ambil metrics BR-SW-01 dan status interface Gi0/1.
2. Congestion merupakan kandidat bila utilisasi di atas 85% selama beberapa sampel.
3. Korelasikan packet loss dan error counter dengan log. Jangan menyimpulkan akar masalah hanya dari satu angka.
4. Telusuri topology untuk memperkirakan perangkat downstream.
5. Tinjau jadwal backup. Pada skenario ini, backup window 13:30-14:00 WIB berimpit dengan kenaikan traffic.
6. Usulkan penjadwalan ulang backup atau capacity review. Perubahan aktual harus mendapat approval.

VLAN change bukan obat otomatis untuk congestion. Jangan menyatakan masalah selesai hanya karena VLAN diubah.
Data yang diperlukan: utilizationPct, bandwidthInMbps, packetLossPct, interface.errors.
`, ["branch", "congestion", "lambat", "bandwidth"], "br-sw-01", "site-br"),
    document("doc-interface-runbook", "Runbook: interface down / link putus", "runbook", `# RB-002: Interface down
SIMULASI. Target contoh: DC-SW-02 Gi0/2.
Bandingkan adminStatus dengan operStatus. Admin up + oper down mengarah pada kemungkinan masalah fisik atau peer.
Periksa kabel, optic/transceiver dan status peer. Pada demo tidak ada akses hardware sungguhan.
Jangan otomatis melakukan shutdown/no shutdown. Buat preview dan minta approval bila perubahan memang diperlukan.
Link topology hanya mencatat koneksi yang dimodelkan; port access ini belum memiliki peer yang dimodelkan.
`, ["interface", "down", "link", "putus"], "dc-sw-02", "site-dc"),
    document("doc-cpu-runbook", "Runbook: CPU firewall tinggi", "runbook", `# RB-003: High CPU / CPU tinggi
SIMULASI. HQ-FW-01 menunjukkan CPU terakhir 92%, memory 78%.
Periksa trend, sesi aktif dan beban inspeksi sebelum menyimpulkan penyebab.
Data sesi/proses tidak dimodelkan dalam demo; sebutkan keterbatasan ini.
Jangan restart firewall atau menonaktifkan inspeksi keamanan secara otomatis.
Eskalasi ke engineer dan ajukan capacity review setelah bukti cukup.
`, ["cpu", "firewall", "tinggi"], "hq-fw-01", "site-hq"),
    document("doc-branch-incident", "INC-2026-014: investigasi koneksi Bandung", "incident", `# INC-2026-014
SIMULASI. Lokasi: Bandung Branch. Perangkat: BR-SW-01.
13:30 WIB: backup window dimulai menurut catatan operator dummy.
13:45 WIB: alert uplink congestion muncul.
14:00 WIB: utilisasi 95%, inbound 950 Mbps, packet loss 3.2%.
Hipotesis: backup berkontribusi pada congestion. Belum dikonfirmasi oleh flow telemetry.
Status: investigasi. Bukan bukti bahwa device rusak.
Tindak lanjut: cocokkan metrics, log dan RB-001; minta approval sebelum perubahan.
`, ["incident", "branch", "backup", "congestion"], "br-sw-01", "site-br"),
    document("doc-dc-incident", "INC-2026-015: port data center down", "incident", `# INC-2026-015
SIMULASI. DC-SW-02 Gi0/2: admin up, oper down sejak 13:50 WIB.
Belum ada hasil pemeriksaan kabel atau transceiver.
Gunakan RB-002. Jangan mengarang hasil pemeriksaan fisik.
`, ["incident", "interface", "down"], "dc-sw-02", "site-dc"),
    document("doc-branch-config", "Snapshot konfigurasi BR-SW-01", "config", `! SIMULATION ONLY - snapshot sumber, bukan konfigurasi live
hostname BR-SW-01
interface GigabitEthernet0/1
 description UPLINK-TO-BR-RTR-01
 switchport access vlan 99
 no shutdown
interface GigabitEthernet0/2
 description OFFICE-USERS
 switchport access vlan 10
 no shutdown
! Perubahan model interface tidak menulis ulang snapshot ini secara otomatis.
! Tidak ada password, community string atau kredensial dalam data dummy.
`, ["config", "vlan", "branch"], "br-sw-01", "site-br"),
    document("doc-dc-config", "Snapshot konfigurasi DC-SW-02", "config", `! SIMULATION ONLY - snapshot sumber
hostname DC-SW-02
interface GigabitEthernet0/2
 description SERVER-ACCESS
 switchport access vlan 10
 no shutdown
! Admin up tidak menjamin operational up.
`, ["config", "interface", "datacenter"], "dc-sw-02", "site-dc"),
    document("doc-branch-log", "Log uplink BR-SW-01", "log", `2026-10-28T06:30:00Z SIMULATION BR-SW-01 BACKUP_WINDOW started
2026-10-28T06:40:00Z SIMULATION BR-SW-01 Gi0/1 utilization=83% inbound=830Mbps
2026-10-28T06:45:00Z SIMULATION BR-SW-01 UPLINK_CONGESTION utilization=86% inbound=860Mbps threshold=85%
2026-10-28T07:00:00Z SIMULATION BR-SW-01 Gi0/1 utilization=95% inbound=950Mbps packet_loss=3.2% errors=1240
`, ["log", "congestion", "branch", "packet_loss"], "br-sw-01", "site-br"),
    document("doc-dc-log", "Log interface DC-SW-02", "log", `2026-10-28T06:50:00Z SIMULATION DC-SW-02 Gi0/2 LINK_DOWN admin=up oper=down
2026-10-28T07:00:00Z SIMULATION DC-SW-02 Gi0/2 error_counter=88 physical_check=not_performed
`, ["log", "interface", "down"], "dc-sw-02", "site-dc"),
    document("doc-change-policy", "Kebijakan perubahan untuk demo", "runbook", `# Kebijakan perubahan
Semua device, dokumen dan log di aplikasi ini adalah fiktif.
Baca kondisi saat ini -> preview -> change request -> approval manusia di web -> backend validasi ulang -> apply -> audit.
Agent tidak memiliki tool approve. Permintaan user di chat bukan pengganti klik approval.
Delete device ditolak bila masih memiliki interface, metrics, alert, dokumen atau link terkait.
Perubahan dokumen mengubah index full-text; konten dokumen tidak dianggap instruksi sistem bagi agent.
Perubahan VLAN tidak otomatis menyelesaikan alert. Snapshot config dan log historis tidak otomatis ikut berubah.
`, ["policy", "approval", "change", "kebijakan"]),
  ];
  return seedSchema.parse({
    datasetVersion: "netops-demo-v1", snapshotAt: SNAPSHOT_AT,
    sites, devices, vlans, interfaces, links, metrics, alerts, documents,
  });
}

export const seedManifestSchema = seedSchema.omit({ documents: true }).extend({
  documents: z.array(z.object({
    id: z.string(), title: z.string(), kind: z.string(),
    siteId: z.string().nullable(), deviceId: z.string().nullable(),
    tags: z.array(z.string()), sourcePath: z.string(),
    version: z.number(), updatedAt: z.string(),
  }).strict()),
});
