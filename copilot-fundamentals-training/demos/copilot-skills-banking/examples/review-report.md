# Contoh review konsistensi

**SINTETIS / BUKAN PRODUKSI.** Ini rubrik referensi, bukan bukti bahwa output
peserta telah lulus. Isi hasil aktual setelah artefak peserta diperiksa.

| Pemeriksaan | Expected | Status peserta |
|---|---|---|
| Label sintetis | Ada di dokumen, diagram, dan slide | Belum diperiksa |
| Ack | <=15 menit; menit 15 masih tepat waktu | Belum diperiksa |
| Eskalasi baseline | Kasus aktif >=120 menit | Belum diperiksa |
| Fraud | Segera ke review manusia | Belum diperiksa |
| Gate close | Resolved + receipt sukses + audit | Belum diperiksa |
| Baseline CSV | 12 kasus; 9/12 =75%; 5/12 >120 menit | Belum diperiksa |
| As-is | Tidak ada scheduler/outbox | Belum diperiksa |
| Core simulator | Read-only GET status | Belum diperiksa |
| To-be / ADR | USULAN / Proposed | Belum diperiksa |
| Word | PNG benar-benar tertanam dan terbaca | Belum diperiksa |
| PPTX | 8 slide, diagram native, sources, notes | Belum diperiksa |
| Review visual | Word dan PowerPoint dibuka manusia | Belum diperiksa |
| Issue | Draft lokal; PIC/due date TBD | Belum diperiksa |

## Metrik referensi

Ack duration per kasus (menit): 6, 20, 5, 15, 4, 18, 10, 5, 22, 8, 7, 15.
Resolution duration: 60, 130, 80, 150, 50, 150, 90, 110, 160, 70, 90, 140.
Total 1280 menit; rata-rata 106.7 menit. Durasi bukan bukti root cause.

## Protokol temuan

Catat artefak, evidence, masalah, tingkat dampak review, saran, dan keputusan.
Jangan menyatakan bug jika yang ditemukan hanya kebutuhan desain baru.
Tidak ada publikasi ke tracker eksternal tanpa persetujuan terpisah.
