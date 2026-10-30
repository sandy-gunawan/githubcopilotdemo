# Demo Copilot: Mencari Barang yang Berulang dalam Daftar Belanja

Demo sederhana untuk belajar **memberi instruksi yang jelas**, **memecah tugas**,
dan **memeriksa hasil kerja Copilot**.

**Versi visual:** Buka [panduan HTML](index.html) langsung di browser.
Versi ini memuat materi panduan, navigasi samping, tombol salin prompt dan
perintah, mode demo per langkah, checklist interaktif, serta tampilan cetak/PDF.
Tidak perlu server, internet, atau paket tambahan untuk membaca HTML.
Mode demo hanya mengatur tampilan panduan; program tetap dijalankan di VS Code.
HTML adalah salinan materi saat dibuat, bukan tampilan yang otomatis mengikuti
perubahan Markdown.

- **Waktu:** sekitar 10-15 menit untuk demo langsung.
- **Alat:** VS Code, Copilot Chat, dan Python 3.11 atau lebih baru.
- **Tidak perlu:** memasang paket Python tambahan atau membangun Windows Terminal.

**Cara memakai panduan:** Saat presentasi, ikuti
[Langkah 0](#langkah-0-buka-folder-yang-benar) sampai
[Langkah 4](#langkah-4-ubah-program-sesuai-aturan-baru), lalu sampaikan
[penutup](#kalimat-penutup-untuk-peserta).
Bagian penjelasan kode dan contoh lengkap adalah bahan persiapan pembawa demo.

Untuk melihat kotak sorotan dan tabel dengan rapi di VS Code, tekan
**Ctrl+Shift+V** untuk membuka pratinjau Markdown. Warna kotak mengikuti tema dan
aplikasi pembacanya; pada pembaca yang belum mendukung kotak khusus, isinya
tetap terbaca sebagai blok kutipan.

## Apa tujuan demo ini?

> [!IMPORTANT]
> **Tujuan utama: belajar mengarahkan Copilot, bukan sekadar mendapatkan kode.**
>
> Kita memberi tugas kecil, memeriksa hasilnya, lalu menentukan langkah berikutnya
> berdasarkan bukti. Kita tidak langsung menganggap jawaban Copilot pasti benar.
>
> Setelah demo, peserta diharapkan bisa:
> 1. Menjelaskan pekerjaan dengan contoh hasil yang diinginkan.
> 2. Meminta satu perubahan kecil dan memeriksanya.
> 3. Menambahkan kebutuhan baru tanpa mengubah semua hal sekaligus.
> 4. Memakai pesan kegagalan nyata untuk memberi arahan berikutnya.

### Beberapa istilah yang akan dipakai

| Istilah | Arti sederhana |
| --- | --- |
| Prompt | Pesan berisi tugas yang kita berikan kepada Copilot |
| Fungsi | Bagian program yang menerima data, mengerjakan sesuatu, lalu memberikan hasil |
| Tes | Pemeriksaan otomatis dengan contoh dan jawaban yang sudah kita tentukan |
| Lulus | Hasil program sama dengan jawaban yang diharapkan dalam tes |
| Gagal | Hasil program berbeda dari jawaban yang diharapkan dalam tes |

Bayangkan seorang **petugas toko** membaca daftar belanja. Program adalah cara
kerjanya. Tes adalah contoh daftar belanja beserta kunci jawabannya.

## Cerita yang dipakai

Kita meminta petugas toko mencari nama barang yang ditulis lebih dari satu kali.
Barang seperti ini disebut **duplikat**, atau barang yang berulang.

Dalam contoh program, `milk` berarti susu dan `bread` berarti roti. Nama ini
tetap dipakai agar contoh, kode, dan tes tidak berbeda.

```text
Daftar belanja: ["milk", "bread", "milk"]
Hasil:         ["milk"]
```

Awalnya, petugas diminta membandingkan tulisan **persis seperti yang tertulis**.
Jadi `"Milk"` dan `"milk"` masih dianggap berbeda.

Lalu pelanggan meminta aturan baru:

> "Kalau hanya berbeda huruf besar dan kecil, anggap itu barang yang sama.
> Tetapi tulis hasilnya mengikuti nama yang muncul pertama kali."

Dengan aturan baru, `["Milk", "bread", "milk"]` menghasilkan `["Milk"]`.

**Penting:** Versi awal tidak salah. Versi awal sudah mengikuti aturan awal.
Tes baru akan gagal karena aturan baru memang belum dikerjakan.

## Mengapa tugas perlu dipecah?

**Dekomposisi** artinya memecah satu pekerjaan menjadi beberapa langkah kecil.
Setiap langkah punya hasil yang bisa diperiksa sebelum kita lanjut.

Dalam demo ini, alurnya:

**Buat program -> Periksa -> Tambahkan kebutuhan baru -> Ubah program -> Periksa lagi.**

Cara ini juga mengenalkan **GAR: Generate -> Analyze -> Repair**.
Dalam bahasa sederhana: **Buat -> Periksa -> Perbaiki**.

### Apa keuntungannya?

- **Arahan lebih jelas.** Copilot tahu apa yang harus dikerjakan sekarang.
- **Lebih mudah diperiksa.** Kita melihat satu perubahan kecil, bukan banyak hal sekaligus.
- **Lebih mudah mencari penyebab masalah.** Salah folder berbeda dengan salah hasil perhitungan.
- **Kemajuan terlihat.** Kita punya hasil tes, bukan hanya jawaban "sudah selesai".
- **Perilaku lama ikut dijaga.** Tes lama membantu memeriksa apakah perubahan baru merusak hasil sebelumnya.

Ini bukan jaminan program selalu benar atau pekerjaan selalu lebih cepat.
Kita tetap harus membaca perubahan dan memeriksa hasilnya.

> **Ibaratnya:** Beri petugas toko satu aturan, periksa jawabannya, baru tambahkan aturan lain.

## Folder dan file yang dipakai

Panduan ini memakai lokasi yang benar-benar ada di komputer latihan Anda:

```text
C:\clients\Organization\demo\fundamental\terminal\
    tools\
        copilot-prompting-demo\
            README.md
            demo1\
                duplicates.py
                test_duplicates.py
```

| File atau folder | Kegunaannya |
| --- | --- |
| [README.md](README.md) | Panduan yang sedang Anda baca; bukan program yang dijalankan |
| [demo1](demo1/) | Tempat menyimpan file latihan dan menjalankan semua perintah demo |
| [duplicates.py](demo1/duplicates.py) | Program yang mencari barang berulang |
| [test_duplicates.py](demo1/test_duplicates.py) | Tes yang memeriksa jawaban program |

Nama file, nama fungsi, dan perintah Python tidak diterjemahkan. Nama tersebut
harus tetap sama agar program bisa dipanggil dengan benar.

### Mengapa sebelumnya file tidak ditemukan?

Sebelumnya, file dibuat di folder `demo1` yang berbeda dari folder pada terminal.
Nama foldernya sama, tetapi lokasinya tidak sama.

Untuk perintah `python -c`, Python mencari file di folder terminal yang sedang
aktif dan lokasi pencarian Python lainnya. Python tidak mencari sendiri ke
semua folder dalam proyek.

Perhatikan perbedaannya:

| Istilah | Maksudnya | Yang perlu diperhatikan |
| --- | --- | --- |
| Workspace | Folder yang dibuka di VS Code | Copilot dapat mengartikan lokasi file berdasarkan folder ini |
| Folder terminal | Lokasi yang terlihat pada baris `PS C:\...>` | Perintah dan pencarian file lokal dimulai dari sini |
| Lokasi tujuan file | Alamat lengkap tempat file harus dibuat | Sebutkan alamat ini agar Copilot tidak memilih folder yang salah |

Berpindah folder di terminal tidak otomatis mengganti folder kerja percakapan
Copilot. Karena itu, setiap prompt di bawah menyebutkan alamat folder lengkap.

Jika memakai komputer atau folder lain, ganti alamat pada perintah persiapan,
**keempat prompt**, dan perintah bantuan. Nama kedua file Python tetap sama.

## Langkah 0: Buka folder yang benar

> [!NOTE]
> **Fokus Langkah 0: pastikan kita bekerja di tempat yang sama.**
>
> Copilot harus membuat file di folder tempat Python mencarinya. Hasil langkah
> ini adalah satu folder kerja yang jelas untuk seluruh demo.

**Buka:** VS Code -> Terminal -> New Terminal. Gunakan PowerShell.

**Jalankan:**

```powershell
$demoPath = "C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1"
New-Item -ItemType Directory -Path $demoPath -Force | Out-Null
Set-Location -LiteralPath $demoPath
code --new-window $demoPath
```

Perintah ini membuat folder jika belum ada, masuk ke folder tersebut, lalu
membukanya di jendela VS Code baru. File yang sudah ada tidak dihapus.

Jika perintah `code` tidak tersedia, pilih File -> New Window, lalu
File -> Open Folder, dan buka folder `demo1` pada alamat tersebut.

Di jendela baru, buka Copilot Chat dan pilih mode **Agent** agar Copilot bisa
mengubah file. Mulai percakapan baru, lalu buka Terminal -> New Terminal.

**Periksa sebelum mulai:**

```powershell
Get-Location
python --version
```

Hasil `Get-Location` harus menunjukkan:

```text
C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1
```

Gunakan Python 3.11 atau lebih baru. Jika komputer Anda memakai `python3` atau
`py -3`, gunakan perintah itu sebagai pengganti `python` secara konsisten.
Folder `__pycache__` mungkin muncul setelah program dipakai. Itu normal.

**Untuk melanjutkan latihan yang sudah ada:** Cocokkan isi file dengan
[ringkasan alur](#ringkasan-alur-demo). Tiga tes adalah kondisi akhir Langkah 2.
Empat tes dengan program yang masih membedakan huruf besar dan kecil adalah
kondisi akhir Langkah 3. Tidak perlu membuat ulang file yang sudah sesuai.

**Untuk mengulang dari awal:** Gunakan folder kosong, misalnya `demo2` di sebelah
`demo1`. Ganti alamat pada semua prompt dan perintah. Jangan menghapus file
lain atau mengembalikan seluruh proyek hanya untuk mengulang demo.

> **Ibaratnya:** Letakkan daftar belanja dan kunci jawabannya di meja yang sama.
> Ini mencegah masalah [salah folder](#file-tidak-ditemukan).

## Ringkasan alur demo

| Langkah | Program pencari barang | File tes | Hasil yang diharapkan |
| --- | --- | --- | --- |
| 1 | Membandingkan tulisan persis sama | Belum dibuat dalam latihan baru | Contoh hasilnya sesuai |
| 2 | Tidak diubah | Tambah tiga tes | 3 tes lulus |
| 3 | Tetap tidak diubah | Tambah satu tes untuk aturan baru | 3 tes lulus, 1 tes gagal |
| 4 | Ubah agar huruf besar dan kecil dianggap sama | Tidak diubah | 4 tes lulus |

### Hubungan kode dan urutan langkah

Bagian [contoh kode lengkap](#contoh-kode-lengkap-untuk-persiapan) memakai label
A, B, C, dan D. Itu bukan empat program yang dijalankan terpisah:

1. **Langkah 1 menghasilkan A:** fungsi yang mengerjakan pencarian.
2. **Langkah 2 menghasilkan B:** tiga tes yang memanggil fungsi dari A.
3. **Langkah 3 menambahkan C ke B:** satu tes baru, sementara A tetap sama.
4. **Langkah 4 mengganti A dengan D:** fungsi diperbarui, lalu diperiksa dengan
   tes B dan C yang sama.

**Alurnya: A -> diperiksa oleh B -> ditambah pemeriksaan C -> A diganti D.**

Saat berpindah langkah, kita memakai hasil langkah sebelumnya. Kita tidak
memulai tugas yang tidak berhubungan. Perbedaan pesan tugasnya dijelaskan pada
[perbandingan Langkah 3 dan 4](#apa-yang-berbeda-pada-prompt-langkah-3-dan-4).

## Langkah 1: Buat program awal

> [!NOTE]
> **Fokus Langkah 1: membuat cara kerja awal.**
>
> Buat hanya [duplicates.py](demo1/duplicates.py). Program masih membandingkan
> tulisan persis sama. Fungsi ini akan dipakai oleh tes pada Langkah 2.

**Sampaikan kepada peserta:**

> "Saya akan memberi Copilot satu tugas kecil, contoh hasil, dan batasan yang jelas."

**Salin ke Copilot Chat:**

```text
Kerjakan Langkah 1 saja. Gunakan hanya folder berikut:
C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1

Buat duplicates.py tepat di folder tersebut, bukan di folder utama proyek
atau folder lain yang juga bernama demo1.

Buat fungsi find_duplicates(items: list[str]) -> list[str].

Aturannya:
- Bandingkan tulisan persis sama. "Milk" dan "milk" dianggap berbeda.
- Kembalikan daftar nama barang yang berulang; setiap nama hanya satu kali.
- Urutan hasil mengikuti saat barang pertama kali berulang.
- Contoh: ["milk", "bread", "bread", "milk", "milk"] menghasilkan ["bread", "milk"].
- Daftar kosong atau daftar tanpa barang berulang menghasilkan [].
- Gunakan fitur bawaan Python saja.

Jangan tambahkan tes atau fitur untuk menerima argumen terminal.
Jangan samakan huruf besar dan kecil, dan jangan hapus spasi.
Buat file tersebut, lalu jelaskan cara kerjanya secara singkat.
```

Lihat file yang dibuat Copilot bersama peserta.

### Periksa hasil awal di terminal

```powershell
python -c "from duplicates import find_duplicates; print(find_duplicates(['milk', 'bread', 'milk']))"
python -c "from duplicates import find_duplicates; print(find_duplicates(['Milk', 'milk']))"
```

Hasil kedua perintah tersebut, sesuai urutannya:

```text
['milk']
[]
```

`[]` berarti tidak ada barang yang dianggap berulang. Pada aturan awal,
`"Milk"` dan `"milk"` memang berbeda.

Jika perintah kedua sudah menghasilkan `["Milk"]`, jangan lanjut seolah-olah
hasilnya `[]`. Periksa [mengapa tes baru sudah lulus](#tes-baru-langsung-lulus).

**Yang dipelajari:** Prompt menyebutkan tujuan, contoh jawaban, batasan, dan
file yang boleh dibuat. Jadi Copilot tidak perlu menebak.

> **Ibaratnya:** Petugas toko mengikuti tulisan persis seperti yang ada di daftar.

## Langkah 2: Buat tiga pemeriksaan otomatis

> [!NOTE]
> **Fokus Langkah 2: memeriksa aturan yang sudah dibuat.**
>
> Buat hanya [test_duplicates.py](demo1/test_duplicates.py), tanpa mengubah
> program. Tiga tes memanggil fungsi dari Langkah 1 dan harus lulus sebelum
> kita menambahkan kebutuhan baru.

**Sampaikan kepada peserta:**

> "Kode sudah dibuat, tetapi kita tetap perlu memeriksa apakah hasilnya sesuai."

**Salin ke Copilot Chat:**

```text
Kerjakan Langkah 2 saja. Gunakan hanya folder berikut:
C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1

Buat test_duplicates.py tepat di folder tersebut.
Gunakan unittest bawaan Python.
Impor find_duplicates dari duplicates.

Buat kelas unittest.TestCase bernama DuplicateTests dengan tepat tiga tes:
1. test_reports_duplicates_once_in_repeat_order:
   ["milk", "bread", "bread", "milk", "milk"] menghasilkan ["bread", "milk"].
2. test_returns_empty_for_unique_items:
   ["milk", "bread"] menghasilkan [].
3. test_returns_empty_for_empty_input:
   [] menghasilkan [].

Gunakan self.assertEqual biasa agar jawaban benar-benar diperiksa.
Jangan gunakan mock, skip, expectedFailure, atau xfail.
Jangan ubah duplicates.py atau pasang paket tambahan.
Buat file tes saja. Saya akan menjalankan tesnya sendiri di terminal.
```

**Jalankan di terminal:**

```powershell
python -m unittest -v test_duplicates
```

**Hasil yang diharapkan:**

```text
Ran 3 tests ...
OK
```

Tulisan `OK` berarti ketiga tes lulus. Waktu pengerjaan dan baris rincian tiap
tes bisa berbeda.

**Apa yang diperiksa?**

| Tes | Yang ingin dipastikan |
| --- | --- |
| `test_reports_duplicates_once_in_repeat_order` | Urutan benar dan nama yang sama tidak ditambahkan berkali-kali |
| `test_returns_empty_for_unique_items` | Barang yang tidak berulang tidak ikut dilaporkan |
| `test_returns_empty_for_empty_input` | Daftar kosong menghasilkan daftar kosong |

Jika ada tes gagal, cari penyebabnya dulu. Jangan lanjut ke Langkah 3 sebelum
tiga tes ini lulus. Lihat [bantuan pemeriksaan](#tes-tidak-berjalan).

> **Ibaratnya:** Beri petugas tiga daftar belanja dan cocokkan jawabannya dengan kunci jawaban.

## Langkah 3: Tambahkan aturan baru melalui tes

> [!NOTE]
> **Fokus Langkah 3: tentukan hasil baru yang diinginkan, bukan memperbaiki program dulu.**
>
> Tambahkan satu tes ke [test_duplicates.py](demo1/test_duplicates.py).
> [duplicates.py](demo1/duplicates.py) tetap memakai aturan lama.
> Hasil yang diharapkan: tiga tes lama lulus, satu tes baru gagal.
> Pesan kegagalan itulah bahan untuk Langkah 4.

**Sampaikan kepada peserta:**

> "Versi pertama sudah berjalan. Sekarang pelanggan ingin Milk dan milk dianggap
> sama. Kita tulis dulu contoh hasil yang diinginkan, tanpa mengubah programnya."

**Salin ke Copilot Chat:**

```text
Kerjakan Langkah 3 saja. Gunakan hanya folder berikut:
C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1

Ubah hanya test_duplicates.py di folder tersebut.
Ada aturan baru: perbedaan huruf besar dan kecil tidak membedakan barang.
Hasilnya tetap memakai penulisan nama yang muncul pertama kali.

Tambahkan tepat satu tes biasa ke kelas DuplicateTests yang sudah ada:
- Nama: test_ignores_case_and_preserves_first_spelling
- Masukan: ["Milk", "bread", "milk"]
- Hasil yang diharapkan: ["Milk"]

Jangan ubah duplicates.py atau ketiga tes lama.
Jangan gunakan mock, skip, expectedFailure, atau xfail.
Ubah file tes saja. Saya akan menjalankannya sendiri di terminal.
```

**Jalankan di terminal:**

```powershell
python -m unittest -v test_duplicates
```

**Hasil yang diharapkan:** Empat tes berjalan. Tiga tes lama lulus, tetapi tes
baru gagal karena program masih memakai aturan lama.

```text
AssertionError: Lists differ: [] != ['Milk']
...
Ran 4 tests ...
FAILED (failures=1)
```

Pesan tersebut berarti program memberikan `[]`, padahal tes baru mengharapkan
`["Milk"]`. Ini perbedaan jawaban yang nyata, bukan masalah lokasi file.

**Salin pesan kegagalan yang benar-benar muncul** untuk prompt berikutnya.
Pesan dari Python tetap ditampilkan dalam bahasa aslinya agar mudah dicocokkan.

**Penghubung ke langkah berikutnya:** Langkah 3 sudah menetapkan jawaban yang
benar, yaitu `["Milk"]`. Pada Langkah 4, jawaban itu tetap sama; yang diubah
adalah cara program menghasilkan jawaban tersebut.

> **Ibaratnya:** Kunci jawaban sudah memakai aturan baru, tetapi petugas masih
> mengikuti aturan lama. Jangan memakai [penanda gagal buatan](#jangan-membuat-kegagalan-palsu).

## Langkah 4: Ubah program sesuai aturan baru

> [!NOTE]
> **Fokus Langkah 4: ubah cara kerja program agar memenuhi tes yang sama.**
>
> Ubah hanya [duplicates.py](demo1/duplicates.py). Keempat tes tidak diubah.
> Gunakan pesan gagal dari Langkah 3 untuk mengarahkan perubahan.
> Hasil yang diharapkan: semua empat tes lulus.

### Apa yang berbeda pada prompt Langkah 3 dan 4?

Yang kita ubah dalam demo ini adalah **prompt pengguna**, yaitu pesan tugas
yang Anda ketik di Copilot Chat, **bukan system prompt**. Perbedaannya bukan
sekadar mengganti nomor langkah:

| Bagian pesan | Langkah 3 | Langkah 4 |
| --- | --- | --- |
| Pekerjaan utama | Tambah contoh pemeriksaan untuk aturan baru | Ubah program agar memenuhi pemeriksaan itu |
| File yang boleh berubah | [test_duplicates.py](demo1/test_duplicates.py) | [duplicates.py](demo1/duplicates.py) |
| Batasan penting | Jangan ubah program atau tiga tes lama | Jangan ubah keempat tes |
| Bahan yang diberikan | Contoh masukan dan jawaban baru yang diinginkan | Aturan yang sama, ditambah pesan gagal nyata dari Langkah 3 |
| Hasil yang diharapkan | 3 tes lulus, 1 tes gagal | 4 tes lulus |

**Yang tetap sama:** Masukan `["Milk", "bread", "milk"]` harus menghasilkan
`["Milk"]`. Pada Langkah 3, program belum bisa memberikannya. Pada Langkah 4,
Copilot diminta menyesuaikan program tanpa mengubah target hasilnya.

> **Ibaratnya:** Langkah 3 memperbarui kunci jawaban. Langkah 4 memperbarui cara
> kerja petugas agar sesuai dengan kunci jawaban itu.

**Salin ke Copilot Chat. Ganti bagian TEMPEL dengan pesan dari terminal Anda:**

```text
Kerjakan Langkah 4 saja. Gunakan hanya folder berikut:
C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1

Ubah hanya duplicates.py di folder tersebut untuk memenuhi aturan baru.

Berikut pesan kegagalan tes yang benar-benar muncul:

<TEMPEL PESAN KEGAGALAN DARI TERMINAL DI SINI>

Aturannya:
- Gunakan str.casefold() agar perbedaan huruf besar dan kecil tidak membedakan barang.
- Hasil tetap memakai penulisan nama yang muncul pertama kali.
- Kembalikan daftar nama barang yang berulang; setiap nama hanya satu kali.
- Urutan hasil mengikuti saat barang pertama kali berulang.
- Pertahankan find_duplicates(items: list[str]) -> list[str].
- Jangan ubah tes, pasang paket tambahan, atau tambahkan fitur lain.

Lakukan perubahan seperlunya, lalu jelaskan singkat penyebab tes sebelumnya gagal.
```

**Jalankan lagi di terminal:**

```powershell
python -m unittest -v test_duplicates
```

**Hasil yang diharapkan:**

```text
Ran 4 tests ...
OK
```

**Tunjukkan juga hasilnya secara langsung:**

```powershell
python -c "from duplicates import find_duplicates; print(find_duplicates(['Milk', 'bread', 'milk']))"
```

Hasilnya:

```text
['Milk']
```

Periksa perubahan Copilot. Pastikan yang diubah adalah program, bukan keempat
tesnya. Lihat [bantuan bila tes ikut diubah](#tes-diubah-agar-lulus).

Empat tes lulus berarti empat contoh tersebut sudah sesuai. Itu bukan jaminan
bahwa semua kemungkinan masukan pasti benar.

> **Ibaratnya:** Ubah cara kerja petugas, lalu gunakan kunci jawaban yang sama
> untuk memeriksa hasilnya lagi.

## Penjelasan kode dengan bahasa sederhana

### Bedanya file program dan file tes

- [duplicates.py](demo1/duplicates.py) **mengerjakan pencarian**.
- [test_duplicates.py](demo1/test_duplicates.py) **memeriksa hasil pencarian**.
- `from duplicates import find_duplicates` mengambil fungsi dari file program
  agar bisa dipakai oleh tes.
- `self.assertEqual(hasil, jawaban)` membandingkan hasil nyata dengan jawaban
  yang diharapkan. Jika berbeda, tes dinyatakan gagal.

Tulisan `list[str]` berarti daftar berisi teks. Tanda `-> list[str]` berarti
hasil yang diharapkan juga berupa daftar teks. Penanda ini menjelaskan jenis
data; Python tidak otomatis memeriksa semua masukan hanya karena penanda itu ada.

### Cara kerja versi awal

Program membaca barang satu per satu dan menyimpan tiga catatan:

| Nama dalam kode | Yang disimpan | Gunanya |
| --- | --- | --- |
| `seen` | Nama yang sudah pernah dibaca | Mengetahui apakah barang muncul lagi |
| `reported` | Nama yang sudah masuk ke hasil | Mencegah nama yang sama ditambahkan berkali-kali |
| `duplicates` | Daftar hasil yang urut | Menyimpan jawaban yang akan diberikan |

`seen` dan `reported` memakai **set**, yaitu kumpulan yang tidak menyimpan nilai
sama berkali-kali. Urutan jawaban tidak diambil dari set. Program menambahkan
hasil ke daftar saat menemukan pengulangan.

Contoh langkah demi langkah:

| Urutan baca | Barang | Tindakan | Hasil sementara |
| --- | --- | --- | --- |
| 1 | `"milk"` | Baru pertama kali; ingat namanya | `[]` |
| 2 | `"bread"` | Baru pertama kali; ingat namanya | `[]` |
| 3 | `"bread"` | Sudah pernah dibaca; masukkan ke hasil | `["bread"]` |
| 4 | `"milk"` | Sudah pernah dibaca; masukkan ke hasil | `["bread", "milk"]` |
| 5 | `"milk"` | Sudah ada di hasil; jangan tambahkan lagi | `["bread", "milk"]` |

Mengapa bread lebih dulu? Karena **bread berulang lebih dulu**, walaupun milk
muncul paling awal. Yang kita urutkan adalah saat pertama kali berulang,
bukan saat pertama kali muncul.

> **Ibaratnya:** Petugas punya catatan barang yang pernah dibaca dan catatan
> terpisah untuk barang yang sudah dilaporkan.

### Apa yang berbeda pada versi akhir?

Versi akhir memakai `casefold()` untuk membuat teks pembanding yang tidak
membedakan huruf besar dan kecil. Teks asli tetap disimpan.

Contohnya, `"Milk"` dan `"milk"` sama-sama memakai pembanding `"milk"`.
Namun, karena nama pertama adalah `"Milk"`, hasilnya tetap `"Milk"`.

| Bagian | Versi awal | Versi akhir |
| --- | --- | --- |
| Cara membandingkan | Pakai teks persis seperti yang dibaca | Pakai hasil `casefold()` |
| Catatan nama | `seen` menyimpan nama yang pernah dibaca | `first_seen` menyimpan pembanding beserta penulisan pertamanya |
| Pencegah hasil berulang | `reported` menyimpan nama persis | `reported` menyimpan pembanding |
| Nama yang masuk hasil | Nama yang sedang berulang | Nama asli yang muncul pertama kali |

`first_seen` memakai **dictionary**, yaitu catatan pasangan. Misalnya,
`first_seen["milk"] = "Milk"` berarti "untuk pembanding milk, penulisan
pertamanya adalah Milk".

Kedua versi tidak menghapus spasi. Karena itu `" milk"` dan `"milk"` tetap
dianggap berbeda. Daftar kosong juga tetap menghasilkan `[]`.

> **Ibaratnya:** Petugas menyamakan cara membandingkan nama, tetapi tetap
> menyalin penulisan pertama dari daftar pelanggan.

### Arti perintah di terminal

| Perintah | Kegunaannya |
| --- | --- |
| `python -c "..."` | Menjalankan kode singkat di dalam tanda kutip, misalnya untuk melihat satu jawaban |
| `python -m unittest -v test_duplicates` | Menjalankan semua tes dalam file tes dan menampilkan hasil masing-masing |
| `python duplicates.py` | Hanya membaca definisi fungsi; tidak menampilkan hasil karena belum ada perintah memanggil dan mencetak jawabannya |

Bagian `if __name__ == "__main__":` pada file tes memungkinkan kita memakai
`python test_duplicates.py` secara langsung. Namun, pada demo ini cukup gunakan
perintah `python -m unittest -v test_duplicates` agar caranya konsisten.

## Kalimat penutup untuk peserta

> [!IMPORTANT]
> **Pesan utama yang perlu dibawa pulang**
>
> **Pecah tugas -> Periksa hasil -> Lanjut berdasarkan bukti.**
>
> "Kita tidak harus menyelesaikan semua hal dalam satu prompt. Kita beri tugas
> kecil, periksa hasilnya, lalu lanjut berdasarkan bukti. Copilot membantu
> menulis kode, tetapi kita tetap bertanggung jawab memeriksa hasilnya."
>
> | Yang dipelajari | Contoh dalam demo |
> | --- | --- |
> | Instruksi jelas | Ada nama fungsi, contoh masukan, dan jawaban yang diharapkan |
> | Memecah tugas | Program, tes, aturan baru, dan perubahan program dibuat pada langkah terpisah |
> | Memakai bukti | Pesan kegagalan nyata dipakai untuk memberi arahan berikutnya |
> | Membatasi perubahan | Hanya file yang disebutkan boleh diubah |
> | Memeriksa ulang | Tes lama dan tes baru dijalankan bersama |

## Contoh kode lengkap untuk persiapan

Jawaban Copilot bisa berbeda antarpercakapan. Gunakan contoh di bawah untuk
berlatih sebelum presentasi. **Jangan memasukkan versi akhir sebelum Langkah 4.**

Jika memakai kode yang sudah disiapkan, sampaikan dengan jujur:

> "Saya memakai contoh awal yang sudah disiapkan agar kita bisa fokus pada cara
> memberi instruksi dan memeriksa hasilnya."

### Contoh A: versi awal [duplicates.py](demo1/duplicates.py)

**Dipakai pada Langkah 1.** Inilah fungsi yang kemudian diperiksa oleh Contoh B.

```python
def find_duplicates(items: list[str]) -> list[str]:
    seen: set[str] = set()
    reported: set[str] = set()
    duplicates: list[str] = []

    for item in items:
        if item in seen and item not in reported:
            duplicates.append(item)
            reported.add(item)
        seen.add(item)

    return duplicates
```

### Contoh B: tiga tes awal di [test_duplicates.py](demo1/test_duplicates.py)

**Dipakai pada Langkah 2.** Baris `from duplicates import find_duplicates`
menghubungkan file tes ini dengan fungsi pada Contoh A.

```python
import unittest

from duplicates import find_duplicates


class DuplicateTests(unittest.TestCase):
    def test_reports_duplicates_once_in_repeat_order(self):
        self.assertEqual(
            find_duplicates(["milk", "bread", "bread", "milk", "milk"]),
            ["bread", "milk"],
        )

    def test_returns_empty_for_unique_items(self):
        self.assertEqual(find_duplicates(["milk", "bread"]), [])

    def test_returns_empty_for_empty_input(self):
        self.assertEqual(find_duplicates([]), [])


if __name__ == "__main__":
    unittest.main()
```

Dengan Contoh A dan B, perintah `python -m unittest -v test_duplicates`
menghasilkan tiga tes lulus.

### Contoh C: tambahan satu tes untuk aturan baru

**Ditambahkan pada Langkah 3.** Ini bukan file baru dan bukan pengganti fungsi.
Tambahkan bagian ini **di dalam** kelas `DuplicateTests` pada Contoh B, setelah
tes lama dan sebelum blok `if __name__ == "__main__":`.
Perhatikan jarak menjorok di awal baris.

```python
    def test_ignores_case_and_preserves_first_spelling(self):
        self.assertEqual(
            find_duplicates(["Milk", "bread", "milk"]),
            ["Milk"],
        )
```

Dengan Contoh A dan keempat tes, tiga tes lama lulus dan tes baru gagal.

### Contoh D: versi akhir [duplicates.py](demo1/duplicates.py)

**Dipakai pada Langkah 4 untuk mengganti Contoh A di file yang sama.**
Contoh B beserta tambahan C tetap dipakai tanpa perubahan.

```python
def find_duplicates(items: list[str]) -> list[str]:
    first_seen: dict[str, str] = {}
    reported: set[str] = set()
    duplicates: list[str] = []
    for item in items:
        key = item.casefold()
        if key not in first_seen:
            first_seen[key] = item
        elif key not in reported:
            duplicates.append(first_seen[key])
            reported.add(key)
    return duplicates
```

Dengan Contoh D dan keempat tes, semua tes lulus. File tes tidak perlu diubah
lagi setelah Langkah 3.

## Bantuan jika demo tidak sesuai

### File tidak ditemukan

Pesan `ModuleNotFoundError: No module named 'duplicates'` biasanya berarti
file program tidak ada di folder pencarian Python atau namanya tidak sesuai.

Ulangi [Langkah 0](#langkah-0-buka-folder-yang-benar), lalu jalankan:

```powershell
Set-Location -LiteralPath "C:\clients\Organization\demo\fundamental\terminal\tools\copilot-prompting-demo\demo1"
Get-Location
Get-ChildItem -Name
python -c "import duplicates; print(duplicates.__file__)"
```

Perintah terakhir harus menunjukkan alamat file program di folder `demo1`
yang benar. Jangan mengubah tes untuk mengatasi kesalahan lokasi.

> **Ibaratnya:** Petugas tidak bisa membaca daftar yang ditinggal di meja lain.

### Tes tidak berjalan

Jika `python` tidak dikenali, gunakan perintah Python yang sudah berhasil pada
[Langkah 0](#langkah-0-buka-folder-yang-benar).

Jika muncul `Ran 0 tests`, periksa nama fungsi tes: harus dimulai dengan `test_`
dan berada dalam kelas `unittest.TestCase`, seperti pada
[Langkah 2](#langkah-2-buat-tiga-pemeriksaan-otomatis).

Kesalahan penulisan kode atau file yang tidak ditemukan bukan kegagalan yang
ingin kita tunjukkan pada Langkah 3.

> **Ibaratnya:** Kunci jawaban yang belum bisa dibaca berbeda dengan jawaban petugas yang salah.

### Tes baru langsung lulus

Mungkin program sudah menyamakan huruf besar dan kecil, atau ikut diubah saat
tes baru ditambahkan. Periksa kembali
[Langkah 1](#langkah-1-buat-program-awal) dan Contoh A.

Jangan menyisipkan kesalahan agar demo terlihat gagal. Untuk mengulang, gunakan
contoh awal yang dijelaskan secara terbuka di folder latihan baru.

> **Ibaratnya:** Jika petugas sudah mengikuti aturan baru, tidak ada aturan yang perlu diperbaiki.

### Jangan membuat kegagalan palsu

`@unittest.expectedFailure` hanya memberi label bahwa tes diharapkan gagal.
Penanda itu tidak membuat jawaban program menjadi salah. Jika tes justru
lulus, muncul `UNEXPECTED SUCCESS`.

Pada [Langkah 3](#langkah-3-tambahkan-aturan-baru-melalui-tes), gunakan tes biasa.
Jangan melewati tes, mengganti hasil dengan hasil buatan, atau memberi label
harus gagal. Inilah alasan prompt melarang `skip`, `mock`, `expectedFailure`,
dan `xfail`.

> **Ibaratnya:** Menempelkan label "harus salah" bukan bukti bahwa jawaban petugas salah.

### Tes diubah agar lulus

Jika jawaban yang diharapkan diubah menjadi `[]`, aturan baru justru dihapus,
bukan dikerjakan. Pada [Langkah 4](#langkah-4-ubah-program-sesuai-aturan-baru),
pertahankan keempat tes dan ubah programnya saja.

Jika hasilnya `["milk"]`, bukan `["Milk"]`, program belum menjaga penulisan
pertama. Lihat pemakaian `first_seen` pada Contoh D.

> **Ibaratnya:** Perbaiki cara kerja petugas, bukan kunci jawabannya.

## Hasil pemeriksaan panduan

Contoh kode pada panduan ini diperiksa di Windows dengan Python 3.13.14.
Pemeriksaan dilakukan pada salinan sementara, bukan dengan mengubah file
latihan Anda.

Perintah yang dipakai: `python -m unittest -v test_duplicates`.

| Contoh yang dipakai | Hasil |
| --- | --- |
| A dan B | 3 tes lulus |
| A, B, dan tambahan C | 4 tes berjalan; hanya tes baru yang gagal |
| D, B, dan tambahan C | 4 tes lulus tanpa mengubah tes |

Contoh A dan B menggambarkan akhir Langkah 2. Contoh A, B, dan tambahan C
menggambarkan akhir Langkah 3. Pemeriksaan panduan tidak mengubah file latihan
Anda ke versi akhir. Lokasi folder, tautan, dan perintah pada panduan juga
diperiksa. Hasil Copilot saat demo langsung bisa berbeda, jadi tetap baca dan
periksa perubahan yang dibuatnya.

## Daftar periksa sebelum presentasi

- [ ] Folder terminal dan lokasi file sudah sama.
- [ ] Python dan Copilot sudah bisa dipakai.
- [ ] Jika latihan diulang dari awal, semua alamat sudah diganti ke folder baru.
- [ ] Versi awal masih menganggap `"Milk"` dan `"milk"` berbeda.
- [ ] Sudah mencoba alur: **3 tes lulus -> 1 dari 4 tes gagal -> 4 tes lulus**.
- [ ] Kegagalan Langkah 3 adalah perbedaan jawaban, bukan file tidak ditemukan.
- [ ] Contoh kode persiapan sudah tersedia, tetapi versi akhir belum dipasang terlalu awal.
- [ ] Anda sudah membaca program dan tesnya sendiri.
