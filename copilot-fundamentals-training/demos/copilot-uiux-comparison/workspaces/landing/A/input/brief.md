# Halaman Tabungan Target Nusa

SINTETIS / BUKAN PRODUKSI. Bank Nusa Demo dan produk Tabungan Target Nusa adalah
rekaan. Ini landing page untuk pekerja muda yang ingin memahami produk contoh
dan menghitung kebutuhan menabung, bukan aplikasi pembukaan rekening.

## Tujuan halaman

Pengunjung harus cepat mengerti: untuk siapa produk ini, apa manfaatnya,
berapa biaya contohnya, dan bagaimana menghitung setoran untuk suatu target.
CTA utama menuju kalkulator target; CTA pendamping menuju penjelasan cara kerja.
Pilih sendiri susunan dan gaya visual, tanpa foto atau font eksternal.

## Bahan

Gunakan data.js untuk nama produk, manfaat, biaya, langkah, dan FAQ.
Biaya administrasi contoh Rp5.000/bulan, setoran awal contoh Rp100.000.
Ini bukan penawaran finansial. Jangan menambah klaim bebas biaya, hadiah,
bunga/bagi hasil, jaminan keamanan, atau persetujuan regulator.

## Fitur wajib

- Hero yang menjelaskan produk contoh dan CTA yang benar-benar berpindah ke
  bagian kalkulator atau cara kerja.
- Bagian manfaat, cara kerja, dan biaya. Biaya tidak boleh disembunyikan.
- Kalkulator: target rupiah, tabungan awal, dan jangka waktu bulan.
  Rumus setoran pokok per bulan = ceil(max(0, target - tabungan_awal) / bulan).
  Target > 0, tabungan awal >= 0, bulan bilangan bulat 1..60.
  Jika input invalid, tampilkan pesan dekat kolom dan jangan tampilkan hasil
  yang terlihat sukses. Jika target sudah tercapai, setoran pokok Rp0.
  Jelaskan bahwa hasil belum termasuk biaya admin, bunga, atau bagi hasil.
  Contoh target Rp12.000.000, awal Rp0, 12 bulan = Rp1.000.000 per bulan.
- FAQ accordion: pertanyaan dari data, bisa dibuka/ditutup dengan keyboard.
- Form "Minta ringkasan contoh": nama panggilan dummy minimal 2 karakter dan
  checkbox persetujuan simulasi wajib. Tidak perlu email, telepon, rekening,
  atau data nyata. Setelah valid, beri konfirmasi bahwa ini simulasi dan
  tidak ada data dikirim atau rekening dibuka.
- Responsif di 390px/1440px, label form terlihat, fokus keyboard jelas,
  reduced motion dihormati, dan warna bukan satu-satunya penanda error.

## Keluaran

Satu output/index.html dengan semua data, style, dan script di dalamnya.
Tidak ada backend, analytics, tracking, atau permintaan jaringan.
