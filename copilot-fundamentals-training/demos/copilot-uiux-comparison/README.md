# UI/UX Skill Lab - A/B prompt sama, C lebih terarah

Buka [index.html](index.html) langsung di Edge/Chrome. HTML berisi seluruh
style, script, prompt, dan bahan; tidak perlu server atau npm untuk membacanya.
Ada dua use case perbankan rekaan, masing-masing dengan opsi A/B/C:

1. Dashboard antrean keluhan: A tanpa skill, B dengan **UI UX Pro Max**,
   C dengan upstream yang sama + **Nusa Operations Design**.
2. Landing page Tabungan Target Nusa: A tanpa skill, B dengan **Frontend Design**,
   C dengan upstream yang sama + **Nusa Landing Design**.

**A/B memakai prompt dasar identik.** Kedua workspace C memakai prompt desain
khusus dari `workspaces\dashboard\C\prompt.md` dan `workspaces\landing\C\prompt.md`.
Di dalam masing-masing use case, brief, data, instruksi bersama, dan setting
workspace tetap byte-identik. A tidak membawa skill, B membawa upstream,
dan C membawa upstream yang tidak diubah beserta workflow pendamping.
C adalah skenario **skill + prompt terarah**, bukan uji efek skill saja.

## Cara demo singkat

Jika folder demo sudah ada di laptop, **tidak perlu download ZIP atau install ulang**.
Mulai dari dashboard saja dulu:

1. VS Code > File > Open Folder > pilih `workspaces\dashboard\A`.
2. Buka chat baru, pilih **Agent**, salin prompt dari HTML, paste, lalu Enter.
   Tunggu sampai `output\index.html` benar-benar dibuat.
3. Buka jendela baru > Open Folder > `workspaces\dashboard\B`.
   Chat baru, **Agent dan model sama**, paste prompt yang persis sama.
4. Buka link hasil dari masing-masing chat di browser. Bandingkan dua tab.
   Itu sudah cukup; preview dan pemberian skor di HTML hanya fitur opsional.

Prompt dijalankan di **Copilot Chat**, bukan dari HTML panduan.
Yang harus berganti adalah folder project lewat Open Folder, bukan hanya
membuka file prompt dari A/B. Untuk B, cek skill benar-benar dimuat pada
aktivitas agent. Jangan memberi hasil A kepada B atau menambah prompt khusus B.

Landing page memakai pasangan `workspaces\landing\A` dan `B`, dengan cara sama.

## Lanjutkan ke C: skill yang lebih terarah

C tersedia untuk **kedua** use case. Mulai A/B dahulu, lalu:

1. Buka jendela VS Code baru dan Open Folder ke `workspaces\dashboard\C`
   atau `workspaces\landing\C`, sesuai use case yang sedang dibandingkan.
2. Buat chat Agent baru dengan model, tools, dan izin yang sama.
3. Pilih use case yang sesuai di HTML, klik **Salin prompt untuk C**, lalu paste
   ke chat dan Enter. Tidak perlu membuka file prompt secara manual.
   Tombol C menyalin prompt C untuk use case terpilih, bukan selalu prompt A/B.
   Jangan menambahkan referensi hasil A/B.
4. Cek aktivitas bahwa skill upstream **dan** workflow pendamping C dibaca.
   C seharusnya merencanakan, membangun, mengkritik, dan memeriksa hasil.
5. Buka hasil C. Di panduan HTML, aktifkan **Sertakan C** jika ingin memakai
   preview tiga hasil, penilaian C, dan ekspor catatan.

| Use case C | Arah desain | Yang perlu terlihat |
|---|---|---|
| Dashboard | Triage-first / meja kerja Operations | Eskalasi SLA dominan, antrean terbaca, filter dan detail menjaga konteks |
| Landing | Planner-first / perencanaan target | Kalkulator menjadi pusat komposisi, visual bulanan mengikuti rumus, biaya jelas |

Skill pendamping mewajibkan rencana layout/token, kritik hasil, pemeriksaan
390px/1440px bila browser tersedia, dan tabel di chat yang memetakan
**instruksi C -> keputusan desain -> elemen UI -> pemeriksaan aktual**.
Jika pencarian atau browser tidak tersedia, agent harus menyebutkan batasannya,
bukan mengaku sudah menguji. Keluaran aplikasi tetap satu `output\index.html`.

**C diharapkan lebih terarah, bukan dijamin selalu lebih bagus.** C menambahkan
pengetahuan khusus tugas dan proses review, bukan kemampuan model baru.
Nilai fungsi, aksesibilitas, dan kemudahan tugas; jangan memilih pemenang hanya
karena warna atau dekorasi. A/B yang mirip juga hasil eksperimen yang sah.
Tidak ada hasil C siap pakai atau skor pemenang yang dibuat sebelumnya.
Jangan mengubah hasil A/B demi memperbesar kontras.

## ZIP buat apa, dan cara memakainya?

[ZIP kit](uiux-comparison-kit.zip) adalah salinan paket untuk laptop lain atau
dibagikan ke peserta. Isinya panduan, enam folder A/B/C, bahan dummy, prompt,
skill upstream pada B/C, dan workflow lokal pada C. Tidak ada HTML hasil run.
ZIP bukan aplikasi atau installer.

1. Download, lalu **Extract All**. Jangan demo langsung dari dalam ZIP.
2. Buka `index.html` dari hasil ekstrak sebagai panduan.
3. Di VS Code, Open Folder ke `workspaces\dashboard\A` dalam hasil ekstrak.
4. Ikuti langkah A/B di atas. Laptop tujuan perlu Copilot dan Python untuk
   skill dashboard. Jika ada masalah, lihat bagian persiapan opsional.

Pemeriksaan `python scripts\verify_setup.py` bisa dipakai sebelum sesi untuk
mengecek file A/B; bukan langkah tambahan yang harus diulang setiap paste prompt.

Jangan membuka seluruh kit sebagai multi-root workspace karena model bisa
melihat skill B/C saat mengerjakan A. Periksa juga skill personal/plugin desain;
nonaktifkan untuk semua run atau gunakan profil bersih yang sama. Setting lokal
mencegah pewarisan customization parent repo, bukan seluruh skill personal.
Jika isolasi tidak dapat dipastikan, catat batasannya.

## Yang sudah dipasang dan sumbernya

| Workspace B | Skill | Source commit | Lisensi |
|---|---|---|---|
| dashboard/B | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 28b3b8dee8c976df4fa3e94aed4e092ad43fcb03 | MIT |
| landing/B | [Frontend Design](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) | dbd4588f9e1033efb41dad4bef2f7947c8993d44 | Apache-2.0 |

Masing-masing berada di `.github\skills\<nama>\SKILL.md` pada B dan C, dengan
isi upstream dan resource yang sama. B tetap hanya memiliki satu skill.
Workflow lokal C bersumber dari:

- [Nusa Operations Design](materials/skills/nusa-operations-design/SKILL.md).
- [Nusa Landing Design](materials/skills/nusa-landing-design/SKILL.md).

Keduanya adalah tambahan khusus lab, bukan rilis atau perubahan upstream.
Hash workflow C dicantumkan dalam ekspor penilaian agar versi bisa ditelusuri.
Hash prompt juga dicatat per kondisi. HTML menyimpan salinan prompt C langsung
dari workspace masing-masing ketika `python scripts\build_kit.py` dijalankan,
sehingga tombol salin, tampilan teks, unduhan, dan ZIP memakai versi yang sama.
Seluruh resource
pendukung dan lisensi ikut disertakan dalam ZIP. Bukan instalasi global.
Lisensi diperiksa untuk paket ini; jangan mengasumsikan semua skill di katalog
Anthropic memiliki lisensi yang sama.

UI UX Pro Max membutuhkan Python 3.10+ pada kit ini; pencarian lokal tidak
membutuhkan package Python tambahan. Upstream memakai contoh path khusus
Claude. Instruksi bersama meminta resolver menggunakan direktori SKILL.md
yang benar-benar terpasang, bukan mengasumsikan CLAUDE_PLUGIN_ROOT tersedia.
Font dan framework dari rekomendasi skill tetap harus tunduk pada brief offline.

## Persiapan ulang, jika diperlukan

```powershell
python scripts\prepare_workspaces.py
.\scripts\install-skills.ps1
python scripts\verify_setup.py --search
```

GitHub CLI 2.90+, akses internet, dan izin organisasi diperlukan untuk download
ulang. Script tidak menimpa bahan yang berbeda atau skill dari versi lain.
Jangan mengubah execution policy organisasi jika script diblokir.
Jika upstream B sudah tersedia, `prepare_workspaces.py` menyalinnya ke C
secara lokal dan memasang workflow pendamping; tidak perlu download ulang.
Installer hanya mengunduh upstream yang belum ada, kemudian menyiapkan C.
Tidak ada script setup yang menimpa hasil A/B/C.

`--search` menjalankan script pencarian upstream yang sudah direview dengan
query publik "data-dense dashboard" pada domain style dan memeriksa identitas
hasilnya. Tidak mengirim data ke jaringan.
Default verifikasi mengecek kesamaan input A/B/C, hash workflow lokal,
kesamaan seluruh resource upstream B/C, dan lisensi, bukan
pemanggilan skill, kualitas desain, atau login Copilot.
Prompt A/B harus identik; prompt C boleh berbeda dan tidak boleh kosong.
Persiapan ulang mempertahankan prompt C yang sudah ada.

Rekomendasi design-system upstream tetap perlu disaring. Saat dicoba, pencarian
umum juga menghasilkan pola promosi seperti Contact Sales yang tidak cocok
untuk alat kerja Operations. Brief harus menang atas rekomendasi umum itu;
keberhasilan script pencarian tidak berarti desain yang disarankan pasti tepat.

## Hasil dan pembandingan

Tidak ada hasil A/B/C yang dibuat-buat atau dikemas sebagai pemenang. Preview
diisi dengan file yang benar-benar dihasilkan peserta. File tetap lokal di
memori browser, tidak disimpan di localStorage atau diunggah.

JavaScript hasil awalnya dinonaktifkan di preview. Aktifkan hanya untuk file
dummy yang Anda percayai. Iframe memakai sandbox tanpa same-origin serta CSP
untuk membatasi konten eksternal; ini bukan pemeriksaan keamanan file. Semua
fitur juga dapat dicoba dengan membuka HTML hasil langsung setelah review.

Nilai/checklist/catatan tersimpan lokal jika browser mengizinkan. Ekspor JSON
hanya berisi penilaian pengguna, sumber versi, hash prompt, dan nama file;
tidak menyertakan isi HTML. C bersifat opsional: A/B tetap bisa dinilai tanpa C.
Penilaian A/B lama dipertahankan; C mulai tanpa skor.
Skor tidak otomatis membuktikan skill dipanggil atau selalu lebih baik.
Ulangi dengan urutan A/B/C yang bergantian untuk mengamati variasi.
Jika prompt C ikut diubah, beri label eksperimen berbeda: optimasi prompt +
skill, bukan perbandingan dengan prompt identik.

## Untuk fasilitator

Sesudah mengubah bahan, jangan menimpa workspace yang dipakai peserta.
Pakai kit bersih atau review perubahan input terlebih dahulu. Lalu:

```powershell
python scripts\prepare_workspaces.py
python scripts\build_kit.py
python tests\validate_kit.py
```

UI tests tambahan memerlukan Node.js 22+ dan Playwright:

```powershell
npm ci
npm run test:browser
```

Di Windows pengujian memakai Edge yang sudah terpasang; platform lain perlu
Chromium Playwright. Dependency ini hanya untuk pengujian panduan, bukan
untuk menjalankan file HTML atau menghasilkan halaman demo.

Semua nama bank, data, biaya, keluhan, dan produk adalah SINTETIS / BUKAN PRODUKSI.
Tidak ada akun, transfer uang, pemulihan insiden, pengiriman pesan, deployment,
atau klaim kepatuhan regulator.
