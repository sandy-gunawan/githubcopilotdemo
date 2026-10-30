Tolong jelaskan arsitektur sistem keluhan Bank Nusa Demo dengan bahasa yang
mudah diikuti. Demo ini bisa dijalankan sendiri, tanpa menunggu demo lain.

Baca input/system-landscape.md, input/openapi.yaml, input/business-policy.md,
dan input/meeting-notes.md. Gunakan architecture-blueprint-generator,
draw-io-diagram-generator, dan md-to-docx di .github/skills; baca SKILL.md-nya.

Buat ringkasan dengan tiga diagram: gambaran besar (C4 Context), komponen
aplikasi dan database (C4 Container), lalu urutan penanganan keluhan (sequence).
Jelaskan fungsi komponen dan jalur notifikasi gagal. Cantumkan sumber file.
Ini sistem rekaan untuk demo, bukan hasil pemeriksaan aplikasi bank nyata.
Pisahkan sistem yang diceritakan saat ini dari usulan scheduler dan outbox.
Simulator core hanya membaca status. Yang belum diketahui tulis "belum ditentukan".

Simpan di output/demo-02/ (pakai folder baru kalau nama itu sudah ada):
- arsitektur.md dan arsitektur.docx, dengan ketiga diagram DI DALAM dokumen.
- Sumber .drawio dan SVG mandiri di diagrams/, serta PNG hasil render.

Jalankan scripts/render-diagram.cjs untuk ketiga SVG, lalu konverter
.github/skills/md-to-docx/scripts/md-to-docx.mjs. Kerjakan sampai Word jadi,
bukan hanya memberi instruksi. Cek semua gambar sudah masuk.
Tandai "SINTETIS / BUKAN PRODUKSI" dan beri link hasilnya. Jangan menambah
komponen yang tidak ada di bahan atau menganggap usulan sudah disetujui.
