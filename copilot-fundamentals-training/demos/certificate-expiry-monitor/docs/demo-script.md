# Skrip Demo: Certificate Expiry Monitor

## Tujuan dan cerita

Audience adalah tim Infrastructure Operations. Cerita bisnisnya: operator perlu
menentukan sertifikat mana yang harus segera ditindaklanjuti, tanpa membuka
inventaris satu per satu.

Nilai demo bukan integrasi PKI produksi, melainkan bagaimana Copilot membantu
menjalankan SDLC lengkap untuk sebuah alat operasi yang mudah dipahami.

## Persiapan presenter

1. Ikuti [setup dan quick start](../README.md). Siapkan dependensi, Chromium,
   Bootstrap lokal, dan image sebelum memutus akses jaringan.
2. Pastikan tidak ada konflik port/nama container.
3. Siapkan VS Code dengan Chat Copilot dan terminal PowerShell.
4. Gunakan branch/folder latihan yang Anda siapkan sendiri bila ingin
   memperagakan pembuatan kode dari awal; aplikasi ini dapat menjadi hasil
   referensi. Jangan menimpa demo lain atau memperkenalkan bug ke hasil final.
5. Untuk kondisi data awal, jalankan instance aplikasi baru. Refresh tidak
   mereset tanggal kedaluwarsa.

Tidak ada secret, sertifikat/private key asli, akun cloud, atau akses server
produksi yang diperlukan.

## 1. Planning

**Narasi**: "Sebelum meminta kode, kita sepakati data, batas warna, dan apa yang
tidak boleh dilakukan aplikasi."

**Prompt**:

```text
Rancang Certificate Expiry Monitor sederhana untuk operator infrastruktur.
MVP read-only: delapan layanan simulasi, summary, filter status, refresh manual.
Tidak ada TLS live, login, database, notifikasi, atau renewal.
Hijau >30 hari; kuning >7 sampai 30 hari; merah >0 sampai 7 hari;
EXPIRED saat waktu habis; ERROR terpisah. Gunakan UTC dan klasifikasi
berdasarkan detik, bukan angka hari yang dibulatkan.
Pilih Python, Flask, Bootstrap lokal, pytest, dan Docker lokal.
Tuliskan user stories, acceptance criteria, task dependency, dan strategi test.
Jangan implementasi sebelum scope disepakati.
```

**Tunjukkan**: requirements, batas scope, dan aturan waktu pada
[README](../README.md). Pada sesi perencanaan lengkap, PRD dan plan diserahkan
sebagai konteks ke agent implementasi.

**Gate**: Audience memahami bahwa warna bukan hasil pengecekan trust TLS dan
tidak ada tindakan otomatis ke server.

## 2. Code creation

**Narasi**: "Agent mengerjakan increment yang kecil dan dapat diuji: data,
aturan status, route, lalu tampilan."

**Prompt**:

```text
Implementasikan rencana yang disepakati dalam folder demo terisolasi.
Gunakan Flask create_app dengan clock injectable, loader JSON ketat,
data immutable, dan expiry yang dibentuk sekali saat startup.
Buat test aturan waktu sebelum implementasinya, lalu route dan dashboard.
Bootstrap harus lokal dengan lisensi; metadata tetap di-escape.
GET / mendukung filter; GET /healthz mengembalikan status ok dan mode demo.
Jangan menambah fitur di luar scope atau mengubah demo lain.
Jalankan test modul tiap increment dan laporkan hasil aktual.
```

**Tunjukkan**:

- [data.py](../certificate_monitor/data.py): validasi dan materialisasi expiry.
- [status.py](../certificate_monitor/status.py): aturan yang dapat diuji terpisah.
- [factory Flask](../certificate_monitor/__init__.py): satu snapshot per request.
- [template dashboard](../certificate_monitor/templates/index.html): label status,
  summary dan filter.

**Hasil yang diharapkan**: Delapan baris, dengan summary awal
`Total 8 / HEALTHY 2 / WARNING 2 / CRITICAL 2 / EXPIRED 1 / ERROR 1`.

## 3. Reviews

**Narasi**: "Kode yang berhasil dijalankan belum tentu tepat pada kasus batas."

**Prompt**:

```text
Review perubahan aktual terhadap kebutuhan yang sudah disepakati.
Periksa batas tepat 30 hari, 7 hari, dan nol detik; timezone; pembulatan
sebelum klasifikasi; refresh yang tanpa sengaja menggeser expiry;
summary yang ikut terfilter; error yang disembunyikan; asset CDN;
escaping metadata; dan perubahan di luar folder demo.
Laporkan temuan correctness beserta bukti. Jangan mengubah hal di luar scope.
Jika ada perbaikan, jalankan ulang test yang terdampak.
```

**Tunjukkan pertanyaan review**:

| Pertanyaan | Perilaku yang benar |
|---|---|
| Tepat 7 hari? | CRITICAL, bukan WARNING. |
| Satu detik tersisa? | CRITICAL; tampilan "1 hari" tidak mengubah status. |
| Fixture rusak? | Startup gagal dengan diagnosis, bukan dashboard kosong. |
| Satu entry ERROR? | Entry lain tetap tampil; ERROR mempunyai alasan. |
| Memfilter CRITICAL? | Dua baris; summary inventaris tetap delapan layanan. |
| Refresh? | Waktu snapshot berubah; tanggal expiry tidak dibentuk ulang. |

**Gate**: Temuan correctness yang ada diselesaikan, bukan hanya dibacakan.
Jangan menyatakan ada temuan bila review aktual tidak menemukannya.

## 4. Testing

**Narasi**: "Kita buktikan aturan, route, dan perilaku yang benar-benar dilihat
operator, bukan sekadar memeriksa apakah file ada."

**Prompt**:

```text
Jalankan pytest untuk unit, integration Flask, dan browser Chromium.
Uji semua batas 30/7/0 hari satu detik sebelum, tepat, dan sesudah.
Uji summary, seluruh filter, empty state, HTTP 400, metadata sebagai teks,
dan refresh dengan clock terkendali tanpa sleep.
Buktikan CSS tidak membutuhkan jaringan eksternal dan halaman sempit
tidak melebar kecuali wrapper tabel.
Ukur navigasi, filter, refresh setelah server/browser siap; batas 2 detik.
Laporkan command, exit code, pass/fail/skip, dan area yang belum diuji.
```

**Command** dari folder demo:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

**Tunjukkan**:

- [Boundary test](../tests/test_status.py).
- [HTTP integration test](../tests/test_web.py).
- [Dashboard browser test](../tests/test_dashboard_browser.py).
- [Filter browser test](../tests/test_filters_browser.py).
- [Refresh browser test](../tests/test_refresh_browser.py).

**Hasil validasi implementasi ini**: 79 lulus, 0 gagal, 0 skip. Browser test
menjalankan server loopback yang dihentikan otomatis saat teardown.
Jika prasyarat browser gagal di mesin lain, perbaiki atau laporkan gap;
jangan mengklaim hasil browser sudah lulus berdasarkan unit test saja.

## 5. Deployment

**Narasi**: "Deployment selesai saat aplikasi dari image benar-benar responsif,
bukan saat perintah build atau start sekadar selesai."

**Prompt**:

```text
Validasi Dockerfile sebelum build. Gunakan image Python tepercaya yang dipin,
Waitress tanpa debug, user non-root, dan healthcheck yang memeriksa respons.
Jalankan container read-only dan publish port hanya ke localhost.
Verifikasi /healthz, summary awal, filter, asset offline, dan refresh.
Hentikan hanya container demo yang dibuat sendiri setelah validasi.
Tulis petunjuk startup, reset, shutdown, serta troubleshooting yang terbukti.
```

**Command**:

```powershell
docker build --check .
docker build -t certificate-expiry-monitor:demo .
docker run --detach --rm --name certificate-expiry-monitor-demo --read-only --cap-drop=ALL --security-opt=no-new-privileges:true --publish 127.0.0.1:8080:8080 certificate-expiry-monitor:demo
Invoke-RestMethod -Uri 'http://127.0.0.1:8080/healthz'
docker inspect --format '{{.Config.User}} / {{.State.Health.Status}}' certificate-expiry-monitor-demo
```

Jika package index memerlukan mirror HTTPS, gunakan build argument pada
[troubleshooting build](../README.md#menjalankan-dengan-docker).

**Alur di browser**, buka [dashboard](http://127.0.0.1:8080):

1. Tunjukkan banner "Data simulasi/offline" dan enam kartu ringkasan.
2. Pilih Kritis, tekan Terapkan: VPN dan Backup tampil; total tetap delapan.
3. Pilih Gagal diperiksa: Unknown tampil dengan alasan, bukan expiry rekaan.
4. Kembali ke Semua: baris EXPIRED berada paling atas.
5. Tekan Refresh: snapshot diperbarui tanpa menggeser tanggal expiry.
6. Jelaskan reset dilakukan dengan menjalankan instance baru, bukan dengan
   mengubah tanggal komputer atau menekan Refresh.

Hentikan demo setelah digunakan:

```powershell
docker stop certificate-expiry-monitor-demo
```

**Gate akhir**: Unit/integration/browser lulus, container healthy dan non-root,
interaksi memenuhi batas 2 detik pada lingkungan yang dicatat, serta tidak
ada akses produksi, request eksternal saat runtime, atau container validasi
yang ditinggalkan tanpa sengaja.

## Penutup

"Dari kebutuhan operasi yang sederhana, kita memperoleh rencana yang jelas,
kode yang bisa direview, test yang menguji kasus batas, dan deployment lokal
yang dapat diulang. Integrasi TLS live atau renewal adalah perubahan scope
berikutnya, bukan fitur yang diam-diam ditambahkan ke demo ini."
