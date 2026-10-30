# Certificate Expiry Monitor

Demo aplikasi read-only untuk tim Infrastructure Operations: temukan sertifikat
yang mendekati kedaluwarsa melalui indikator warna, ringkasan, filter, dan refresh.

**Data simulasi/offline.** Semua hostname `.test` dan hasil pemeriksaan adalah
fiktif. Aplikasi tidak menghubungi server, membaca sertifikat asli, atau melakukan
renewal. Status hijau hanya menunjukkan masa berlaku, bukan validitas trust,
chain, hostname, atau revocation TLS.

## Fitur dan aturan status

| Status | Label | Warna | Aturan sisa waktu |
|---|---|---|---|
| HEALTHY | Normal | Hijau | Lebih dari 30 hari |
| WARNING | Segera kedaluwarsa | Kuning | Lebih dari 7 sampai 30 hari |
| CRITICAL | Kritis | Merah | Lebih dari 0 sampai 7 hari |
| EXPIRED | Kedaluwarsa | Merah tua | Nol atau sudah lewat |
| ERROR | Gagal diperiksa | Abu-abu | Metadata tidak tersedia dalam simulasi |

- Perhitungan menggunakan UTC, satu hari = 86400 detik.
- Batas tepat 30 hari adalah WARNING; tepat 7 hari CRITICAL; tepat nol EXPIRED.
- Sisa hari positif dibulatkan ke atas hanya untuk tampilan, bukan klasifikasi.
- Delapan layanan bawaan saat startup: **2 HEALTHY, 2 WARNING, 2 CRITICAL,
  1 EXPIRED, 1 ERROR**.
- Ringkasan selalu mencakup seluruh inventaris, meskipun tabel sedang difilter.
- Urutan: EXPIRED, CRITICAL, WARNING, ERROR, HEALTHY; kemudian tanggal, nama, ID.
- Refresh menghitung ulang waktu dan mempertahankan filter, tanpa mengubah expiry.
- Tidak ada login, database, scheduler, notifikasi, atau integrasi cloud.

## Menjalankan dengan Docker

Prasyarat: Docker dengan Linux containers dan daemon aktif. Build awal membutuhkan
akses registry dan package index; setelah image siap, runtime tidak membutuhkan
layanan eksternal atau CDN. Platform yang telah divalidasi: Linux/amd64 melalui
Docker Desktop pada Windows.

Jalankan PowerShell dari root repository:

```powershell
Set-Location .\demos\certificate-expiry-monitor
docker info
docker build --check .
docker build -t certificate-expiry-monitor:demo .
docker run --detach --rm --name certificate-expiry-monitor-demo --read-only --cap-drop=ALL --security-opt=no-new-privileges:true --publish 127.0.0.1:8080:8080 certificate-expiry-monitor:demo
```

Jika jaringan Docker memerlukan mirror paket, tersedia build argument
`PIP_INDEX_URL` dengan default `https://pypi.org/simple`. Build di lingkungan
validasi menggunakan mirror berikut:

```powershell
docker build --build-arg PIP_INDEX_URL=https://packagefeedproxy.microsoft.io/pypi/simple/ -t certificate-expiry-monitor:demo .
```

Gunakan hanya mirror HTTPS yang diizinkan lingkungan Anda, **tanpa kredensial
di URL**. Jangan menonaktifkan verifikasi TLS. Kegagalan akses package index adalah
masalah persiapan build, bukan alasan menambahkan koneksi eksternal saat runtime.

Buka [http://127.0.0.1:8080](http://127.0.0.1:8080), lalu periksa kesiapan:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8080/healthz'
docker inspect --format '{{.State.Health.Status}}' certificate-expiry-monitor-demo
docker logs certificate-expiry-monitor-demo
```

Hasil `/healthz`: HTTP 200 dengan JSON `{"status":"ok","mode":"demo"}`.
Tunggu sampai health container `healthy`. Adanya sertifikat EXPIRED atau ERROR
tidak menggagalkan readiness aplikasi.

Port dipublish hanya ke loopback host. Jangan mengganti binding menjadi semua
interface untuk demo tanpa autentikasi ini. Jika port 8080 terpakai, pilih port
host lain, misalnya `127.0.0.1:8081:8080`, dan sesuaikan URL browser.

### Menghentikan dan mereset

```powershell
docker stop certificate-expiry-monitor-demo
```

`--rm` menghapus container yang berhenti, bukan image atau kode. Untuk reset,
jalankan lagi perintah `docker run` di atas: tanggal expiry dibuat ulang relatif
terhadap startup baru. Tidak perlu mengubah tanggal komputer atau menghapus data.
Jangan menghentikan container lain jika nama tersebut sudah digunakan.

## Development dan pengujian

Prasyarat: Python 3.11+ dan PowerShell. Gunakan virtual environment lokal; tidak
perlu mengaktifkannya atau memasang paket secara global.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe -m pytest -q
```

Instalasi dependensi/browser dapat membutuhkan jaringan. Seluruh test aplikasi
menggunakan fixture dan server loopback sendiri, tanpa TLS live atau Docker.
Docker diuji terpisah sebagai gate deployment.

Untuk iterasi unit/integration tanpa menjalankan browser:

```powershell
.\.venv\Scripts\python.exe -m pytest -q -m "not browser"
```

Untuk menjalankan aplikasi langsung dari Python, gunakan terminal terpisah:

```powershell
.\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8080 --call certificate_monitor:create_app
```

Hentikan dengan `Ctrl+C`. Jangan menjalankan server Python dan container pada port
yang sama. Tidak perlu Flask debug mode.

### Cakupan test dan hasil validasi

- **71 unit/integration test**: loader dan fixture invalid, batas 30/7/0 hari,
  timezone, pembulatan, sorting, summary, query invalid, refresh, healthz, escaping,
  dan asset lokal.
- **8 browser test dalam tiga file**: dashboard, seluruh filter, empty state,
  HTTP 400/recovery, refresh pada waktu terkendali, metadata sebagai teks, dan
  scrolling tabel pada viewport sempit.
- Seluruh **79 test lulus, 0 gagal, 0 skip** pada Python 3.13.14 dan Chromium.
- `docker build --check` tanpa warning; image menggunakan Waitress, UID 10001,
  healthcheck, filesystem read-only saat dijalankan, dan tidak memuat tooling test.
- Browser smoke terhadap image yang benar-benar berjalan berhasil. Navigasi,
  filter, dan refresh yang diukur: **0.0788-0.2052 detik**, di bawah batas 2 detik.
  Tidak ada request eksternal atau error browser.
- Container validasi telah dihentikan; image `certificate-expiry-monitor:demo`
  tetap tersedia pada mesin yang digunakan untuk build.

Angka di atas adalah hasil validasi lingkungan lokal, bukan jaminan performa
produksi. Jalankan kembali test setelah mengubah aplikasi atau dependensinya.

## Data dan perilaku error

Fixture ada di [certificates.json](./certificate_monitor/data/certificates.json).
Setiap entry memiliki ID, nama, hostname, port, environment, issuer,
`expires_in_seconds`, dan `error_reason`.

Offset diubah menjadi tanggal expiry absolut **sekali saat startup**, lalu data
disimpan immutable. Refresh tidak membaca ulang fixture; perubahan fixture baru
terlihat setelah server/container baru dijalankan. Untuk container, perubahan
kode atau fixture memerlukan build image baru.

Entry ERROR harus mempunyai alasan nonkosong dan offset `null`. File hilang,
kosong, JSON rusak, ID duplikat, atau skema invalid menggagalkan startup dengan
diagnosis eksplisit; aplikasi tidak mengubahnya menjadi inventaris kosong.

## Troubleshooting

| Masalah | Tindakan |
|---|---|
| Docker daemon tidak merespons | Aktifkan Docker Desktop/Linux containers; pastikan `docker info` berhasil. |
| Build gagal TLS/package index | Gunakan mirror HTTPS yang disetujui melalui `PIP_INDEX_URL`; jangan memakai bypass TLS. |
| Port/nama container terpakai | Pilih nama/port demo lain; jangan menghentikan proses atau container milik orang lain. |
| Browser test tidak menemukan Chromium | Jalankan instalasi Chromium dengan executable `.venv` yang sama. Jangan mengganti kegagalan menjadi skip. |
| Filter mendapat HTTP 400 | Gunakan `all`, `healthy`, `warning`, `critical`, `expired`, atau `error` dalam huruf kecil. |
| Startup gagal memuat fixture | Baca log, perbaiki skema/path; jangan menambahkan fallback data sukses. |
| Data tidak kembali ke kondisi awal saat Refresh | Ini perilaku yang benar; jalankan ulang aplikasi/container untuk reset waktu startup. |

## Alur presentasi

Ikuti [skrip demo lima tahap](./docs/demo-script.md):
**Planning -> Code creation -> Reviews -> Testing -> Deployment**.

Mulai dari gambaran delapan layanan, filter CRITICAL untuk menunjukkan VPN dan
Backup, jelaskan ERROR terpisah dari EXPIRED, tunjukkan pengujian batas waktu,
lalu verifikasi deployment lokal. Semua ini dilakukan tanpa akses produksi.
