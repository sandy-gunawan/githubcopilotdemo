# Dashboard keluhan Bank Nusa Demo

SINTETIS / BUKAN PRODUKSI. Bank Nusa Demo dan semua kasus adalah rekaan.
Ini alat kerja petugas Operations untuk menemukan kasus yang perlu ditangani,
bukan halaman promosi. Tidak ada akses bank, uang, atau data pelanggan nyata.

## Pembaca dan tugas utama

Petugas membuka dashboard di awal shift. Ia perlu cepat melihat kasus aktif
yang sudah mencapai batas 120 menit, menyaring antrean, lalu membaca detail.
Jangan tentukan prioritas berdasarkan warna saja.

## Bahan dan perhitungan

Gunakan `window.DEMO_DATA` dalam data.js. Semua umur kasus adalah snapshot,
bukan dihitung ulang dari jam komputer. Aktif = status selain "Selesai".
Perlu eskalasi SLA = aktif DAN age_minutes >= 120. Tepat 120 sudah termasuk.

Tampilkan KPI jumlah kasus, aktif, perlu eskalasi SLA, dan selesai. Untuk data
utuh: 12 total, 9 aktif, 4 perlu eskalasi, 3 selesai.
KPI dan ringkasan jumlah per kanal harus mengikuti hasil filter yang sedang
terlihat. Jangan memodifikasi data ketika menyaringnya.

## Fitur wajib

- Tabel atau daftar kasus: ID, label pelanggan dummy, kanal, status, prioritas,
  umur dalam menit, dan penanda tekstual jika perlu eskalasi.
- Pencarian ID atau label pelanggan, tidak membedakan huruf besar/kecil.
- Filter status, prioritas, dan kanal. Pencarian dan filter digabung dengan AND.
- Tombol reset mengosongkan pencarian dan mengembalikan semua filter.
- Klik kasus membuka panel detail berisi ID, deskripsi, petugas, dan ringkasan.
  Bisa ditutup dengan tombol maupun Escape; fokus kembali ke pemicu.
- Tampilan tanpa hasil memberi alasan singkat dan cara menghapus filter.
- Responsif di lebar 390px dan 1440px. Label, focus keyboard, dan informasi
  status harus jelas. Horizontal scroll di dalam tabel boleh jika memang perlu,
  tetapi jangan membuat seluruh halaman melebar.

## Jangan dilakukan

Jangan menyembunyikan kasus yang terlambat, mengarang persentase baru, membuat
aksi transfer uang, atau menampilkan klaim "pasti aman" atau kepatuhan regulator.
Layout dan gaya visual bebas; tugas dan data di atas harus tetap sama.
