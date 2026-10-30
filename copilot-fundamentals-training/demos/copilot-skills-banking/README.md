# Banking Skills Lab

Contoh penggunaan GitHub Copilot Skills untuk tim Operations, Business Analyst,
PMO, team lead, dan arsitek. Bahannya cerita bank rekaan, bukan sistem bank asli.

**Semua data, organisasi, kebijakan, kontrak API, issue, dan arsitektur adalah
SINTETIS. Bank Nusa Demo bukan organisasi nyata. Tidak ada akses bank, transaksi
uang, deployment, atau ketentuan regulator yang diklaim oleh materi ini.**

## Mau demo? Mulai dari sini

Baca [ringkasan skill yang dipakai](skills.html) untuk fungsi umum, demo yang
memakainya, dan link sumber tiap skill. Menu [Cara install skill](index.html#setup)
menjelaskan apa yang perlu di-download, sumbernya, isi paket, dan langkah
instalasinya. Ada cara otomatis lewat script/CLI serta link ZIP Awesome Copilot
untuk cara manual.

ZIP workshop berisi skill PowerPoint orisinal, bukan tujuh skill komunitas.
Script mengambil tujuh skill itu dari Awesome Copilot dan langsung menaruhnya
di `starter/.github/skills`. Alternatifnya, ekstrak ZIP Awesome Copilot dan
salin tujuh folder lengkap sesuai panduan. Jika memilih salin manual, lanjut
ke instalasi alat bantu tanpa menjalankan script download lagi.

Buka [index.html](index.html) di Edge/Chrome atau browser modern. Halaman bekerja
langsung dari filesystem: tidak perlu server, React, npm install, CDN, atau
internet untuk membaca bahan dan melihat contoh.

1. Buka [folder starter](starter/) sebagai folder tersendiri di VS Code.
2. Buka Copilot Chat, pilih **Agent**.
3. Di HTML, pilih demo dan klik **Salin prompt**. Paste di chat, lalu Enter.
4. Izinkan tool yang diperlukan, tunggu file jadi, lalu buka link hasil di chat.

Ada **satu prompt untuk tiap demo**:

| Demo | Yang dibuat |
|---|---|
| [Panduan kerja](starter/prompts/demo-01-business.md) | Word dengan diagram proses bisnis di dalamnya |
| [Arsitektur](starter/prompts/demo-02-architecture.md) | Word dengan gambaran sistem, komponen, dan urutan kerja |
| [PowerPoint](starter/prompts/demo-03-powerpoint.md) | 8 slide dengan angka dan diagram yang bisa diedit |
| [Notulen rapat](starter/prompts/demo-04-minutes.md) | Catatan mentah jadi notulen, keputusan, empat tugas, PIC dan tenggat |
| [Kronologi gangguan](starter/prompts/demo-05-incident.md) | Laporan gangguan dengan timeline, dampak, penyebab dari bukti, dan tindak lanjut |

Semua demo bisa dijalankan sendiri-sendiri, tanpa hasil dari demo sebelumnya.
Copilot diminta menjalankan alat ekspor juga, jadi presenter tidak perlu
menyalin perintah terminal saat live demo. Persetujuan tool tetap berlaku.
Kalau model menemui kendala, cek pesan errornya; jangan menganggap file pasti jadi.

Sebelum tampil, jalankan `npm run check:demo` dari starter. Jika ada bagian yang
belum siap, ikuti persiapan di bawah. ZIP yang diekstrak pada laptop baru tetap
perlu dipasangi skill dan alat; HTML tidak bisa mengecek instalasi laptop.

## Untuk belajar lebih lama

- Semua lima skenario: sekitar 115 menit; sesi ringkas pilih tiga demo sekitar
  45 menit, dengan persiapan sebelumnya. Waktu pembuatan oleh model bisa berbeda.
- Navigasi bertahap, tab lab, copy prompt/command, explorer data, download kit.
- Diagram interaktif untuk diperbesar dan pemilih Context/Container/sequence.
- Simulator aturan pada menit 119/120/121 dan versi usulan 90 menit.
- Checkpoint tersimpan di browser; reset tidak menghapus file peserta.
- Mode fasilitator, timer per lab, tampilan mobile, dan cetak panduan.
- Jika clipboard diblokir pada file lokal, dialog menampilkan teks lengkap.

Progress adalah pernyataan peserta, bukan sertifikasi atau verifikasi AI.
Preview deck dalam HTML adalah preview konten, bukan render file PowerPoint.

## Tujuan belajar

1. Mengerti bedanya permintaan di chat (prompt) dengan bekal cara kerja (skill).
2. Menyiapkan skill pada folder demo dengan versi yang sama untuk semua peserta.
3. Membuat panduan kerja dengan diagram alur di dalam dokumen.
4. Menjelaskan kondisi sistem sekarang dan usulan perbaikannya secara terpisah.
5. Membuat PowerPoint dengan diagram, sumber angka, dan catatan pembicara.
6. Mengecek hasil dan menyiapkan draft tindak lanjut tanpa mempublikasikannya.

## Isi paket

| Lokasi | Isi |
|---|---|
| [starter/](starter/) | Workspace peserta; buka folder ini secara terpisah di VS Code |
| [starter/input/](starter/input/) | Policy, catatan rapat, 12 kasus CSV, landscape, OpenAPI, issue, brief, spec |
| [starter/prompts/](starter/prompts/) | Prompt utuh berurutan; sama dengan tombol copy di HTML |
| [starter/.github/skills/banking-executive-deck/](starter/.github/skills/banking-executive-deck/) | Skill PowerPoint orisinal, generator, spec guide, lisensi MIT |
| [examples/](examples/) | Empat contoh Word (SOP, arsitektur, notulen, laporan gangguan), 8 slide PowerPoint, dan draft issue |
| [examples/diagrams/](examples/diagrams/) | Lima diagram dalam SVG, PNG, dan draw.io, termasuk timeline gangguan |
| [banking-skills-workshop.zip](banking-skills-workshop.zip) | Paket portabel tanpa dependency terinstal atau output peserta |

Referensi bukan hasil yang wajib identik. Nilai berdasarkan perilaku, evidence,
dan readability. Jangan menyebut hasil referensi sebagai hasil live peserta.

## Setup peserta

Dari folder [starter](starter/), gunakan PowerShell. Diperlukan Node.js 22+, Python 3.10+,
GitHub CLI 2.90+, VS Code + GitHub Copilot yang diizinkan organisasi, serta
viewer Word/PowerPoint dan draw.io yang disetujui.

```powershell
code .
node --version
python --version
gh --version
gh auth status
Get-Content .\scripts\setup-skills.ps1
.\scripts\setup-skills.ps1
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm install --prefix .\.github\skills\md-to-docx\scripts
code --install-extension hediet.vscode-drawio
npm run check:demo
```

Jangan mengubah execution policy organisasi jika script diblokir. Perintah
instalasi individual tersedia pada bagian Setup HTML. Download skill/dependency
dan penggunaan model Copilot memerlukan jaringan serta izin organisasi.

Buka **Chat: Open Customizations > Skills** dan pastikan skill ditemukan.
Discovery tidak menjamin invocation; prompt meminta pembacaan SKILL.md secara
eksplisit. Tinjau aktivitas agent dan approval tools.
Script setup boleh dijalankan lagi: skill yang sudah berasal dari versi workshop
tidak diunduh ulang. Jika ada folder dengan versi berbeda, script berhenti supaya
file lama tidak tertimpa.

## Skill dan sumber

Tujuh skill dari [Awesome Copilot](https://github.com/github/awesome-copilot/tree/0fe6545b950671641b2b14b44eb56678fea6c6b4/skills):

- `meeting-minutes`: catatan mentah jadi notulen dan daftar tugas.
- `incident-postmortem`: kronologi jadi laporan gangguan dan tindak lanjut.
- `documentation-writer`: how-to, outline, dan approval.
- `draw-io-diagram-generator`: diagram editable.
- `architecture-blueprint-generator`: blueprint dan diagram arsitektur.
- `create-architectural-decision-record`: alternatif dan trade-off.
- `md-to-docx`: konversi Word dengan PNG tertanam.

Commit terkunci: `0fe6545b950671641b2b14b44eb56678fea6c6b4`.
Skill komunitas tidak dibundel ulang: peserta mengunduh sumbernya dan mereview
instruksi, script, serta lisensi sebelum mengeksekusi.

`banking-executive-deck` adalah **skill orisinal workshop**, bukan skill Awesome
Copilot, skill resmi Microsoft, atau template korporat bank. Generator memakai
[python-pptx 1.0.2 (MIT)](https://github.com/scanny/python-pptx)
di virtual environment lokal.
Rendering SVG lokal memakai [resvg-js 2.6.2 (MPL-2.0)](https://github.com/yisibl/resvg-js).
Skill PPTX eksternal dengan pembatasan lisensi tidak disalin ke paket ini.

## Alur latihan bertahap (opsional)

Ini versi belajar yang lebih rinci, bukan syarat menjalankan lima demo cepat.

1. Approve outline, buat SOP, diagram `.drawio` dan SVG, render PNG, export Word.
2. Buat blueprint as-is, C4 Context/Container, sequence, dan ADR Proposed.
3. Buat spec baru dari output baseline peserta, generate 8 slide, buka PPTX.
4. Review evidence dan konsistensi; approve temuan sebelum menyimpan issue lokal.

Baseline CSV: 12 kasus, 9/12 ack <=15 menit (75%), 5/12 resolusi >120 menit,
rata-rata resolusi 106.7 menit. Tepat 120 memicu eskalasi kasus aktif, tetapi
metrik "melewati 120" menggunakan operator `>`. Durasi bukan bukti root cause.

Bonus perubahan 90 menit hanya berlaku pada salinan versi 1.1 yang berlabel
USULAN. Arsitektur dan deck berikutnya tetap baseline 1.0.

Demo notulen memakai [catatan rapat lanjutan](starter/input/meeting-transcript.md),
bukan catatan awal untuk SOP. Nama dan tenggat diberikan dalam cerita.
Demo gangguan memakai [kronologi rekaan](starter/input/incident-chronology.md),
terpisah dari CSV 12 keluhan. Dampak 45 menit; alert sampai pulih 40 menit;
120 dari 2.400 request timeout (5%); 18 pengguna sintetis terdampak.

Notulen disimpan di `output/demo-04`. Laporan gangguan mengikuti folder
`docs/postmortems` yang diminta skill. Semua tetap lokal, tanpa mengirim pesan
atau menjalankan tindakan pemulihan sungguhan.

## Membangun ulang materi (fasilitator)

Dependency cukup diinstal pada starter, bukan root training:

```powershell
npm ci --prefix .\starter
python -m venv .\starter\.venv
.\starter\.venv\Scripts\python.exe -m pip install -r .\starter\requirements.txt
npm run examples
```

Perintah `examples` membangun ulang diagram referensi dan PPTX dari fixture.
Untuk Word, setelah skill `md-to-docx` diunduh pada starter dan dependency
konverternya dipasang:

```powershell
node starter\.github\skills\md-to-docx\scripts\md-to-docx.mjs examples\business-process.md examples\business-process.docx
node starter\.github\skills\md-to-docx\scripts\md-to-docx.mjs examples\architecture-blueprint.md examples\architecture-blueprint.docx
node starter\.github\skills\md-to-docx\scripts\md-to-docx.mjs examples\meeting-minutes.md examples\meeting-minutes.docx
node starter\.github\skills\md-to-docx\scripts\md-to-docx.mjs examples\incident-postmortem.md examples\incident-postmortem.docx
```

Perintah Word di atas menimpa **contoh referensi**; bukan file hasil peserta.
Pastikan diagram PNG sudah dibangun. Lalu, dengan Python 3.10+:

```powershell
npm run bundle
npm test
python tests\validate_artifacts.py
```

Bundle menyinkronkan teks sumber ke `workshop-content.js` agar copy/download
bekerja pada `file://`, lalu membangun ZIP. Jalankan ulang setelah mengubah
input, prompt, source UI, atau contoh. ZIP mengecualikan node_modules, .git,
skill hasil download, output peserta (termasuk `starter/docs/adr` dan
`starter/docs/postmortems`), dan metadata
validasi lokal.

## Validasi dan batasan

Unit tests memeriksa CSV, boundary SLA, validasi diagram/spec, generator PPTX
aktual, penolakan overwrite, serta renderer SVG. Validator artefak memeriksa
link lokal, sinkronisasi prompt, media Word, struktur PPTX/draw.io, dan ZIP.
Tidak ada build/typecheck React yang diperlukan untuk halaman HTML mandiri ini.

UI tests tambahan menggunakan Playwright dan Edge pada Windows, atau Chromium
Playwright pada platform lain. Dari folder workshop (bukan starter):

```powershell
npm ci
npm run test:browser
```

Pada platform tanpa browser yang sesuai, install browser Playwright yang
disetujui organisasi terlebih dahulu. UI tests tidak menggunakan server,
mengecek desktop/mobile, clipboard fallback, download, progress, tab keyboard,
simulator SLA, zoom diagram, dan mode cetak.

Review visual Word/PowerPoint tetap diperlukan. Pemeriksaan struktur ZIP/XML
tidak membuktikan pagination, rendering font, atau keterbacaan pada semua viewer.
Diagram di Word berupa gambar; sumber draw.io dapat diedit. Diagram PPTX berupa
shape/connector native; SmartArt dan animasi tidak disediakan.


## Referensi

- [Agent Skills di VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [GitHub CLI skill install](https://cli.github.com/manual/gh_skill_install)
- [Awesome Copilot](https://github.com/github/awesome-copilot)
