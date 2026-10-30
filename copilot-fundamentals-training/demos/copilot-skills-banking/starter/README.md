# Folder kerja untuk demo

Semua nama, kebijakan, arsitektur, issue, dan angka dalam folder ini adalah
SINTETIS. Bank Nusa Demo bukan bank nyata. SLA bukan ketentuan regulator.

## Saat demo, cukup ini

1. Di VS Code, pilih **File > Open Folder > starter**.
2. Buka Copilot Chat dan pilih **Agent**, bukan Ask.
3. Buka HTML workshop, pilih demo, klik **Salin prompt**, lalu paste dan Enter
   di Copilot Chat. Jika diminta izin menjalankan tool, cek lalu izinkan.
4. Copilot membuat file dan memberi link untuk membukanya. Sebagian besar di
   `output`; laporan gangguan mengikuti folder `docs/postmortems` milik skill.

| Mau bikin apa? | Prompt yang disalin | Hasil |
|---|---|---|
| Panduan kerja + alur bisnis | [demo-01-business.md](prompts/demo-01-business.md) | Word dengan diagram di dalamnya |
| Penjelasan arsitektur | [demo-02-architecture.md](prompts/demo-02-architecture.md) | Word + 3 diagram |
| Bahan presentasi pimpinan | [demo-03-powerpoint.md](prompts/demo-03-powerpoint.md) | PowerPoint 8 slide |
| Notulen dari catatan rapat | [demo-04-minutes.md](prompts/demo-04-minutes.md) | Word dengan keputusan, PIC, dan tenggat |
| Laporan dari kronologi gangguan | [demo-05-incident.md](prompts/demo-05-incident.md) | Word dengan diagram timeline |

Kelimanya **bisa dijalankan sendiri-sendiri**, termasuk di chat baru.
Tidak perlu menyelesaikan demo 1 sebelum mencoba demo 3.
File lama tidak ditimpa; Copilot diminta memilih folder baru untuk pengulangan.

## Cek kesiapan sebelum tampil

Dari terminal pada folder ini:

```powershell
npm run check:demo
```

Kalau semuanya OK, skill, bahan, dan alat lokal sudah siap. Cek ini tidak
menguji login Copilot, izin tool, atau apakah model benar-benar memakai skill.
Lihat daftar Skills dan aktivitas agent di VS Code juga.

## Baru pakai di laptop lain? Siapkan sekali dulu

ZIP berisi bahan dan skill PowerPoint orisinal, bukan alat yang sudah terinstal.
Gunakan perintah ini sebelum sesi, sesuai izin IT:

```powershell
node --version
python --version
gh --version
gh auth status
.\scripts\setup-skills.ps1
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm install --prefix .\.github\skills\md-to-docx\scripts
npm run check:demo
```

Gunakan Node.js 22+, Python 3.10+, dan GitHub CLI 2.90+. Jika kebijakan PowerShell memblokir
script, jangan mengubah execution policy organisasi. Gunakan perintah instalasi
individual di halaman workshop atau minta bantuan fasilitator.

## Kalau mau latihan lebih rinci (opsional)

Alur di bawah sengaja lebih panjang untuk belajar per langkah, bukan jalur
utama saat live demo.

Demo notulen memakai `input/meeting-transcript.md`, terpisah dari catatan
rapat awal untuk SOP. Demo gangguan memakai `input/incident-chronology.md`;
angka di sana bukan angka dari CSV 12 keluhan.

| Tahap | Bahan | Prompt | Hasil yang direview |
|---|---|---|---|
| Dokumentasi | `input/business-policy.md`, `input/meeting-notes.md` | `prompts/01-outline.md`, `02-business.md` | SOP + diagram tertanam |
| Perubahan aturan | Kebijakan perubahan di prompt | `prompts/03-change.md` | Narasi dan diagram tetap konsisten |
| Arsitektur | `input/system-landscape.md`, `input/openapi.yaml` | `prompts/04-architecture.md`, `05-adr.md` | As-is, usulan to-be, ADR Proposed |
| PowerPoint | Hasil lab + `input/deck-brief.md` | `prompts/06-powerpoint.md` | 8 slide dengan diagram |
| Review & issues | Semua output + `input/issue-backlog.md` | `prompts/07-review.md` | Temuan dan draft issue lokal |

`input/deck-spec.json` adalah spesifikasi contoh yang siap dieksekusi. Untuk lab,
minta Copilot membuat spesifikasi baru dari dokumen hasil peserta; jangan
mengklaim contoh bawaan sebagai hasil analisis otomatis.

```powershell
npm run deck -- --spec input\deck-spec.json --out output\contoh-awal.pptx
```

Generator tidak menimpa file yang sudah ada. Gunakan nama baru untuk iterasi.
Teks, diagram, tabel, dan metrik pada deck adalah objek PowerPoint native.

## Render diagram dan Word

Minta Copilot membuat sumber `.drawio` dan SVG mandiri dengan isi yang sama.
Periksa keduanya secara visual sebelum konversi.

```powershell
node scripts\render-diagram.cjs output\diagrams\business-process.svg output\diagrams\business-process.png
node .github\skills\md-to-docx\scripts\md-to-docx.mjs output\business-process.md output\business-process.docx
```

PNG harus ada sebelum menjalankan konverter Word. Konverter upstream dapat
menghasilkan placeholder bila gambar hilang; itu bukan hasil yang lulus review.
Diagram di Word adalah gambar; sumber `.drawio` tetap dapat diedit.

## Guardrails

- Hanya baca file lokal workshop. Tidak ada core banking, email, atau nasabah nyata.
- Jangan membuat GitHub Issue, PR, deployment, atau mengirim pesan sungguhan.
- Jangan mengarang regulasi, root cause, PIC, tanggal komitmen, atau manfaat finansial.
- Bedakan fakta fixture, hipotesis, usulan, dan informasi yang belum tersedia.
- Catat asal sumber. Semua output harus bertanda SINTETIS / BUKAN PRODUKSI.
- Contoh hasil ada di `../examples`, bukan di folder output peserta.

Skill komunitas diunduh pada commit yang dipin oleh script setup. Baca instruksi,
script, dan lisensi sebelum mengeksekusinya. Jangan memperbarui skill saat sesi.
