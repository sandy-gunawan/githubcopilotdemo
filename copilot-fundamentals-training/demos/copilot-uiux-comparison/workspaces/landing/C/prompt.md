# C - Skill desain dengan prompt terarah

Bertindaklah sebagai product designer UI/UX sekaligus frontend engineer.
Bangun halaman Tabungan Target Nusa yang layak dipresentasikan: punya arah
visual yang khas, membantu pekerja muda memahami produk rekaan, dan membuat
perencanaan tabungan terasa jelas melalui interaksi yang benar-benar bekerja.
Jangan sekadar membuat landing page generik yang kebetulan memenuhi checklist.

Kerjakan hanya workspace C tempat prompt ini berada. Semua path di bawah
relatif terhadap folder ini, bukan terhadap folder induk repositori.

## 1. Muat skill desain yang tepat sebelum merancang

Gunakan **frontend-design** dan **nusa-landing-design**. Baca dan terapkan:

- `.github\skills\frontend-design\SKILL.md`
- `.github\skills\nusa-landing-design\SKILL.md`

Muat keduanya melalui mekanisme skill jika tersedia. Jika mekanismenya tidak
tersedia, baca berkas lokal tersebut secara langsung dan nyatakan fallback itu
dengan jujur. Jangan menyebut pembacaan manual sebagai bukti pemanggilan skill.
Jika berkasnya tidak dapat diakses, laporkan kendalanya; jangan mengaku sudah
menggunakannya atau diam-diam mengganti dengan skill lain.

Frontend Design memandu art direction, tipografi, komposisi, dan kritik visual.
Nusa Landing Design menerjemahkannya menjadi pengalaman **planner-first** untuk
produk ini. Skill validasi bukan pengganti kedua skill desain tersebut.
Persyaratan isi, angka, dan batas teknis dalam brief tetap wajib dipertahankan.

Baca `input\brief.md` dan `input\data.js` sebagai sumber kebenaran. Jangan
mengambil referensi dari A/B, hasil run sebelumnya, internet, atau bahan di luar
workspace ini. Jangan mengubah input, skill, maupun file instruksi.

Sebelum menghasilkan halaman, periksa apakah `output\index.html` sudah ada.
Jika ada, jangan membacanya sebagai referensi, menghapus, atau menimpanya.
Hentikan generasi dan minta lokasi run baru.

## 2. Pilih konsep, bukan sekadar palet

Sebelum coding, tampilkan satu rencana ringkas di chat, bukan dokumen tambahan:

- Bandingkan dua komposisi berbeda melalui mini-wireframe ASCII. Bedakan
  struktur dan alurnya, bukan hanya warna. Pilih satu dan jelaskan alasannya.
- Tetapkan 4-6 token warna bernama, peran font sistem, skala tipografi,
  serta sistem spacing dan radius yang konsisten.
- Jelaskan hubungan hero, kalkulator, visual rencana bulanan, biaya, dan CTA.
  Setiap elemen yang dominan harus membantu pengguna memahami atau merencanakan.
- Kritik pilihanmu: bagian mana yang masih terasa seperti template AI?
  Perbaiki keputusan tersebut sebelum implementasi.

Pusat perhatian adalah **tindakan merencanakan**, bukan ilustrasi saldo atau
kartu bank dekoratif. Beranilah pada satu elemen yang bermakna; buat area lain
tenang, terbaca, dan rapi. Tipografi harus memiliki hierarki yang disengaja,
bukan hanya mengganti font atau memiringkan satu kata pada headline.

Hindari kumpulan kartu identik, label huruf kapital di setiap bagian, penomoran
manfaat yang bukan urutan, gradient dekoratif, dan animasi tanpa tujuan.
Jangan menganggap pergantian warna sebagai perubahan UX. Pilih gaya berdasarkan
pembaca dan tugasnya, bukan berdasarkan estetika bawaan yang dipakai untuk semua
landing page.

Jangan berhenti pada rencana atau menunggu persetujuan konsep. Ambil keputusan
desain sendiri dan lanjutkan sampai halaman selesai.

## 3. Jadikan kalkulator pengalaman utama

Hero harus segera menjelaskan produk rekaan ini untuk siapa dan apa gunanya.
CTA utama menuju kalkulator; CTA pendamping menuju cara kerja. Keduanya harus
benar-benar membawa pengguna ke bagian yang tepat.

Tempatkan ruang perencanaan secara menonjol di bagian awal halaman. Gunakan
satu kalkulator, bukan beberapa form dengan state yang berpotensi berbeda.
Biaya contoh harus mudah ditemukan dekat penjelasan perencanaan, bukan hanya
di footer atau FAQ.

Buat satu visual rencana yang bermakna dari data kalkulator yang sama, misalnya
lintasan berlabel dari tabungan awal menuju target. Visual ini harus:

- Menjelaskan hubungan tabungan awal, setoran pokok, waktu, dan target.
- Menggunakan hasil hitung yang sebenarnya, bukan grafik dekoratif.
- Menyediakan nilai penting dalam teks, bukan bergantung pada warna atau gambar.
- Tetap terbaca untuk 1 maupun 60 bulan; ringkas milestone, jangan memaksa
  60 label kecil dalam satu baris.
- Konsisten dengan pembulatan ke atas. Jika akumulasi setoran melebihi target
  karena pembulatan, jelaskan selisihnya; jangan mengubah rumus diam-diam.
- Hilang atau berubah menjadi state koreksi ketika input tidak valid.
  Jangan meninggalkan angka atau visual sukses dari perhitungan lama.

Pertahankan bagian manfaat, cara kerja, biaya, seluruh FAQ, dan form
"Minta ringkasan contoh" dari bahan. Gunakan bahasa Indonesia yang lugas dan
hangat, sentence case, serta label tombol yang menyebut tindakan sebenarnya.
Keunikan desain tidak boleh mengorbankan kelengkapan informasi atau aksesibilitas.

## 4. Implementasikan dengan batas yang tegas

Hasil akhir hanya `output\index.html`, berisi seluruh HTML, CSS, JavaScript,
dan data dummy. Harus bisa dibuka langsung melalui file lokal, tanpa server,
internet, framework, instalasi package, font CDN, atau aset eksternal.
Visual boleh dibuat dengan HTML/CSS atau SVG inline buatan sendiri.
Tidak ada backend, analytics, tracking, pengiriman form, atau penyimpanan isian.

Pertahankan angka dan semantik fixture:

- Biaya admin contoh Rp5.000 per bulan; setoran awal produk contoh Rp100.000.
  Jangan otomatis menyamakan setoran awal produk dengan isian tabungan awal.
- Setoran pokok per bulan = `ceil(max(0, target - tabungan_awal) / bulan)`.
- Target > 0, tabungan awal >= 0, bulan bilangan bulat 1..60.
- Input invalid mendapat pesan spesifik dekat kolom, penanda selain warna,
  dan tidak menghasilkan tampilan yang terlihat sukses.
- Jika tabungan awal >= target, setoran pokok Rp0 disertai penjelasan.
- Hasil belum termasuk biaya admin, bunga, atau bagi hasil.
- Nama panggilan dummy minimal 2 karakter setelah spasi tepi dibuang.
  Persetujuan simulasi wajib; tidak meminta data pelanggan atau data nyata.
- Konfirmasi valid harus menyatakan simulasi, tidak ada data dikirim,
  dan tidak ada rekening dibuka.

Jangan menambah klaim bebas biaya, hadiah, keuntungan, jaminan keamanan,
persetujuan regulator, atau manfaat finansial yang tidak ada di bahan.

## 5. Kritik tampilan nyata, lalu sempurnakan

Jangan menganggap implementasi pertama sebagai hasil final. Bila browser tool
tersedia, buka file lokal dan tinjau screenshot pada lebar **1440px dan 390px**.
Periksa komposisi awal, hierarki, panjang baris, keterbacaan nominal, spacing,
biaya, form, serta kondisi hasil dan error. Cari masalah konkret dan lakukan
perbaikan terarah, lalu periksa lagi bagian yang berubah.

Jangan mengubah dekorasi sekadar agar bisa mengaku melakukan iterasi. Jika
tidak ada revisi yang beralasan, nyatakan hasil kritik secara spesifik.
Jika browser tidak tersedia, jelaskan pemeriksaan visual yang belum dilakukan;
jangan membuat screenshot, skor, atau hasil pengujian fiktif.

Uji alur berikut, bukan hanya membaca implementasinya:

- Target Rp12.000.000, awal Rp0, 12 bulan -> Rp1.000.000 per bulan.
- Target Rp100, awal Rp0, 3 bulan -> Rp34 per bulan.
- Bulan 1 dan 60 bekerja; 0, 1,5, lebih dari 60, serta kolom kosong ditolak.
- Target nol/negatif dan tabungan awal negatif ditolak dengan pesan dekat kolom.
- Tabungan awal sama dengan atau melebihi target -> Rp0.
- Mengedit input setelah hasil valid tidak menyisakan rencana sukses yang usang.
- CTA berfungsi, FAQ bisa dibuka/ditutup dengan keyboard, urutan fokus masuk
  akal, dan seluruh kontrol punya fokus yang terlihat.
- Nama dummy terlalu pendek dan persetujuan kosong ditolak. Isian valid
  menampilkan konfirmasi lokal tanpa navigasi atau pengiriman data.
- Tidak ada scroll horizontal pada kedua lebar. Label tidak hilang, tombol
  nyaman disentuh, informasi biaya terbaca, dan reduced motion dihormati.

Jaga pengujian tetap sesuai halaman statis ini. Jangan menambah toolchain,
workflow modernisasi, atau instalasi hanya untuk memvalidasi satu file HTML.

## 6. Tunjukkan pengaruh skill secara konkret

Akhiri dengan link HTML dan ringkasan singkat, bukan dump kode atau laporan
panjang. Sebutkan status pemuatan kedua skill secara faktual.

Berikan tabel ringkas, maksimal lima baris:

`Instruksi C | Keputusan desain | Selector/lokasi | Pemeriksaan | Hasil`

Cakup komposisi planner-first, tipografi, visual bulanan, keterlihatan biaya,
serta state invalid/mobile. Sebutkan revisi konkret setelah kritik dan batas
pengujian yang masih ada. Bedakan "diperiksa di kode" dari "dicoba di browser".

Ini adalah skenario **skill + prompt terarah**, bukan pembuktian efek skill
secara terisolasi. Jangan menyatakan C menang atas A/B atau mengarang bukti
keunggulan. Biarkan keputusan desain dan hasil yang bisa diperiksa berbicara.
