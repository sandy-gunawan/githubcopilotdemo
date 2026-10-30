Tolong ubah kronologi gangguan ini jadi laporan yang gampang dibaca tim
Operations dan pimpinan. Bahas apa yang terjadi, bukan menyalahkan orang.

Baca input/incident-chronology.md. Gunakan incident-postmortem,
draw-io-diagram-generator, dan md-to-docx di .github/skills; baca SKILL.md-nya.
Jangan pakai angka 12 keluhan dari demo lain untuk menghitung insiden ini.

Buat ringkasan, dampak, tabel kronologi, diagram timeline, penyebab berdasarkan
bukti di cerita, hal yang berjalan baik, dan tindak lanjut berikut PIC/tenggat.
Bedakan 45 menit dampak, 40 menit dari alert sampai pulih, serta 5 menit
sampai terdeteksi. Hitung 120/2.400 request = 5%; pengguna terdampak ada 18,
bukan 120. Tulis WIB dan UTC. Jangan mengarang SLA atau kerugian finansial.

Ikuti lokasi laporan dari skill: docs/postmortems/2026-10-21-portal-keluhan.md.
Simpan diagram .drawio, SVG, dan PNG di docs/postmortems/diagrams/ serta
Word di docs/postmortems/2026-10-21-portal-keluhan.docx.
Jika nama sudah ada, pilih nama laporan dan diagram baru; jangan menimpa.

Jalankan scripts/render-diagram.cjs, lalu konverter
.github/skills/md-to-docx/scripts/md-to-docx.mjs sampai Word dengan diagram jadi.
Tandai "SINTETIS / BUKAN PRODUKSI" dan beri link hasil.
Ini cuma menyusun laporan. Jangan menjalankan rollback, mengubah konfigurasi,
mengirim pesan, atau membuka insiden/issue sungguhan.
