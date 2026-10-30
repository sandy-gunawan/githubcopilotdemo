# Referensi lanjutan: konfigurasi dan troubleshooting

Bagian ini untuk orang yang menjalankan atau mengembangkan aplikasi.
Panduan pemula tersedia di [Cara menyalakan dan mengecek demo](../07-operasional.md).

## Prasyarat

- Windows dengan PowerShell.
- Node.js major 24, minimal 24.13, dan npm.
- Untuk agent: login dan subscription GitHub Copilot yang sesuai, serta internet.
- Port lokal 4173 belum dipakai aplikasi lain.

SQLite memakai modul bawaan Node `node:sqlite`; tidak perlu menginstal database
server, Docker atau Python.

## Instalasi pertama

```powershell
Set-Location 'C:\clients\Organization\demo\fundamental\network-mcp-demo'
npm ci
npm run data:generate
npm run seed
npm run dev
```

Jika sudah diinstal dan seed tersedia, cukup `npm run dev`. Buka
http://127.0.0.1:4173. Hentikan dengan Ctrl+C pada terminal yang menjalankannya.

Untuk F5, buka **folder aplikasi ini** sebagai workspace VS Code lalu pilih
konfigurasi `NetOps Lab: local demo`. Ini debugger Node biasa, bukan Foundry Agent
Inspector. Tidak ada Foundry project yang dibuat oleh demo ini.

## Login agent

```powershell
copilot login
```

Lalu klik Hubungkan Copilot pada UI. Login dapat membuka browser sesuai proses
autentikasi CLI. Jangan menaruh token GitHub pada source code atau chat.

Aplikasi memakai runtime yang disertakan dependency `@github/copilot-sdk`.
`COPILOT_CLI_PATH` hanya untuk troubleshooting kompatibilitas jika Anda memang
memiliki runtime eksternal yang sesuai versi SDK.

## Variabel konfigurasi

| Nama | Default | Penjelasan |
|---|---|---|
| HOST | 127.0.0.1 | Nilai lain ditolak; demo lokal saja |
| PORT | 4173 | Port web, REST dan MCP |
| DATABASE_PATH | data\runtime\network.sqlite | File database relatif folder aplikasi |
| COPILOT_MODEL | kosong | Default akun/runtime; isi hanya ID model yang tersedia |
| COPILOT_CLI_PATH | kosong | Runtime bawaan SDK bila kosong |
| MCP_API_TOKEN | acak tiap startup | Minimal 32 karakter bila diisi; untuk client eksternal |

Salin `.env.example` menjadi `.env` bila perlu. Konfigurasi dibaca pada startup;
restart setelah mengubahnya.

Browser tidak menerima token MCP. Chat UI hanya memanggil REST; backend
menyambungkan SDK ke MCP dengan token internal.

## Production build lokal

```powershell
npm run build
npm start
```

Build memeriksa tipe frontend/backend, membangun frontend ke `dist\client`,
dan mengompilasi backend serta shared schema ke `dist`.

`npm start` tetap demo lokal single-user, **bukan** pernyataan bahwa aplikasi
sudah siap produksi. `vite` hanya diperlukan pada development/build.

## Backup data demo

Untuk salinan konsisten, hentikan aplikasi dan proses test terlebih dahulu lalu
salin file database:

```powershell
Copy-Item 'data\runtime\network.sqlite' 'data\runtime\network-backup.sqlite'
```

Jangan menyalin hanya main SQLite file saat masih ada penulisan WAL aktif.
Untuk kembali ke kondisi bawaan gunakan reset, bukan menghapus folder aplikasi.

## Troubleshooting

### Port sedang dipakai

Error `EADDRINUSE` berarti ada proses lain memakai port. Jangan menghentikan proses
lain secara sembarang. Pilih port berbeda di `.env`, misalnya `PORT=4174`, restart,
lalu buka URL port tersebut. Sesuaikan URL client MCP eksternal jika ada.

### `node:sqlite` tidak tersedia

Gunakan Node major 24 sesuai engines. Jangan mengganti import SQLite dengan
library lain tanpa menyesuaikan storage dan tests.

### Seed belum ada

Jalankan `npm run data:generate`, lalu `npm run seed`. Jika file seed diubah dan
database terisi, import akan menolak fingerprint yang berbeda. Hentikan aplikasi
dan gunakan `npm run data:ingest -- --reset` bila memang ingin mengganti data.

### Agent tidak login / koneksi gagal

1. Pastikan CLI dapat menjalankan proses login.
2. Pastikan akun memiliki akses Copilot yang diperlukan.
3. Periksa jaringan/proxy.
4. Kosongkan `COPILOT_MODEL` jika ID model yang dipilih tidak tersedia.
5. Klik Hubungkan Copilot lagi.
6. Baca pesan error pada UI dan terminal.

Aplikasi tidak beralih diam-diam ke model lain atau jawaban hardcoded.
Dashboard dan CRUD lokal tetap dapat dipakai.

### Kebijakan organisasi meminta approval tambahan

Agent tidak melewati `managedApprovalRequired`. Jika kebijakan runtime menuntut
review interaktif yang tidak didukung aplikasi demo, operasi ditolak. Gunakan
akun/kebijakan demo yang diizinkan organisasi, bukan mematikan kontrol tanpa izin.

### Runtime SDK tidak cocok

Gunakan dependency lockfile dan runtime bawaan SDK. Jika mengisi
`COPILOT_CLI_PATH`, pastikan runtime tersebut mendukung kontrak SDK. Error RPC
karena ketidakcocokan bukan berarti database atau MCP rusak.

### MCP 401

Token client tidak sama dengan server, kurang header Bearer, atau token acak
berubah setelah restart. Untuk client eksternal tetapkan token di `.env` lalu
masukkan nilai yang sama pada konfigurasi client.

### MCP GET 405

Perilaku yang benar. Endpoint menggunakan stateless Streamable HTTP POST.
Membuka `/mcp` langsung dari address bar bukan cara discovery tools.

### Request failed karena stale version

Objek sudah berubah sejak request dibuat. Baca ulang objek dan ajukan request
baru dengan expectedVersion terbaru. Request lama tidak dipaksa diterapkan.

### Search tidak menemukan dokumen

Pakai kata yang benar-benar tertulis, misalnya `congestion`, `interface`,
`down`, `cpu`. FTS bukan semantic/vector search. Periksa filter site/device/kind.
Dokumen pending belum ada di index sampai approval.

### Chat kehilangan konteks setelah restart/reset

Mulai percakapan baru pada UI. Conversation aplikasi tidak dipulihkan otomatis
dari database network. Sesi yang idle dapat dibersihkan setelah 30 menit;
maksimum 8 percakapan aktif.

### Reset ditolak saat agent masih bekerja

Tunggu respons selesai agar agent tidak memakai konteks sebelum reset.
Jangan reset SQLite dari CLI saat percakapan sedang berjalan.

## Batasan dan kontrol lokal

Yang tersedia:

- Bind loopback, pemeriksaan host dan origin.
- Header khusus untuk mutasi REST, tanpa CORS publik.
- Bearer token MCP.
- Input schema, query SQL berparameter, foreign keys.
- Approval terpisah dari MCP, version check, transaksi dan audit.
- Allowlist tools agent; dokumen tidak dianggap instruksi sistem.

Yang **belum** tersedia:

- Login web, identitas approver nyata, role/RBAC atau multi-tenant isolation.
- TLS/reverse proxy, rate limiting produksi, backup terjadwal.
- Integrasi device/NMS/ticketing sungguhan.
- Vector search, parsing PDF/OCR, ingestion streaming.
- Routing dinamis, redundancy, traffic flow telemetry, physical diagnosis.
- Pembaruan metrics otomatis atau remediation hardware.
- Rollback konfigurasi otomatis.

Jangan menaruh data network internal, kredensial atau dokumentasi rahasia pada
demo yang memanggil model eksternal. Gunakan data fiktif yang disediakan.

## Sebelum dibawa ke sistem nyata

Sepakati API aplikasi network tim, jenis operasi yang boleh diakses agent,
identitas dan wewenang approver, audit enterprise, sumber telemetry dan
mekanisme rollback. Mulai dari read-only dan lakukan validasi organisasi sebelum
menambahkan write.
