# 8. Referensi opsional: API dan pengujian

Bagian ini untuk pengembang dan orang yang ingin menguji program melalui kode.
**Tidak perlu membacanya untuk memahami MCP atau mencoba aplikasi.**
Mulai dari [panduan pemula](01-konsep.md) dan
[panduan klik demi klik](05-panduan-aplikasi.md) jika baru pertama belajar.

Istilah yang dipakai: **API** adalah antarmuka untuk meminta pekerjaan dari
program; **HTTP** adalah aturan permintaannya; **JSON** adalah format data
pasangan nama dan nilai; **endpoint** adalah alamat tujuan suatu layanan.
**Test** adalah pemeriksaan otomatis yang membandingkan hasil program dengan
hasil yang diharapkan. Dalam analogi kantor operasi, test memeriksa arsip yang
benar-benar keluar, bukan hanya memastikan loket terlihat terbuka.

## Kontrak HTTP

Semua REST API memakai JSON. Hasil sukses berupa data langsung. Error:

```json
{
  "error": {
    "code": "STALE_VERSION",
    "message": "Versi sudah berubah. Baca ulang lalu buat request baru."
  }
}
```

Error agent dapat menyertakan `traces` dan `conversationId` untuk membantu
melihat panggilan yang sempat berjalan. Tidak ada response sukses palsu.

Untuk seluruh POST/DELETE REST:

```text
Content-Type: application/json
X-NetOps-Client: web
```

Header ini kontrol request browser lokal, **bukan autentikasi pengguna**.
Endpoint MCP mempunyai autentikasi Bearer tersendiri.

## Endpoint baca

| Method | Path | Hasil |
|---|---|---|
| GET | `/api/health` | Status server, label simulation, jenis storage/data |
| GET | `/api/overview` | Summary, counts, health, scenarios, snapshot |
| GET | `/api/sites` | Site[] |
| GET | `/api/devices` | Device[]; filter siteId/status/type/query |
| GET | `/api/devices/:id` | Device detail; ID atau hostname |
| GET | `/api/topology` | Sites, devices, interfaces, links |
| GET | `/api/vlans` | VLAN[]; siteId opsional |
| GET | `/api/alerts` | Alert belum resolved; filter siteId/deviceId/severity |
| GET | `/api/documents` | Metadata dokumen; filter kind/siteId/deviceId |
| GET | `/api/documents/search` | FTS results; query wajib, filter opsional |
| GET | `/api/documents/:id` | Dokumen dengan body |
| GET | `/api/changes` | Maksimum 100 change request terbaru |
| GET | `/api/audit` | Maksimum 200 audit terbaru |
| GET | `/api/agent/status` | Status runtime; tidak memulai login otomatis |

## Endpoint aksi

| Method | Path | Body / efek |
|---|---|---|
| POST | `/api/changes/preview` | ChangeInput; tanpa write |
| POST | `/api/changes` | ChangeInput; response 201 pending |
| POST | `/api/changes/:id/decision` | `{"decision":"approve"}` atau reject |
| POST | `/api/agent/connect` | Memulai SDK dan memeriksa login |
| POST | `/api/chat` | `{"message":"...", "conversationId":"opsional"}` |
| DELETE | `/api/chat/:id` | Menghapus percakapan yang dikelola aplikasi |
| POST | `/api/demo/reset` | `{"confirmation":"RESET DEMO"}` |

MCP tersedia pada `POST /mcp`; gunakan client MCP untuk initialization,
discovery dan tools/call. Dokumentasi file dapat dibaca melalui `/docs/...`
ketika aplikasi berjalan.

## Contoh REST PowerShell

```powershell
$base = 'http://127.0.0.1:4173'
Invoke-RestMethod "$base/api/overview"
Invoke-RestMethod "$base/api/devices/BR-SW-01"
Invoke-RestMethod "$base/api/documents/search?query=congestion"
```

Preview dan request:

```powershell
$headers = @{ 'X-NetOps-Client' = 'web' }
$body = @{
  reason = 'Demo pemindahan port ke VLAN Operations.'
  operation = @{
    kind = 'update_interface'
    interfaceId = 'br-sw-01-gi02'
    expectedVersion = 1
    patch = @{ vlanId = 'br-vlan-20' }
  }
} | ConvertTo-Json -Depth 6

Invoke-RestMethod "$base/api/changes/preview" -Method Post `
  -Headers $headers -ContentType 'application/json' -Body $body

$request = Invoke-RestMethod "$base/api/changes" -Method Post `
  -Headers $headers -ContentType 'application/json' -Body $body
```

Pada demo normal gunakan tombol approval di UI. API decision terpisah
memungkinkan pengujian:

```powershell
$decision = @{ decision = 'approve' } | ConvertTo-Json
Invoke-RestMethod "$base/api/changes/$($request.id)/decision" -Method Post `
  -Headers $headers -ContentType 'application/json' -Body $decision
```

Contoh mengasumsikan interface masih versi 1. Setelah satu perubahan, baca ulang
detail dan sesuaikan expectedVersion.

## Jenis pengujian

### Unit / domain / integration lokal

```powershell
npm test
```

Menggunakan Node test runner melalui tsx. Cakupan:

- Count dan nilai skenario persis.
- Seed deterministik, import file identik dengan generator.
- Ingestion idempotent dan rollback foreign-key.
- Reset yang gagal tidak menghapus data lama.
- Persistence setelah database dibuka kembali, termasuk perubahan/versi/audit.
- Preview/request tidak mengubah target.
- Approval, rejection, duplicate decision.
- Conflict versi, delete dependensi, VLAN cross-site.
- Device CRUD lengkap.
- Document CRUD dan pembaruan FTS.
- Graph downstream dan tidak memakai satu port untuk dua link.
- Link admin down, tidak memalsukan recovery admin up.
- Seluruh endpoint REST baca merespons.
- Host/origin asing, MCP tanpa token, invalid JSON/input.
- Provider unavailable tetap error, tidak diganti jawaban dummy.

### MCP protocol smoke

```powershell
npm run test:mcp
```

Memakai **client dan server MCP SDK yang sungguhan** di HTTP loopback:

1. Initialization dan discovery 17 tools.
2. Discovery dan pembacaan resources.
3. Structured read dengan angka persis.
4. Search dan pembacaan unstructured.
5. Preview dan request pending.
6. Bukti target belum berubah.
7. Approval lewat jalur web REST.
8. Verifikasi request applied melalui MCP.
9. Membuktikan tool approve tidak tersedia.

Test membuat database dan server sementara lalu membersihkannya.

### Type-check dan build

```powershell
npm run typecheck
npm run build
```

Frontend dan backend diperiksa secara terpisah dengan TypeScript strict.
Build mencakup frontend assets dan backend JavaScript yang dijalankan `npm start`.

### Live agent smoke

```powershell
npm run test:agent
```

Memakai login Copilot lokal dan model sungguhan. Test ini membutuhkan internet
dan dapat mengonsumsi kuota:

1. Model membaca overview dan BR-SW-01.
2. Model mencari dan membaca runbook/log melalui MCP.
3. Jawaban harus menyebut 95% dan 3.2%.
4. Model diminta membuat satu VLAN change request lewat preview lalu request.
5. Backend memverifikasi hanya satu request pending dan VLAN masih 10.

Hasil trace tersimpan lokal di `data\runtime\agent-smoke-result.json` yang
di-ignore, bukan source control. Database smoke berbeda dari database aplikasi.

Test tidak mengunci redaksi jawaban AI, tetapi memeriksa keberhasilan tools,
nilai kunci dan state bisnis.

## Inspeksi tabel dan bukti commit terbaru

```powershell
npm run db:inspect -- --table devices --device-id br-sw-01
npm run db:prove-live
```

Inspector membuat koneksi independen ke file database dalam mode read-only.
Tidak ada endpoint HTTP SQL bebas dan tidak ada penambahan wewenang agent.
Tool MCP tetap memakai service dan approval yang sama.

Proof memakai database sementara serta marker acak. Ia memeriksa:

- SQL dan MCP membaca nilai awal yang sama.
- Request pending tidak mengubah row target.
- Setelah approval web, SQL independen dan MCP membaca marker/versi terbaru.
- Perubahan body dokumen muncul pada SQL, `get_document` dan FTS search.
- Server dan database test dibersihkan sebelum hasil sukses ditulis.

Tidak ada panggilan model pada proof ini. Panduan langkah manual dan GUI ada di
[bukti data live](10-bukti-data-live.md).

## Checklist kesiapan demo

- Semua unit/integration test pass.
- MCP smoke pass.
- Build pass dan web merespons.
- Inventory dan knowledge dapat digunakan di browser.
- Agent dapat memanggil MCP, atau keterbatasan login/internet ditampilkan jelas.
- Approval mengubah data; pending/rejected tidak mengubah target.
- Data reset kembali ke kondisi awal.

Lihat [hasil validasi](09-hasil-validasi.md) untuk pengujian yang benar-benar
dijalankan pada pembuatan demo ini, bukan hanya daftar rencana.
