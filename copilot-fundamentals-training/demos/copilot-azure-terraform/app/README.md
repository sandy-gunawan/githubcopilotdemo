# Portal Keluhan Mini

Aplikasi **lokal** untuk memberi konteks nyata pada demo GitHub Copilot for
Azure. Semua kasus dan label nasabah adalah SINTETIS / BUKAN PRODUKSI.
Tanpa login, tanpa koneksi Azure, dan tidak boleh dipublikasikan.

## Jalankan

Buka **folder app ini** melalui VS Code > File > Open Folder.
Gunakan Node.js 22+.

```powershell
npm ci
npm start
```

Buka http://127.0.0.1:3000. Health check: http://127.0.0.1:3000/health.
Jika dependency sudah terpasang, cukup `npm start`.
Biarkan terminal tetap terbuka selama mencoba app. Jika alamat lokal sudah
bisa diakses, tidak perlu menjalankan server dua kali.

## Mematikan dan menyalakan lagi

- Jika Anda menjalankan `npm start` di terminal sendiri, tekan **Ctrl+C**
  pada terminal tersebut dan tunggu prompt kembali.
- Menutup tab browser tidak mematikan server.
- Jika Copilot yang menjalankan server di background, minta penghentian di
  chat yang memulainya. Ctrl+C pada terminal lain tidak mematikan proses itu.
  Jangan menghentikan proses lain hanya karena memakai port 3000.
- Data dan lampiran tidak dihapus saat stop. Untuk menyalakan lagi, `npm start`.

Jika port dipakai aplikasi lain, jangan hentikan aplikasi itu; pilih port baru:

```powershell
$env:PORT = "3001"
npm start
```

`.env` opsional dapat dibuat dari `.env.example`. Default HOST adalah
`127.0.0.1` agar hanya bisa diakses lokal. Untuk hosting cloud, binding host,
autentikasi, dan penyimpanan harus ditinjau sebelum membuka akses.

## Coba

- Cari DEMO-C001 atau saring status/kanal.
- Buat keluhan dengan label nasabah rekaan, bukan data nyata.
- Buka detail, ubah status, dan unggah TXT/PDF/PNG/JPG dummy maksimal 2 MB.
- Muat ulang: perubahan tersimpan lokal.

Delapan kasus awal ditulis hanya saat data belum ada. `data/complaints.json`
dan `data/uploads/` berada di luar public dan tidak ikut Git.
Jangan menghapus data untuk reset tanpa persetujuan. Store rusak membuat
startup gagal secara eksplisit, bukan diganti diam-diam dengan data contoh.

Lampiran diunduh sebagai attachment dan tidak dieksekusi. Pemeriksaan jenis/
signature bukan antivirus atau jaminan keamanan. Gunakan file rekaan saja.

## Bagaimana Copilot tahu ini aplikasinya?

Copilot membaca **workspace yang dibuka di VS Code**, bukan otomatis mencari
aplikasi yang sedang hidup di localhost:

| File | Yang bisa dipelajari |
|---|---|
| package.json | Node.js, Express, dependency, dan npm start |
| server.js | API, health check, HOST/PORT, upload, dan penyimpanan |
| public/ | Tampilan dan interaksi aplikasi |
| .env.example | Nama konfigurasi, tanpa credential |
| README.md | Cara menjalankan, batasan, dan kebutuhan integrasi |

Setelah app berjalan, salin prompt rekomendasi dari [panduan](../index.html)
ke Copilot Chat mode Agent **di folder ini**. Model dapat membaca source
dengan izin tools. Ia tidak otomatis mengunggah aplikasi ke Azure.

Azure baru menjalankan kode jika nanti ada langkah deployment yang
disetujui. **Terraform membuat infrastruktur, bukan otomatis memindahkan
kode, JSON, atau lampiran lokal.**

## Yang perlu diputuskan sebelum cloud

- Pilih hosting dan ubah binding host sesuai platform.
- Tambahkan autentikasi/otorisasi; app ini tidak cocok untuk akses publik.
- Ganti store JSON single-process dengan penyimpanan terkelola yang dipilih.
- Ganti adapter lampiran lokal bila memakai Blob Storage.
- Konfigurasi identity/RBAC dan monitoring; jangan menaruh secret di kode.

Tidak ada Terraform, login Azure, pemilihan subscription, atau deployment
yang dilakukan oleh npm start.

## Rancangan infrastruktur Azure (belum diterapkan)

Konfigurasi [Terraform CLI langsung](infra/README.md) tersedia untuk App
Service Linux, Table/Blob Storage, Entra Authentication, dan monitoring.
Ini tidak mengubah aplikasi lokal: integrasi Table/Blob, autentikasi, dan
instrumentasi kode **belum dikerjakan**. Provisioning diblokir sampai
autentikasi dan integrasi aplikasi telah dikonfirmasi siap.

Azure direncanakan mulai kosong. Skrip impor terpisah baru dibuat pada fase
integrasi aplikasi; tidak ada seed atau migrasi data otomatis. Login Azure,
plan nyata, apply, dan deployment memerlukan persetujuan terpisah.

## API dan pengujian

- GET /health
- GET /api/complaints
- POST /api/complaints
- GET /api/complaints/:id
- PATCH /api/complaints/:id/status
- POST /api/complaints/:id/attachments
- GET /api/complaints/:id/attachments/:attachmentId

```powershell
npm test
npm run test:browser
```

API tests memakai data temporer terpisah dan menguji persistensi, konkurensi,
validasi, serta upload. Browser test menggunakan Edge pada Windows
(Chromium Playwright pada platform lain). Data demo Anda tidak di-reset.
