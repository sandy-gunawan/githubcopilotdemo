# 7. Cara menyalakan dan mengecek demo

**Tujuan bab ini:** Anda tahu apa yang perlu dinyalakan, hasil yang seharusnya
terlihat, dan langkah pertama jika ada kendala.

Jika **http://127.0.0.1:4173** sudah terbuka dan berfungsi, Anda dapat langsung
ke [panduan aplikasi](05-panduan-aplikasi.md). Tidak perlu menginstal ulang atau
menjalankan server kedua.

## Kenali empat hal sebelum mengetik perintah

| Istilah | Arti sederhana |
|---|---|
| Terminal / PowerShell | Jendela untuk memberi perintah kepada komputer |
| Node.js | Program yang menjalankan kode server demo |
| npm | Alat untuk menyiapkan paket bantuan dan menjalankan perintah proyek |
| Server | Program yang hidup dan menunggu permintaan dari browser atau client |

**Paket / dependency** adalah kode bantuan yang dipakai aplikasi.
**Folder proyek** adalah folder tempat semua berkas aplikasi ini berada.

Alamat `127.0.0.1` berarti komputer Anda sendiri. Angka `4173` adalah
**port layanan web**, yaitu nomor tempat program menerima koneksi.
Ini berbeda dengan port switch `Gi0/1` yang dibahas pada kasus Bandung.

Dalam kantor operasi, Node.js menyalakan ruang kerjanya, server membuka loket,
dan browser adalah layar tempat engineer memakai layanan.

## Langkah 1: pastikan alat dasarnya tersedia

### Mengapa?

Tanpa program yang menjalankan server, file source code hanya tersimpan di disk.

### Di mana?

Buka folder aplikasi di **VS Code**, lalu pilih **Terminal > New Terminal**.
Gunakan PowerShell.

### Ketik

```powershell
node --version
npm --version
```

### Hasil yang dibuat dan dipakai

Perintah ini hanya menampilkan versi; tidak membuat database atau mengubah data.
Demo membutuhkan **Node.js major 24, minimal 24.13**.

### Cara mengecek

Versi Node harus seperti `v24.x.x`. Jika perintah tidak ditemukan, pasang
Node.js yang sesuai sebelum lanjut.

> **Analogi kantor:** pastikan peralatan ruang kerja tersedia sebelum loket dibuka.
>
> **Risiko yang dicegah:** program tidak bisa berjalan atau SQLite bawaan tidak
> tersedia. Lihat [kendala alat dasar](#program-tidak-dikenali).

## Langkah 2: siapkan aplikasi dan isi lemari arsip

### Mengapa?

Server memerlukan paket bantuan, dan agent memerlukan data yang benar-benar
tersedia untuk dibaca.

### Di mana?

Terminal di folder:
`C:\clients\Organization\demo\fundamental\network-mcp-demo`.

### Ketik

```powershell
Set-Location 'C:\clients\Organization\demo\fundamental\network-mcp-demo'
npm ci
npm run data:generate
npm run seed
```

### Hasil yang dibuat dan dipakai

| Perintah | Membuat / menyiapkan apa? | Dipakai oleh siapa? |
|---|---|---|
| `npm ci` | Paket aplikasi sesuai daftar versi proyek | Program frontend, server dan agent |
| `npm run data:generate` | Data JSON dan file dokumen dummy | Proses ingestion |
| `npm run seed` | Data awal dalam SQLite dan index pencarian | Dashboard dan MCP tools |

**JSON** adalah format data berisi nama dan nilai. **Ingestion** adalah proses
memasukkan sumber ke database, seperti menata arsip dan katalog di kantor.

### Cara mengecek

Pesan seed awal menunjukkan **25 device, 600 metrics dan 10 dokumen**.
Jika database sudah pernah diisi paket identik, seed dapat mengatakan data
sudah di-ingest; perubahan runtime tidak ditimpa.

> **Analogi kantor:** paket bantuan menyiapkan peralatan, generator menyiapkan
> berkas contoh, seed menatanya di lemari.
>
> **Risiko yang dicegah:** loket aktif tetapi arsip kosong. Lihat
> [kendala seed](#data-awal-belum-tersedia).

## Langkah 3: buka loket aplikasinya

### Mengapa?

Browser perlu program server yang sedang hidup untuk menjawab permintaan.

### Di mana dan apa yang diketik?

Pada terminal proyek:

```powershell
npm run dev
```

Biarkan terminal berjalan. **Dev** adalah mode pengembangan untuk menjalankan
aplikasi saat dikerjakan.

### Hasil yang dibuat dan dipakai

Server lokal melayani halaman web, API web dan MCP pada port 4173.
Browser dan client agent dapat menghubunginya.

### Cara mengecek

Buka **http://127.0.0.1:4173**. Pada menu Ringkasan, dataset awal mempunyai
25 perangkat dan 10 knowledge sources.

**Knowledge source** pada layar berarti dokumen sumber pengetahuan.

> **Analogi kantor:** pintu layanan dibuka; engineer sekarang dapat melihat
> papan ringkasan dan meminta arsip.
>
> **Risiko yang dicegah:** browser menghubungi loket yang belum dibuka.
> Lihat [alamat tidak terbuka](#alamat-aplikasi-tidak-bisa-dibuka).

Untuk menghentikan server yang Anda jalankan di terminal, tekan **Ctrl+C pada
terminal tersebut**. Jangan mematikan proses aplikasi lain.

## Langkah 4: login dan hubungkan agent

### Mengapa?

Dashboard lokal dapat membaca SQLite sendiri. Chat AI perlu layanan model
GitHub Copilot, akun yang sesuai dan koneksi internet.

### Di mana dan apa yang dilakukan?

Buka terminal lain pada proyek dan jalankan:

```powershell
copilot login
```

Ikuti proses login. Lalu kembali ke web, buka **Copilot > Hubungkan Copilot**.

### Hasil yang dibuat dan dipakai

Login menyiapkan akses akun untuk layanan Copilot. Backend memakai akses itu
melalui SDK, yaitu paket bantuan yang menyambungkan aplikasi ke runtime Copilot.
Tidak perlu memasukkan API key pada kotak chat.

### Cara mengecek

Status di panel menyatakan terhubung. Kirim pertanyaan sederhana:

> Baca BR-SW-01 dan sebutkan pemakaian uplink. Jangan mengubah data.

Periksa hasil tool dan angka pada detail device.

> **Analogi kantor:** asisten memperoleh akses kerja lalu membuktikan dapat
> mengambil arsip yang benar.
>
> **Risiko yang dicegah:** mengira jawaban AI tersedia ketika akun belum siap.
> Lihat [kendala agent](#dashboard-terbuka-tetapi-agent-gagal).

**Privasi:** pesan dan hasil tool yang relevan diproses layanan model Copilot.
Gunakan data dummy ini saja, bukan kredensial atau dokumentasi rahasia.
Pemakaian dapat mengonsumsi kuota akun.

## Langkah 5: buktikan angka dan dokumen saling terhubung

### Mengapa?

Halaman yang berhasil terbuka belum membuktikan agent mengambil sumber yang tepat.

### Di mana?

Ikuti [latihan Bandung](06-skenario-demo.md): baca device, cari runbook, lalu
ajukan pertanyaan gabungan.

### Hasil yang dibuat dan dipakai

Tool menghasilkan angka dan teks. Model memakai hasil itu untuk menjelaskan
95%, loss 3.2% dan panduan pemeriksaan di atas 85%.

### Cara mengecek

Buka trace. Cocokkan nama perangkat, ID dokumen dan hasilnya dengan halaman
Inventaris serta Knowledge. Tidak perlu ada perubahan data pada latihan baca.

> **Analogi kantor:** periksa arsip yang betul-betul diambil, bukan hanya
> melihat lampu loket menyala.
>
> **Risiko yang dicegah:** menerima jawaban umum yang tidak didukung data.
> Lihat [jawaban tanpa bukti](#jawaban-tidak-menyebut-bukti).

## Kendala umum: gejala, alasan dan langkah berikutnya

### Program tidak dikenali

- **Gejala:** `node`, `npm` atau `copilot` tidak ditemukan.
- **Alasan:** program belum terpasang atau terminal belum mengenali lokasinya.
- **Lakukan:** siapkan program yang dibutuhkan, buka terminal baru, ulangi
  [langkah 1](#langkah-1-pastikan-alat-dasarnya-tersedia) atau
  [langkah 4](#langkah-4-login-dan-hubungkan-agent).
- **Analogi kantor:** alat kerjanya belum ada; jangan menyalahkan isi arsip.

### Data awal belum tersedia

- **Gejala:** startup menyatakan seed belum ada atau ingestion ditolak.
- **Alasan:** file awal belum dibuat, atau Anda mencoba menimpa dataset berbeda.
- **Lakukan:** ulangi [langkah 2](#langkah-2-siapkan-aplikasi-dan-isi-lemari-arsip).
  Jangan memakai reset hanya untuk menghilangkan error tanpa memahami akibatnya.
- **Analogi kantor:** map belum ditata, atau arsip baru berbeda dengan arsip
  yang sudah disimpan.

### Alamat aplikasi tidak bisa dibuka

- **Gejala:** browser tidak mendapat halaman.
- **Alasan:** server belum berjalan, URL berbeda, atau port sedang dipakai.
- **Lakukan:** periksa terminal pada [langkah 3](#langkah-3-buka-loket-aplikasinya).
  Jika ada `EADDRINUSE`, nomor port sudah dipakai. Jangan hentikan proses lain
  sembarangan; panduan mengganti port ada di referensi teknis.
- **Analogi kantor:** loket belum buka atau nomor loket sedang dipakai kantor lain.

### Dashboard terbuka tetapi agent gagal

- **Gejala:** data terlihat, tetapi panel Copilot memberi error.
- **Alasan:** layanan data lokal dan layanan AI berbeda. Login, subscription,
  internet atau model yang dipilih mungkin belum tersedia.
- **Lakukan:** ulangi [langkah 4](#langkah-4-login-dan-hubungkan-agent), baca pesan
  error, lalu coba hubungkan kembali.
- **Analogi kantor:** lemari arsip tersedia, tetapi asisten belum memperoleh
  akses kerjanya. Ini bukan berarti arsip hilang.

### Search tidak menemukan yang diharapkan

- **Gejala:** daftar hasil kosong.
- **Alasan:** keyword tidak tertulis atau filter terlalu sempit.
- **Lakukan:** gunakan `congestion` untuk kasus Bandung dan periksa filter.
  Bedakan daftar hasil dengan isi dokumen, seperti
  [latihan C](06-skenario-demo.md#latihan-c-minta-asisten-mencari-catatan).
- **Analogi kantor:** kata pada katalog tidak cocok; petugas tidak boleh
  membuat map fiktif agar terlihat berhasil.

### Jawaban tidak menyebut bukti

- **Gejala:** jawaban terlalu umum atau mengaku melakukan pemeriksaan hardware.
- **Alasan:** jawaban belum dapat dipercaya tanpa hasil tool yang sesuai.
- **Lakukan:** ulangi [langkah 5](#langkah-5-buktikan-angka-dan-dokumen-saling-terhubung)
  dan minta agent menyebut hasil tool serta ID dokumen.
- **Analogi kantor:** minta nomor arsip yang benar-benar dibuka, bukan hanya opini.

## Mengulang data awal, build dan pengaturan tambahan

- **Reset** menghapus hasil latihan sebelumnya. Gunakan hanya jika memang
  ingin kembali ke awal; lihat [panduan reset](05-panduan-aplikasi.md#reset-hanya-jika-ingin-mengulang-latihan).
- **Build** menyiapkan hasil aplikasi yang siap dijalankan tanpa mode dev.
  Perintahnya `npm run build`, lalu `npm start`.
- Pengaturan port, model, database dan client MCP eksternal ada di
  [referensi operasional](referensi/operasional.md).
- Detail hasil pengujian yang benar-benar dilakukan ada di
  [hasil validasi](09-hasil-validasi.md).

**Intinya:** buka servernya, pastikan arsipnya ada, siapkan akses asisten, lalu
uji dengan meminta arsip yang betul-betul dibutuhkan.
