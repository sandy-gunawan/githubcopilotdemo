# System landscape - declared simulation

**SINTETIS / BUKAN PRODUKSI.**
Versi 1.0, 2026-10-19. Ini fixture arsitektur, bukan hasil pembacaan aplikasi
yang berjalan. Tidak ada deployment, endpoint bank, atau kredensial.

## As-is yang dinyatakan dalam fixture

| ID | Komponen | Tanggung jawab | Batasan |
|---|---|---|---|
| WEB | Portal & CS Workspace | UI nasabah sintetis dan CS dengan peran berbeda | Tidak mengakses database langsung |
| GW | API Gateway | Routing permintaan demo dan validasi token simulasi | Tidak memproses transaksi finansial |
| SVC | Complaint Service | Membuat kasus, mencatat status, memanggil adapter | Monolit modular dalam simulasi |
| DB | Complaint Database (PostgreSQL) | Metadata kasus dan waktu proses | Bukan ledger, tidak menyimpan rekening |
| CORE | Core Banking Simulator | Memberi status referensi transaksi dummy | Read-only; bukan core banking nyata |
| NOTIFY | Notification Stub | Mensimulasikan pengiriman hasil dan receipt | Bisa gagal; retry manual |
| AUDIT | Audit Store | Mencatat event perubahan status | Tidak berisi payload finansial/PII |

## Relasi

- Nasabah sintetis dan CS memakai WEB.
- WEB -> GW -> SVC menggunakan HTTP simulasi.
- SVC -> DB untuk metadata kasus.
- SVC -> CORE hanya `GET /demo/payments/{reference}/status`.
- SVC -> NOTIFY untuk permintaan notifikasi; receipt dicatat di DB.
- SVC -> AUDIT untuk event perubahan status.
- Operations dan supervisor melakukan review manual melalui WEB.
- Belum ada scheduler SLA, message broker, outbox, atau worker retry.

## Sequence yang perlu didokumentasikan

1. CS membuat kasus via WEB dan GW.
2. SVC menyimpan metadata di DB dan event di AUDIT.
3. Operations meminta status; SVC membaca CORE.
4. Operations menyatakan investigasi resolved.
5. CS meminta pengiriman hasil; SVC memanggil NOTIFY.
6. Jika gagal: catat kegagalan, tetap terbuka, retry manual.
7. Jika berhasil: simpan `notified_at`; baru izinkan close dan event audit.

Gateway, auth, dan persistensi di sini hanyalah deklarasi fixture; jangan
mengklaim efektivitas kontrol atau compliance tanpa bukti implementasi.

## To-be yang boleh dibahas, belum disetujui

- SLA Scheduler: menandai kasus aktif dengan elapsed >= 120 menit.
- Transactional outbox + notification worker: pengiriman ulang yang durable.
- Idempotency key dan deduplikasi notifikasi.

Gambarkan terpisah, beri label USULAN. Jangan mengubah as-is agar terlihat
lebih modern. Jangan menambah cloud vendor, HA, RTO/RPO, atau biaya yang
belum diberikan.

## Unknowns

Volume produksi, kapasitas, ketersediaan, retensi audit, RTO/RPO, desain IAM
produksi, dan deployment target adalah TBD. Tidak ada keputusan regulator.

## Evidence

Gunakan file ini, `openapi.yaml`, `business-policy.md`, dan `meeting-notes.md`.
Jika ada konflik, laporkan konflik; jangan memilih diam-diam.
