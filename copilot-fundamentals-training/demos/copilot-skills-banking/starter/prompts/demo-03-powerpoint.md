Tolong buatkan presentasi 8 slide untuk pimpinan Operations Bank Nusa Demo.
Bahasanya santai-profesional, satu pesan utama per slide, jangan penuh teks.
Demo ini bisa dijalankan sendiri; bahan dasarnya sudah ada di folder input.

Baca input/deck-brief.md, business-policy.md, system-landscape.md,
meeting-notes.md, dan complaints.csv. Gunakan skill banking-executive-deck
di .github/skills; baca SKILL.md dan panduan spec-nya.

Isi: tujuan, angka dari CSV, diagram proses, diagram arsitektur saat ini,
usulan perbaikan, tahapan kerja, risiko, dan keputusan yang perlu diminta.
Hitung ulang: 12 kasus, 9/12 respons awal <=15 menit (75%), dan 5/12
resolusi >120 menit. Jangan mengarang biaya, target baru, PIC, atau tanggal.

Simpan spec baru dan presentasi.pptx di output/demo-03/; jika sudah ada,
pilih folder baru. Pakai input/deck-spec.json sebagai contoh format,
bukan sekadar menyalinnya. Layout diagram yang sudah dicek boleh dipakai
dari input/diagram-layouts.json; sesuaikan path relatif diagramFile.
Pakai shape diagram asli PowerPoint, cantumkan sumber dan catatan pembicara.

Jalankan npm run deck -- --spec <path-spec-baru> --out <path-pptx-baru>
sampai PPTX benar-benar jadi. Jangan berhenti di outline atau kode.
Tandai "SINTETIS / BUKAN PRODUKSI", beri link PPTX, dan ingatkan saya
untuk membuka slide sebelum presentasi. Laporkan kendala kalau export gagal.
