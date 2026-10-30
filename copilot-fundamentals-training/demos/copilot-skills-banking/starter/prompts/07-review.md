Review konsistensi hasil Banking Skills Lab. Semua bersifat sintetis.
Baca input/business-policy.md, input/system-landscape.md, input/openapi.yaml,
input/complaints.csv, input/issue-backlog.md, dan hasil yang memang sudah ada.
Untuk demo cepat, cari dokumen dan spec di output/demo-01, output/demo-02,
output/demo-03 atau folder pengulangannya. Untuk latihan bertahap, gunakan
output/business-process.md, output/architecture-blueprint.md dan spec terkait.
Notulen ada di output/demo-04 atau folder pengulangannya; cocokkan keputusan,
PIC, tenggat, dan pertanyaan terbuka dengan input/meeting-transcript.md.
Laporan gangguan ada di docs/postmortems; cocokkan dengan
input/incident-chronology.md, bukan CSV keluhan. Pastikan total dampak
45 menit berbeda dari 40 menit alert-sampai-pulih, serta 120/2.400 = 5%.
Jika baru satu demo yang dijalankan, cek hasil itu saja dan sebutkan bagian
lain belum dibuat; jangan menganggapnya sebagai kegagalan.
Jangan mengubah file atau memanggil layanan eksternal selama review.

Periksa:
- Ack <= 15 menit; eskalasi kasus aktif >= 120 menit; fraud segera ke manusia.
- Close tidak sebelum receipt berhasil; failure tetap terbuka.
- Angka 12 kasus, 9/12 tepat waktu (75%), dan 5/12 resolusi > 120 menit
  dibuktikan ulang dari CSV, bukan disalin tanpa perhitungan.
- Diagram tertanam, label terbaca, narasi sesuai diagram.
- As-is tidak memiliki scheduler/outbox; to-be dan ADR berstatus usulan.
- Simulator read-only; klaim dan diagram memiliki sumber fixture.
- Deck berisi diagram nyata, label sintetis, sources, dan speaker notes.
- Tidak ada klaim compliance, manfaat finansial, PIC, atau due date rekaan.
  Nama tokoh dan tenggat yang memang diberikan dalam bahan dummy boleh dipakai.

Tampilkan temuan sebagai tabel: artefak, evidence, masalah, severity review
(bukan severity keamanan), saran, dan perlu keputusan siapa.
Bedakan pemeriksaan file otomatis dengan review visual yang belum dilakukan.

Setelah saya menyetujui daftar temuan, baru simpan output/review-report.md dan
draft issue lokal output/issues/DEMO-101.md s.d. DEMO-103.md.
Jika tidak ada defect teramati, tandai sebagai improvement usulan, bukan bug
yang sudah terbukti. PIC dan due date TBD.
Jangan menjalankan gh issue create, membuat PR, atau mengirim pesan.
