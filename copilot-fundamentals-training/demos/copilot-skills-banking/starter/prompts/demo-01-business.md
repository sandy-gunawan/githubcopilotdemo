Tolong buatkan panduan kerja penanganan keluhan transfer untuk tim CS dan
Operations Bank Nusa Demo. Pakai bahasa sehari-hari, tapi tetap rapi.

Baca input/business-policy.md, input/meeting-notes.md, dan input/complaints.csv.
Gunakan skill documentation-writer, draw-io-diagram-generator, dan md-to-docx
di .github/skills; baca SKILL.md masing-masing sebelum mulai.

Susunan ini sudah saya setujui: tujuan, siapa yang bertugas, diagram alur,
langkah kerja, batas waktu layanan, pengecualian, dan cek sebelum tutup kasus.
Langsung buat hasilnya; tidak perlu menunggu persetujuan outline lagi.
Ikuti alur dan aturan versi 1.0, termasuk data kurang lengkap, dugaan fraud,
eskalasi kasus aktif >=120 menit, dan notifikasi gagal. Hitung metrik dari CSV.

Simpan di output/demo-01/ (kalau sudah ada, pakai nama folder baru):
- panduan-keluhan.md dan panduan-keluhan.docx, dengan diagram DI DALAM dokumen.
- diagrams/alur-keluhan.drawio untuk diedit dan alur-keluhan.svg untuk dirender.
Di Markdown, pakai gambar relatif diagrams/alur-keluhan.png.

Jalankan scripts/render-diagram.cjs untuk membuat PNG, lalu konverter
.github/skills/md-to-docx/scripts/md-to-docx.mjs untuk membuat Word.
Kerjakan sampai file jadi, bukan hanya memberi saya perintah terminal.
Cek PNG benar-benar masuk ke Word. Tandai semua hasil "SINTETIS / BUKAN PRODUKSI".
Terakhir, tampilkan link dokumen Word dan diagramnya. Kalau ada tool yang
belum siap, jelaskan kendalanya; jangan bilang berhasil kalau file belum jadi.
