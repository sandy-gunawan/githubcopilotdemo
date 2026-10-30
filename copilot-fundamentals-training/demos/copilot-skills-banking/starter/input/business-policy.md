# Kebijakan simulasi penanganan keluhan transfer

**SINTETIS / BUKAN PRODUKSI.** Bank Nusa Demo adalah organisasi fiktif.
Dokumen ini bukan kebijakan bank nyata, ketentuan OJK, atau nasihat kepatuhan.
Versi baseline: 1.0, snapshot 2026-10-19, zona waktu WIB (UTC+07:00).

## Tujuan dan ruang lingkup

Customer service (CS) menangani keluhan status transfer menggunakan referensi
transaksi dummy. Tidak ada pemindahan dana, perubahan saldo, pemblokiran rekening,
atau penyimpanan nomor rekening. Simulator hanya memberi status transaksi.

## Aktor

- Nasabah sintetis: mengirim keluhan dan melengkapi data dummy.
- CS: memverifikasi kelengkapan, memberi acknowledgement, dan membuka kasus.
- Operations: memeriksa status di simulator dan menyusun hasil investigasi.
- Supervisor: menerima eskalasi SLA atau indikasi fraud; memutuskan tindak lanjut.
- Reviewer workshop: memeriksa konsistensi dokumen; bukan approver bank nyata.

## Alur baseline

1. Keluhan diterima. Sistem memberi ID kasus dan `received_at`.
2. CS mengecek kelengkapan: ID pelanggan sintetis, referensi transaksi dummy,
   kanal, dan deskripsi. Jika tidak lengkap, minta perbaikan. Jam SLA tetap
   berjalan, tidak di-reset. CS tetap mengirim acknowledgement.
3. Acknowledgement dikirim paling lambat 15 menit sejak `received_at`.
   Tepat 15 menit masih memenuhi SLA. Bukti waktunya adalah `ack_at`.
4. Jika ada dugaan fraud, CS segera mengeskalasi ke supervisor untuk review
   manusia. Tidak menunggu ambang 120 menit dan tidak melakukan blokir otomatis.
5. Kasus biasa diteruskan ke Operations. Operations membaca status transaksi
   dari Core Banking Simulator, tanpa hak menulis transaksi.
6. Untuk kasus yang masih aktif, ketika elapsed >= 120 menit sejak
   `received_at`, eskalasi wajib ke supervisor. Tepat 120 menit sudah memicu
   eskalasi bila masih aktif. Dalam as-is, pengecekan dilakukan manual.
7. Operations mengusulkan resolusi; CS mengirim hasil melalui Notification Stub.
   Kegagalan kirim dicatat dan diulang manual. Kasus belum boleh ditutup.
8. Kasus ditutup hanya setelah ada `resolved_at`, bukti notifikasi berhasil
   (`notified_at`), dan jejak audit. `closed_at` tidak boleh lebih awal dari
   `notified_at`. Penyelesaian investigasi berbeda dari penutupan kasus.

## Definisi waktu dan metrik workshop

- Semua durasi menggunakan menit kalender 24/7, bukan jam kerja.
- Ack duration = `ack_at - received_at`; terlambat jika > 15 menit.
- Resolution duration = `resolved_at - received_at`.
- Metrik "melewati 120 menit" dihitung jika resolution duration > 120.
  Ini bukan bukti bahwa eskalasi sungguh telah dilakukan.
- Data agregat hanya mencakup 12 kasus biasa, lengkap, resolved, pada CSV.
  Cabang data tidak lengkap, fraud, dan kegagalan notifikasi tidak ada di CSV;
  uji cabang tersebut menggunakan skenario naratif, bukan angka rekaan.
- Tidak ada target perbaikan kuantitatif atau estimasi kerugian finansial
  yang disetujui. Jika dibutuhkan, tulis TBD / perlu persetujuan.

## Pengecualian dan larangan

- Jangan menyatakan bahwa aturan ini memenuhi regulasi perbankan.
- Jangan membuat root cause pasti hanya dari korelasi durasi.
- Jangan mengubah threshold baseline tanpa change request eksplisit.
- Nama PIC dan tanggal komitmen yang belum disetujui harus TBD.
