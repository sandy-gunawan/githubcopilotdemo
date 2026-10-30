Saya menyetujui outline yang baru kita review. Jika belum ada outline dalam
percakapan ini, berhenti dan minta saya menjalankan prompt outline terlebih dulu.

Gunakan documentation-writer dan draw-io-diagram-generator dengan membaca
SKILL.md masing-masing di .github/skills.
Baca input/business-policy.md, input/meeting-notes.md, dan input/complaints.csv.

Buat output/business-process.md dengan:
- Label SINTETIS / BUKAN PRODUKSI; sumber dan versi baseline 1.0.
- Tujuan, aktor, langkah kerja, SLA, pengecualian, dan checklist penutupan.
- Diagram proses bisnis dengan swimlane/peran serta semua cabang:
  data tidak lengkap, fraud segera ke manusia, kasus biasa, aktif >= 120 menit,
  notifikasi gagal/retry manual, close setelah receipt berhasil dan audit.
- Hitung ulang baseline dari CSV. Cantumkan numerator/denominator, unit,
  timezone, dan jangan menyimpulkan root cause dari durasi saja.

Simpan diagram editable di output/diagrams/business-process.drawio.
Buat juga SVG mandiri dengan alur yang sama di
output/diagrams/business-process.svg, tanpa font atau gambar eksternal.
Dokumen memakai ![Alur proses bisnis](diagrams/business-process.png).
PNG akan dirender pada langkah terminal; jangan klaim sudah tertanam di Word
sebelum PNG ada dan file Word diperiksa.

Periksa aturan tepat 15 menit dan tepat 120 menit secara eksplisit.
Jangan ubah input, mengarang PIC/tanggal, atau menimpa output tanpa persetujuan.
