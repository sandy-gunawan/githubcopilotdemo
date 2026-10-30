# Referensi lanjutan: kontrak MCP

Tidak perlu menghafal format protokol untuk menggunakan demo.
Untuk belajar langkah demi langkah, baca [Apa yang terjadi saat tool dipanggil?](../04-mcp.md).

## Inti cara kerjanya

MCP membuat agent bisa **menemukan daftar operasi** dan **memanggil operasi**
dengan parameter yang jelas.

<img src="../diagrams/alur-akses-mcp.png" alt="Perjalanan permintaan dari user, agent dan MCP sampai service membaca SQLite dan mengembalikan hasil" width="100%">

Sumber yang dapat diedit: [alur-akses-mcp.drawio](../diagrams/alur-akses-mcp.drawio).

Agent tidak membaca seluruh database pada awal percakapan. Data yang dibutuhkan
diambil saat tool dipanggil. Ini bukan proses training atau fine-tuning.

## Discovery

Saat client tersambung, protokol MCP melakukan initialization. Client lalu dapat
memanggil `tools/list` untuk melihat nama, deskripsi dan input schema setiap tool.

Contoh konseptual discovery:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

MCP SDK menangani handshake dan header protokol. Gunakan SDK/client MCP untuk
integrasi normal; jangan menganggap `/mcp` sebagai endpoint REST biasa.

## Contoh structured read

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_device",
    "arguments": {
      "deviceId": "BR-SW-01"
    }
  }
}
```

Handler memvalidasi argumen, mencari device berdasarkan ID/hostname, lalu
mengambil interface, metrics, alert dan metadata dokumen terkait.

Hasil tool memakai envelope:

```json
{
  "simulation": true,
  "data": {
    "device": {
      "id": "br-sw-01",
      "hostname": "BR-SW-01",
      "version": 1
    },
    "interfaces": [
      {
        "id": "br-sw-01-gi01",
        "utilizationPct": 95,
        "errors": 1240
      }
    ]
  }
}
```

Contoh di atas dipersingkat. Implementasi mengembalikan objek lengkap. Envelope
tersedia sebagai text content JSON dan `structuredContent` MCP.

## Contoh unstructured read

Pertama cari:

```json
{
  "name": "search_documents",
  "arguments": {
    "query": "congestion",
    "deviceId": "br-sw-01"
  }
}
```

Search menghasilkan ID, judul, metadata, excerpt dan score, **bukan semua dokumen
secara penuh**. Setelah menemukan dokumen relevan:

```json
{
  "name": "get_document",
  "arguments": {
    "documentId": "doc-branch-runbook"
  }
}
```

Agent menerima isi teks lengkap dan dapat menggabungkannya dengan metrics.
FTS hanya membantu menemukan teks; model yang menyusun penjelasan.

## Daftar 17 tools

| Tool | Parameter utama | Hasil / tujuan |
|---|---|---|
| `network_overview` | tidak ada | Jumlah entity, health, alert, timestamp |
| `list_sites` | tidak ada | Site dan ID untuk filter |
| `list_devices` | siteId/status/type/query opsional | Inventory terfilter |
| `get_device` | deviceId atau hostname | Device, interface, metrics, alert, metadata dokumen |
| `get_device_metrics` | deviceId, limit 1-24 | Time series, urut waktu naik |
| `list_alerts` | siteId/deviceId/severity opsional | Alert belum resolved |
| `get_topology` | tidak ada | Device, interface, link, site |
| `get_device_neighbors` | deviceId | Peer dan potensi downstream |
| `list_vlans` | siteId opsional | VLAN valid per site |
| `list_documents` | kind/deviceId/siteId opsional | Metadata, tanpa body |
| `search_documents` | query, filter opsional | FTS search, excerpt, rank |
| `get_document` | documentId | Body unstructured lengkap |
| `preview_change` | reason dan operation | Before/after/impact; tidak menulis |
| `create_change_request` | reason dan operation | Request pending; target belum berubah |
| `list_change_requests` | tidak ada | Maksimum 100 request terbaru |
| `get_change_request` | changeId | Detail dan status request |
| `get_audit_log` | tidak ada | Maksimum 200 audit terbaru |

Tools baca diberi annotation readOnly. Annotation adalah informasi untuk client,
bukan pengganti validasi di service.

## Resources

| URI | Isi |
|---|---|
| `network://schema` | Entity, relasi, jenis dokumen dan aturan write |
| `network://demo-guide` | Skenario, angka kunci dan keterbatasan |

Resource adalah konteks read-only. Tidak semua client otomatis membacanya.
Agent aplikasi ini terutama menggunakan tools yang ada di allowlist.

## Operasi tulis

Contoh mengajukan VLAN change:

```json
{
  "reason": "Demo pemindahan port office ke VLAN Operations.",
  "operation": {
    "kind": "update_interface",
    "interfaceId": "br-sw-01-gi02",
    "expectedVersion": 1,
    "patch": {
      "vlanId": "br-vlan-20"
    }
  }
}
```

Payload yang sama dipakai untuk `preview_change` dan `create_change_request`.
Jika versi saat ini bukan 1, backend menolak. Setelah manusia approve:

- `vlanId` menjadi `br-vlan-20`.
- `version` menjadi 2.
- Request menjadi `applied`.
- Audit bertambah.
- Metrics, log, config snapshot dan alert historis tetap.

Operasi lain yang didukung:

| `operation.kind` | Tujuan |
|---|---|
| `add_device` | Tambah inventory device |
| `update_device` | Edit description, managementIp, firmware |
| `delete_device` | Hapus device tanpa dependensi |
| `update_interface` | Ubah adminStatus dan/atau vlanId |
| `add_document` | Tambah konten knowledge |
| `update_document` | Edit title, content, tags |
| `delete_document` | Hapus dokumen dan index search |

Field patch dibatasi oleh schema. Tidak bisa menyisipkan field `approve: true`
atau SQL agar perubahan melewati workflow.

## Mengapa agent tidak bisa approve sendiri?

1. Tidak ada tool approve/apply di MCP server.
2. Tools bawaan shell, filesystem, web dan custom tidak diizinkan pada sesi agent.
3. Permission handler menolak operasi di luar MCP network.
4. Pre-tool hooks memeriksa allowlist lagi.
5. Approval hanya di REST untuk UI lokal, dengan pemeriksaan origin/host dan header.
6. Backend memvalidasi ulang versi ketika manusia menyetujui.

Ini kontrol demo lokal, **bukan** RBAC enterprise. Proses lokal lain yang dipercaya
masih bisa memakai REST dengan header yang benar; aplikasi belum menyediakan
identitas user, login web atau role approver produksi.

## Transport dan token

- URL: `http://127.0.0.1:4173/mcp`.
- Transport: stateless Streamable HTTP, JSON response.
- Metode utama: POST. GET/DELETE stream tidak dipakai dan mengembalikan 405.
- Header: `Authorization: Bearer <token>`.
- Tanpa token yang benar: 401.
- Tanpa `MCP_API_TOKEN`, token internal acak dibuat setiap startup dan tidak
  dikirim ke browser. Agent built-in mendapatkannya dari backend.

Stateless transport tidak berarti data bisnis hilang. Database tetap persisten;
sesi transport MCP dan storage bisnis adalah dua hal berbeda.

## Hubungkan client MCP eksternal / VS Code

Tidak diperlukan untuk agent web bawaan. Untuk demo client lain:

1. Buka folder `network-mcp-demo` sebagai workspace VS Code tersendiri.
2. Buat `.env` dari contoh dan isi `MCP_API_TOKEN` dengan nilai acak minimal
   32 karakter. Jangan gunakan contoh literal sebagai secret sungguhan.
3. Restart server agar membaca token tersebut.
4. Gunakan `.vscode/mcp.json` di folder aplikasi.
5. Saat VS Code meminta token, masukkan nilai yang sama. Prompt password tidak
   menulis nilai secret ke file konfigurasi.
6. Jika port diganti, sesuaikan URL di konfigurasi.

Jangan mengubah `.vscode` milik folder workspace induk atau aplikasi lain.

## Membuktikan MCP benar-benar bekerja

```powershell
npm run test:mcp
```

Smoke test membuat database sementara, menjalankan HTTP server, melakukan
discovery dan membaca kedua jenis data. Test juga mengajukan change pending,
memastikan target belum berubah, menyetujui lewat REST sebagai manusia, kemudian
membaca hasil melalui MCP. Tidak membutuhkan model AI.
