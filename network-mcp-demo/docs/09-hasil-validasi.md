# 9. Hasil validasi aktual

Dokumen ini mencatat pengujian yang benar-benar dijalankan pada 28 Oktober 2026.
Tidak semua jenis pengujian dianggap sama: build, HTTP, MCP, live AI dan
interaksi browser dibedakan di bawah.

## Pembaruan panduan pemula dan visual

Dokumentasi utama kini disusun sebagai tujuh bab belajar dari nol. Satu kasus
Bandung dan analogi kantor operasi digunakan secara konsisten. Detail konfigurasi
dan protokol tetap tersedia sebagai referensi opsional.

Pemeriksaan khusus dokumentasi:

- 13 sumber draw.io berisi elemen yang dapat diedit, masing-masing mempunyai PNG.
- Semua PNG berhasil diekspor dengan draw.io Desktop dan diperiksa secara visual.
- Gambar disisipkan selebar halaman, dengan bentuk portrait atau mendekati persegi.
- 18 dokumen dan 118 tautan/path gambar/anchor lokal lolos pemeriksaan.
- Lima contoh SELECT pada bab tools dijalankan pada database seed sementara;
  hasilnya sesuai jumlah baris yang diharapkan.
- Potongan syarat pencarian FTS diuji bersama query lengkap dan menemukan
  runbook serta log Bandung yang dimaksud.

Perubahan ini tidak mengubah perilaku aplikasi atau mereset database pengguna.
Hasil pengujian aplikasi di bagian selanjutnya adalah hasil run implementasi
sebelumnya, bukan klaim bahwa seluruh suite aplikasi diulang untuk perubahan
dokumentasi.

## Tambahan: akses tabel dan pembuktian pembacaan live

Panduan akses tabel tersedia di [bab pembuktian database](10-bukti-data-live.md).
Sekarang ada 14 diagram draw.io beserta PNG, termasuk diagram sebelum, pending
dan sesudah approval.

Pengujian setelah penambahan fitur inspector:

- `npm test`: **21 pass, 0 fail**, termasuk empat test baru untuk akses
  read-only, file yang tidak ada, penolakan input dan pembacaan commit baru.
- `npm run db:inspect`: berhasil membaca file database demo utama dalam mode
  read-only dan menampilkan perangkat serta sampel metrics terbaru yang tersimpan.
- `npm run db:prove-live`: **PASS**, SQL independen dan MCP membaca marker unik
  yang sama sesudah approval. Saat pending, target tetap lama. Pembuktian body
  dokumen dan index search juga berhasil.
- `npm run test:mcp`: **PASS** setelah helper pembacaan hasil MCP dipakai bersama.
- `npm run build`: **PASS**.

Proof menggunakan database sementara dan mengonfirmasi file tersebut sudah
dibersihkan sebelum menulis hasil sukses. Database demo utama tidak diubah oleh
proof. File bukti terakhir ada di `data\runtime\live-data-proof.json`.
Tidak ada panggilan model pada pembuktian baru ini; hasil live agent di bawah
berasal dari run implementasi awal.

## Ringkasan validasi implementasi awal

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Data generator dan ingestion | Lulus | 25 device, 102 interface, 24 link, 9 VLAN, 600 metrics, 10 dokumen |
| Unit/domain/REST integration | Lulus | `npm test`: 17 pass, 0 fail, 0 skip |
| Strict type-check frontend/backend | Lulus | `npm run typecheck` |
| Production build | Lulus | `npm run build`; frontend dan backend dihasilkan |
| MCP protocol | Lulus | 17 tools, 2 resources, structured/unstructured, pending -> human approval -> applied |
| Agent AI sungguhan | Lulus | SDK login berhasil; investigasi dan perubahan melalui 10 actual MCP tool calls pada run terakhir |
| Agent tidak melewati approval | Lulus | Tepat 1 request pending; VLAN target tetap 10 sesudah agent selesai |
| Tampilan dashboard di browser | Terlihat | Dashboard termuat dengan counts yang benar dan label simulasi |
| Rekaman flow browser otomatis | **Belum lulus** | Perekam mengembalikan `interaction_failed`; tidak ada spec passing yang dipromosikan |
| Runtime replay fallback | Lulus | 7 assertions pass, 0 fail, 0 skip |

**Jangan membaca hasil HTTP fallback sebagai bukti seluruh klik UI sudah diuji
end-to-end.** Kegagalan perekam tidak dilaporkan sebagai keberhasilan browser
flow. Output perekam tidak menyertakan rincian interaksi yang gagal, sehingga
penyebabnya tidak disimpulkan sebagai bug aplikasi atau bug tooling tanpa bukti.

## Bukti data

Setelah seed/reset:

```json
{
  "health": {
    "healthy": 22,
    "warning": 2,
    "critical": 1,
    "offline": 0
  },
  "counts": {
    "devices": 25,
    "interfaces": 102,
    "links": 24,
    "documents": 10,
    "metrics": 600
  }
}
```

Tests memeriksa nilai:

- BR-SW-01 Gi0/1 utilisasi 95%.
- Loss terakhir 3.2%.
- DC-SW-02 Gi0/2 oper down.
- HQ-FW-01 CPU terakhir 92%.
- Downstream BR-SW-01: BR-SW-02, BR-SW-03, BR-AP-01, BR-AP-02.

## Bukti live agent

Test pertama meminta model membaca data structured dan dokumen melalui MCP.
Hasilnya:

- Tool overview/detail/search/read benar-benar dipanggil.
- Jawaban menyebut 95% dan 3.2%, serta label simulasi.
- Model membedakan congestion yang diamati dari hipotesis kontribusi backup.

Test kedua pada percakapan yang sama meminta satu VLAN change:

- Agent membaca kondisi dan VLAN.
- Agent menjalankan preview dan create request.
- Request tetap pending.
- Tabel interface tetap `br-vlan-10`, belum berubah ke VLAN 20.

Trace lokal terakhir tersedia pada `data\runtime\agent-smoke-result.json`.
File tersebut berisi data fiktif dan bukan dependency aplikasi. Run lain dapat
menghasilkan jumlah tool calls atau redaksi jawaban berbeda.

## Runtime replay

Eval plan: `.tsupgrader\runtime-validation\eval-plan.json`.
Hasil: `.tsupgrader\runtime-validation\standalone-result.json`.

Assertions:

1. Production build.
2. Tests dengan exit code sukses.
3. MCP protocol dan approval.
4. Production home HTTP 200.
5. Health menunjukkan dukungan structured dan unstructured.
6. Overview menunjukkan 25 device.
7. HTTP search menemukan `doc-branch-runbook`.

Tool replay belum dapat menghitung format output Node test runner secara
otomatis pada run ini. Karena itu jumlah **17 tests** berasal dari output
`npm test` yang dijalankan langsung, bukan dari nilai parsed count replay.

## Catatan non-blocking

Build Vite/Rolldown dapat memperingatkan directive `use client` pada dependency
lucide-react. Aplikasi ini React client-side biasa; build tetap sukses dan tidak
menggunakan React Server Components.

## Checklist presenter sebelum demo berikutnya

- Jalankan ulang `npm test`, `npm run test:mcp`, `npm run build`.
- Jalankan `npm run test:agent` jika ingin memastikan login/model masih tersedia.
- Reset dataset, lalu cek 25 device dan 10 dokumen.
- Buka Inventaris dan Knowledge secara manual untuk memastikan interaksi pada
  browser presenter sesuai.
- Coba satu VLAN request dan approval sebelum sesi resmi.
- Jangan mengklaim koneksi hardware atau telemetry real-time.
