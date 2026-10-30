# NetOps Lab - Network MCP Demo

Lab latihan untuk bertanya tentang kondisi jaringan. Anda bisa melihat halaman
ringkasan, membaca data dan dokumen, lalu meminta asisten GitHub Copilot membantu
menjelaskannya. Asisten memakai layanan MCP untuk mengambil bukti.

**Aplikasinya berjalan sungguhan, tetapi seluruh data network adalah simulasi.**
Tidak ada koneksi SSH/SNMP, device asli, atau resource Azure yang dibuat.

## Baru pertama kali mendengar MCP? Mulai di sini

Anda tidak perlu bisa menulis kode atau SQL untuk mengikuti panduan ini.
**SQL** adalah bahasa untuk meminta data dari tabel. Nanti kita melihat contoh
SQL agar jelas apa yang dikerjakan aplikasi, bukan untuk dihafalkan.

Kita memakai satu cerita dari awal sampai akhir:

> **"Mengapa koneksi kantor cabang Bandung lambat?"**

Bayangkan NetOps Lab sebagai **kantor operasi**. Anda bertanya kepada asisten.
Asisten membawa permintaan ke loket layanan. Petugas membaca formulir berkolom
dan buku catatan, lalu mengembalikan bukti. Asisten baru menyusun jawaban.

Dalam aplikasi, loket itu adalah **MCP server**. Layanan yang bisa dipilih
disebut **tool**. Formulir berkolom adalah data **structured**, sedangkan isi
runbook dan log adalah data **unstructured**.

<img src="docs/diagrams/peta-belajar.png" alt="Enam langkah memahami MCP melalui pertanyaan tentang jaringan Bandung" width="100%">

Sumber visual yang dapat diedit: [peta-belajar.drawio](docs/diagrams/peta-belajar.drawio).

### Urutan baca untuk pemula

| Urutan | Pertanyaan yang dijawab | Bacaan |
|---|---|---|
| 1 | MCP itu apa? Bedanya dengan AI dan database? | [Kenalan dari nol](docs/01-konsep.md) |
| 2 | Siapa yang memilih tool, membaca data dan membuat jawaban? | [Siapa melakukan apa?](docs/02-arsitektur.md) |
| 3 | Structured dan unstructured bedanya apa? Kok bisa dibaca oleh MCP yang sama? | [Mengenali dua jenis data](docs/03-data-dan-ingestion.md) |
| 4 | Tool memanggil SQL apa? Bagaimana mencari dan membaca dokumen? | [Ikuti perjalanan satu tool](docs/04-mcp.md) |
| 5 | Tombol mana yang dipakai dalam aplikasi? | [Panduan klik demi klik](docs/05-panduan-aplikasi.md) |
| 6 | Pertanyaan apa yang dicoba, dan hasil apa yang seharusnya muncul? | [Latihan terpandu](docs/06-skenario-demo.md) |
| 7 | Bagaimana menyalakan demo dan mengecek kalau ada masalah? | [Panduan menjalankan demo](docs/07-operasional.md) |
| 8 | Bagaimana membuka tabel dan membuktikan SQL/MCP membaca perubahan terbaru? | [Lihat database dan bukti live read](docs/10-bukti-data-live.md) |

Jika aplikasi sudah berjalan, cukup buka **http://127.0.0.1:4173**.
Bagian instalasi di bawah hanya diperlukan jika Anda menyalakannya sendiri.

**Ingin melihat sambungan file dan SQL langsung dari kodenya?** Buka
[MCP dalam kode: dari nama tool sampai SELECT](docs/11-mcp-dalam-kode.md).
Ada peta file, diagram urutan, contoh handler dan SQL, serta tautan implementasi
seluruh 17 tools.

### Lihat tabel SQLite secara langsung

```powershell
npm run db:inspect
npm run db:inspect -- --table devices --device-id br-sw-01
npm run --silent db:inspect -- --table documents --device-id br-sw-01 --json
```

Inspector membuka file SQLite **read-only**, menampilkan lokasi file, waktu
baca, SQL, parameter dan row terbaru. Tidak perlu login AI.

Untuk pembuktian otomatis tanpa mengubah database demo utama:

```powershell
npm run db:prove-live
```

Test membandingkan SQL independen dan MCP sebelum/sesudah approval menggunakan
marker unik yang baru dibuat. **Isi network tetap dummy; query dan commit
database benar-benar berjalan.** Ini bukan polling perangkat asli.
Ikuti [latihan pembuktian lengkap](docs/10-bukti-data-live.md).

## Untuk apa?

Mendemonstrasikan cara AI membantu tim network:

1. Membaca inventory, topology, metrics dan alert dari data **structured**.
2. Mencari serta membaca runbook, incident, config text dan log **unstructured**.
3. Menggabungkan keduanya untuk investigasi berbasis bukti.
4. Mengajukan perubahan, tanpa melewati approval manusia.
5. Memperlihatkan tool calls MCP dan hasilnya, bukan jawaban chatbot hardcoded.

## Jalankan

Prasyarat: **Node.js 24 LTS (24.13 atau lebih baru dalam major 24)** dan npm.
Untuk chat AI, butuh login GitHub Copilot, subscription yang sesuai, dan internet.
Dashboard, pencarian dokumen, CRUD dan MCP bisa dipakai tanpa login AI.

```powershell
Set-Location 'C:\clients\Organization\demo\fundamental\network-mcp-demo'
npm ci
npm run data:generate
npm run seed
npm run dev
```

Buka **http://127.0.0.1:4173**.

Seed sudah disertakan. Generator tidak wajib setiap startup. Database yang belum
ada otomatis diisi dari seed pada startup; database yang sudah berisi tidak ditimpa.

Untuk agent:

```powershell
copilot login
```

Kemudian klik **Hubungkan Copilot** pada aplikasi. Runtime yang cocok dengan SDK
disertakan oleh dependency. CLI `copilot` digunakan untuk login; secara default
aplikasi tidak memaksakan versi CLI eksternal.

Chat memakai layanan model GitHub Copilot, bukan model offline. Pesan dan hasil
tools yang relevan dikirim ke layanan tersebut. Gunakan hanya data fiktif ini.
Pemakaian dapat mengonsumsi kuota sesuai model dan subscription.

### Build dan jalankan versi hasil build

```powershell
npm run build
npm start
```

### Konfigurasi opsional

```powershell
Copy-Item .env.example .env
```

`.env` tidak boleh dimasukkan ke source control. Port default 4173; bind hanya
`127.0.0.1`. `COPILOT_MODEL` kosong berarti default dari akun/runtime Copilot.
Jangan isi model yang tidak tersedia pada akun Anda.

## Apa yang tersedia?

| Fitur | Isi |
|---|---|
| Network | 3 site, 25 device, 102 interface, 24 link, 9 VLAN |
| Observability | 600 metrics snapshot, 3 alert terbuka |
| Knowledge | 10 dokumen: 4 runbook, 2 incident, 2 config, 2 log |
| MCP | 17 tools dan 2 resources melalui stateless Streamable HTTP |
| AI | Agent Copilot dengan allowlist tools MCP dan trace |
| CRUD | Device dan dokumen; perubahan admin/VLAN interface |
| Safety | Preview, pending request, approval web, version check, audit |
| Storage | SQLite persisten dan index dokumen FTS5 |

Snapshot network: **28 Oktober 2026, 14:00 WIB**. Angka metrics bukan monitoring
real-time meskipun aplikasi web-nya live.

## Coba pertama kali

1. Lihat ringkasan network dan device bermasalah.
2. Cari `congestion` di knowledge, lalu baca runbook dan log BR-SW-01.
3. Hubungkan agent dan tanyakan:

   > Mengapa koneksi branch Bandung lambat? Gabungkan metrics, log, dan runbook.

4. Buka trace tools. Ekspektasi data: uplink **95%**, loss **3.2%**, error **1240**.
5. Ajukan perubahan VLAN Gi0/2 pada BR-SW-01 ke VLAN 20.
6. Sebelum approve, VLAN harus tetap 10. Setelah approve, VLAN menjadi 20.
7. Periksa audit. Alert congestion **tidak otomatis hilang** karena mengubah VLAN
   bukan bukti masalah selesai.

Untuk mengembalikan kondisi awal gunakan reset dengan konfirmasi di aplikasi,
atau hentikan aplikasi dan jalankan:

```powershell
npm run data:ingest -- --reset
```

**Reset menghapus seluruh perubahan runtime, change request dan audit lama.**
File seed asli tetap ada.

## Dokumentasi lanjutan, tidak wajib untuk pemula

- [Daftar kolom, relasi dan aturan ingestion](docs/referensi/model-data.md)
- [Kontrak protokol, 17 tools dan konfigurasi client MCP](docs/referensi/kontrak-mcp.md)
- [Contoh lengkap tambah, baca, ubah dan hapus data](docs/referensi/operasi-crud.md)
- [Katalog pertanyaan tambahan untuk presenter](docs/referensi/katalog-skenario.md)
- [Variabel konfigurasi dan troubleshooting teknis](docs/referensi/operasional.md)
- [API dan pengujian untuk pengembang](docs/08-api-dan-pengujian.md)
- [Hasil validasi aktual dan catatan pengujian](docs/09-hasil-validasi.md)
- [Kebutuhan proyek](docs/REQUIREMENTS.md)
- [Peta implementasi](docs/IMPLEMENTATION.md)

Semua **16 diagram dokumentasi** dibuat sebagai sumber **draw.io** yang dapat
diedit. Setiap diagram mempunyai PNG dengan nama yang sama agar langsung terlihat
di preview Markdown, GitHub dan dokumen ekspor. Lihat
[daftar diagram dan cara mengeditnya](docs/diagrams/README.md).

## Validasi

```powershell
npm test
npm run test:mcp
npm run db:prove-live
npm run build
npm run test:agent
```

`test:agent` memanggil model sungguhan dan membutuhkan login serta internet.
Test lain tidak memerlukan model. Tests memakai database sementara, bukan
database demo utama.

## Struktur folder

```text
network-mcp-demo\
  src\                  Dashboard React
  server\               REST, service, SQLite, MCP, Copilot agent
  shared\               Schema Zod dan kontrak TypeScript
  scripts\              Generator, importer, smoke MCP dan agent
  tests\                Pengujian data, perubahan dan API
  data\
    seed\               network.json dan dokumen sumber dummy
    runtime\            SQLite dan hasil smoke lokal; di-ignore
  docs\                 Dokumentasi bahasa Indonesia dan diagram
  .vscode\              Debug aplikasi dan koneksi MCP opsional
```

Semua dependency, konfigurasi, data dan dokumentasi aplikasi berada di folder ini.
Tidak perlu mengubah aplikasi lain di workspace.
