# C - Dashboard Operations dengan skill dan prompt terarah

Bertindaklah sebagai product designer UI/UX sekaligus frontend engineer.
Bangun dashboard keluhan Bank Nusa Demo yang terasa seperti alat kerja
Operations: petugas bisa segera menemukan kasus aktif yang mencapai SLA,
menyaring antrean, dan membaca detail tanpa kehilangan konteks.
Jangan sekadar membuat empat kartu KPI besar di atas tabel generik.

Kerjakan hanya workspace C tempat prompt ini berada. Semua path di bawah
relatif terhadap folder ini, bukan terhadap folder induk repositori.

## 1. Muat skill desain, bukan hanya skill pengujian

Gunakan **ui-ux-pro-max** dan **nusa-operations-design**. Baca dan terapkan:

- `.github\skills\ui-ux-pro-max\SKILL.md`
- `.github\skills\nusa-operations-design\SKILL.md`

Muat keduanya melalui mekanisme skill jika tersedia. Jika mekanismenya tidak
tersedia, baca berkas lokal tersebut secara langsung dan nyatakan fallback itu
dengan jujur. Jangan menyebut pembacaan manual sebagai bukti pemanggilan skill.
Jika berkasnya tidak dapat diakses, laporkan kendalanya; jangan mengaku sudah
menggunakannya atau menggantinya dengan skill lain secara diam-diam.

UI UX Pro Max memberi dasar keputusan desain dan interaksi. Nusa Operations
Design mengarahkannya menjadi pengalaman **triage-first** untuk antrean ini.
Brief dan fixture selalu lebih tinggi daripada rekomendasi umum skill.

Baca `input\brief.md` dan `input\data.js` sebagai sumber kebenaran. Jangan
mengambil referensi dari A/B, hasil run sebelumnya, internet, atau bahan di luar
workspace ini. Jangan mengubah input, skill, maupun file instruksi.

Sebelum menghasilkan halaman, periksa apakah `output\index.html` sudah ada.
Jika ada, jangan membacanya sebagai referensi, menghapus, atau menimpanya.
Hentikan generasi dan minta lokasi run baru.

## 2. Gunakan riset lokal untuk mengambil keputusan

Jalankan pencarian lokal dari direktori skill yang benar-benar terpasang:

```powershell
python .github\skills\ui-ux-pro-max\scripts\search.py "operations dashboard data-dense" --design-system -p "Nusa Operations Demo"
python .github\skills\ui-ux-pro-max\scripts\search.py "data-dense dashboard" --domain style --json
python .github\skills\ui-ux-pro-max\scripts\search.py "keyboard focus modal" --domain ux --json
```

Periksa domain, identitas hasil, dan kecocokannya dengan antrean Operations.
Jika hasil kosong atau melenceng, coba sekali lagi dengan query lebih spesifik.
Jangan mengarang hasil pencarian. Jika Python atau hasil terverifikasi tidak
tersedia, nyatakan batasannya dan bedakan penalaran sendiri dari hasil riset.
Jangan menginstal apa pun.

Ambil rekomendasi yang membantu kepadatan informasi, hierarki, fokus, dan
interaksi. Tolak Contact Sales, hero promosi, font eksternal, animasi berlebihan,
dan angka pemasaran. Stack sudah ditentukan: HTML/CSS/JavaScript murni.
Jangan mengikuti rekomendasi framework atau library yang melanggar brief.
Tidak perlu menyimpan dokumen riset; cukup ringkas keputusan penting di chat.

## 3. Pilih komposisi kerja sebelum coding

Tampilkan satu rencana ringkas di chat:

- Bandingkan dua komposisi melalui mini-wireframe ASCII. Bedakan susunan,
  kepadatan, serta hubungan antrean dan detail, bukan hanya warna.
- Pilih workbench triage-first. Jelaskan jalur melihat eskalasi, menyaring,
  memilih kasus, membaca detail, lalu kembali ke antrean.
- Tetapkan 4-6 token warna bernama, font sistem beserta perannya, skala
  tipografi, spacing, density, radius, dan indikator fokus.
- Sebutkan rekomendasi skill yang diterima/ditolak beserta alasan singkat.
- Kritik bagian yang masih terasa seperti template, lalu perbaiki rencananya.

Berikan hierarki terkuat kepada kasus aktif yang perlu eskalasi SLA.
KPI total, aktif, dan selesai tetap ada, tetapi jangan bersaing sebagai empat
kartu identik yang sama dominannya. Gunakan permukaan kerja terang, teks tegas,
angka tabular yang sejajar, dan peringatan tekstual "Perlu eskalasi".
Warna tidak boleh menjadi satu-satunya penanda.

Hindari headline besar yang memakan area kerja, sidebar berisi menu palsu,
ilustrasi dekoratif, dan grafik yang tidak membantu tugas. Desain harus khas
karena keputusan informasinya, bukan karena jumlah aksesorinya.

Jangan berhenti pada rencana atau menunggu persetujuan konsep. Ambil keputusan
desain sendiri dan lanjutkan sampai dashboard selesai.

## 4. Bangun satu sumber data dan state yang konsisten

Semua kasus harus tersedia saat pertama dibuka, tanpa filter awal tersembunyi.
Jika mengurutkan berdasarkan urgensi, gunakan salinan turunan; jangan mengubah
fixture. Umur kasus adalah snapshot dari data, bukan dihitung dari jam komputer.

- Aktif = status selain "Selesai".
- Perlu eskalasi SLA = aktif DAN `age_minutes >= sla_minutes`.
- Tepat 120 menit sudah termasuk; kasus selesai tetap tidak termasuk eskalasi.
- KPI dan ringkasan per kanal harus berasal dari hasil filter yang sama dengan
  antrean, termasuk saat hasilnya kosong.
- Pencarian ID atau label pelanggan tidak membedakan huruf besar/kecil.
  Gabungkan pencarian, status, prioritas, dan kanal dengan AND.
- Reset mengosongkan pencarian dan mengembalikan seluruh filter.

Tempatkan kontrol pencarian, filter berlabel, jumlah hasil, dan reset dekat
antrean. Tampilkan seluruh kolom wajib dari brief. Buat baris mudah dipindai,
dengan tindakan detail yang jelas dan bisa dijangkau keyboard.

Detail memuat ID, deskripsi, petugas, dan ringkasan. Pertahankan konteks antrean
di desktop. Di ponsel, gunakan panel atau dialog yang terbaca, bukan panel
sempit di luar layar. Tombol tutup dan Escape harus bekerja; fokus kembali ke
pemicu. Jika memilih modal, kelola fokus agar tidak berpindah ke belakangnya.

State kosong menjelaskan bahwa kombinasi pencarian/filter tidak cocok dan
menyediakan reset. Jangan mengganti kegagalan dengan angka atau pesan sukses.
Gunakan bahasa Indonesia yang lugas untuk pekerjaan Operations, bukan promosi.

## 5. Selesaikan sebagai satu halaman offline

Hasil akhir hanya `output\index.html`, berisi seluruh HTML, CSS, JavaScript,
dan data dummy. Harus bisa dibuka langsung melalui file lokal, tanpa server,
internet, framework, instalasi package, font CDN, atau aset eksternal.
Tidak ada backend, analytics, tracking, atau permintaan jaringan.

Gunakan font sistem. Ikon boleh dibuat dengan HTML/CSS atau SVG inline sendiri;
jangan mengambil aset luar. Label form terlihat, fokus keyboard jelas, tombol
nyaman disentuh, kontras terbaca, dan reduced motion dihormati.

Tandai dengan jelas bahwa ini simulasi, bukan layanan bank nyata. Jangan
mengarang persentase, manfaat finansial, data pelanggan, klaim keamanan atau
regulator, dan jangan menambahkan aksi transfer atau perubahan data bank.

## 6. Kritik tampilan nyata dan uji tugasnya

Jangan menganggap implementasi pertama sebagai hasil final. Bila browser tool
tersedia, buka file lokal dan tinjau screenshot pada lebar **1440px dan 390px**.
Periksa dominasi eskalasi, kepadatan baris, keterbacaan status, penempatan filter,
konteks detail, fokus, dan empty state. Temukan masalah konkret, perbaiki, lalu
periksa lagi bagian yang berubah.

Jangan mengubah dekorasi hanya agar bisa mengaku beriterasi. Jika tidak ada
revisi yang beralasan, nyatakan hasil kritik secara spesifik. Jika browser
tidak tersedia, laporkan bagian yang belum diuji visual tanpa membuat bukti.

Uji alur berikut, bukan hanya membaca implementasinya:

- Tanpa filter: 12 total, 9 aktif, 4 perlu eskalasi SLA, 3 selesai.
- DEMO-UI-C006 aktif tepat 120 menit termasuk eskalasi; DEMO-UI-C012 pada
  119 menit dan DEMO-UI-C011 yang selesai tidak termasuk eskalasi.
- Prioritas Tinggi menghasilkan 4 kasus aktif dan 4 perlu eskalasi, dengan
  ringkasan kanal yang sesuai daftar, bukan ringkasan seluruh fixture.
- Pencarian beda kapitalisasi bekerja dan dapat digabung dengan semua filter.
- Pencarian ID yang tidak ada menghasilkan antrean kosong serta KPI nol.
  Reset mengembalikan seluruh kasus dan angka awal.
- Detail dibuka dengan keyboard; tombol tutup dan Escape mengembalikan fokus.
  Filter dan posisi antrean tidak hilang hanya karena detail ditutup.
- Pada 390px dan 1440px, label, jumlah hasil, status, serta reset tetap terbaca.
  Jika tabel perlu scroll horizontal, batasi pada antrean; bukan seluruh halaman.

Jaga pengujian sesuai halaman statis ini. Jangan menambah toolchain, workflow
modernisasi, atau instalasi hanya untuk memvalidasi satu file HTML.

## 7. Tunjukkan pengaruh skill secara konkret

Akhiri dengan link HTML dan ringkasan singkat, bukan dump kode atau laporan
panjang. Sebutkan status pemuatan kedua skill dan pencarian lokal secara faktual.

Berikan tabel maksimal lima baris:

`Instruksi C | Keputusan desain | Selector/lokasi | Pemeriksaan | Hasil`

Cakup hierarki triage, density antrean, filter/empty state, fokus detail, dan
mobile. Sebutkan revisi konkret setelah kritik serta batas pengujian yang ada.
Bedakan "diperiksa di kode" dari "dicoba di browser".

Ini skenario **skill + prompt terarah**, bukan pembuktian efek skill secara
terisolasi. Jangan menyatakan C menang atas A/B atau mengarang skor keunggulan.
Biarkan keputusan desain dan hasil yang bisa diperiksa berbicara.
