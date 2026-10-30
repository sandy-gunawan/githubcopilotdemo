# Catatan mentah rapat - siap diolah jadi notulen

**SINTETIS / BUKAN PRODUKSI.** Semua nama di sini tokoh rekaan.
Ini rapat lanjutan untuk demo notulen, bukan pengganti catatan 19 Oktober
di meeting-notes.md. Tugas dokumentasi di bawah bukan izin mengubah sistem.

## Info rapat

- Judul: Tindak lanjut panduan keluhan transfer Bank Nusa Demo.
- Tanggal: 2026-10-20, 09:00-09:30 WIB (02:00-02:30 UTC).
- Penyelenggara dan reviewer notulen: Lila, Supervisor (tokoh rekaan).
- Hadir: Lila (Supervisor), Mira (CS), Danu (Operations), Raka (BA),
  Ika (Solution Architect). Tidak ada peserta absen.
- Tempat: Ruang rapat simulasi; tidak ada tautan meeting.
- Pembaca notulen: kelima peserta di atas. Penulis: Copilot, draft untuk review.
- Bahan: business-policy.md, complaints.csv, system-landscape.md.
- Tidak ada rekaman audio. Bahan yang dipakai adalah catatan teks di bawah.

## Agenda

1. Lihat angka contoh keluhan.
2. Sepakati isi panduan dan diagram.
3. Bagi tugas menyiapkan bahan review.
4. Catat hal yang belum diputuskan.

## Obrolan rapat

09:00 - Lila: "Hari ini kita rapikan bahan kerja tim, bukan menyetujui
perubahan aplikasi. Tetap pakai aturan versi 1.0: respons awal maksimal
15 menit dan kasus aktif di menit 120 dibawa ke supervisor."

09:04 - Mira: "Dari 12 kasus contoh, 9 mendapat respons awal tepat waktu.
Berarti 75%. Saya mau contoh kalimat ke pelanggan lebih gampang dipahami."

09:08 - Danu: "Ada 5 kasus yang investigasinya lebih dari 120 menit.
Pengecekan umur kasus dan kirim ulang pesan masih manual. Tapi dari angka
itu saja kita belum bisa bilang kenapa lambat."

09:12 - Raka: "Panduan perlu gambar alur. Jangan cuma jalur lancar:
data kurang lengkap, dugaan penipuan, lewat batas waktu, dan pesan gagal
kirim harus ikut. Saya siapkan draft SOP dan diagram untuk direview."

09:16 - Ika: "Saya bisa siapkan gambar sistem sekarang dan perbandingan
opsi antrean kirim pesan. Scheduler dan outbox masih usulan; jangan
digambar seolah-olah sudah berjalan."

09:20 - Lila: "Sepakat. Raka, draft SOP dan diagram paling lambat
22 Oktober. Mira, contoh pesan ke pelanggan 21 Oktober. Danu, checklist
tutup kasus 22 Oktober. Ika, perbandingan opsi desain 23 Oktober.
Semua tanggal tahun 2026, untuk bahan latihan ini."

09:24 - Mira: "Untuk tutup kasus, masalah sudah selesai, hasil sudah
berhasil dikirim, dan catatan audit ada. Kalau pesan gagal, jangan ditutup."

09:27 - Lila: "Betul. Budget, tanggal implementasi, dan target layanan baru
belum dibahas. Ambang 90 menit juga belum disetujui. Catat sebagai
pertanyaan terbuka, jangan jadi keputusan rapat."

09:30 - Lila: "Review berikutnya 26 Oktober 2026 jam 09:00 WIB.
Kita cek empat draft tadi. Notulen cukup disimpan lokal untuk saya review,
tidak usah kirim email atau buat issue sungguhan."

## Arti tugas selesai

- Raka: SOP + diagram memuat semua cabang dan aturan 15/120 menit.
- Mira: contoh pesan penerimaan, permintaan data, dan hasil penyelesaian.
- Danu: checklist mengecek resolusi, bukti pesan berhasil, dan audit.
- Ika: perbandingan manual retry vs outbox, plus-minus dan hal yang perlu diuji.

Nama dan tenggat di sini diberikan oleh cerita, bukan dugaan Copilot.
Jangan membawa penugasan ini ke demo lain sebagai komitmen implementasi.
