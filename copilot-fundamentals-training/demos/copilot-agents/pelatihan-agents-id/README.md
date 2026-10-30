# Latihan Copilot Agents: Issue, Monitor, Steering, dan Review PR

**Repository latihan:** repositori contoh `copilot-agents-lab`.

Sesuai screenshot, repository baru sudah dibuat dan berisi tiga file pada
branch `main`:

```text
copilot-agents-lab/
  README.md     <- kebijakan triage yang akan diubah agent
  ISSUE.md      <- bahan untuk membuat GitHub Issue
  STEER.md      <- arahan tambahan saat agent bekerja
```

**Tidak perlu membuat repo, clone, atau upload ulang. Mulai dari langkah 1.**
Panduan ini dibaca terpisah; jangan mengganti README kebijakan dengan panduan ini.

## Tujuan latihan

Minta Copilot menambahkan Priority P0-P3 ke kebijakan triage, beri arahan
tambahan, lalu periksa hasilnya melalui pull request (PR).

```text
Buat Issue -> Assign Copilot -> Pantau Agents -> Beri arahan -> Review PR
```

Ini memakai **Copilot cloud agent di GitHub**, bukan Agent lokal di VS Code.
Cukup browser; tidak perlu Python, MCP, `.venv`, atau terminal menyala.
Perkiraan waktu 30-45 menit, tergantung antrean dan proses agent.

Sebelum mulai, pastikan akun memiliki write access dan cloud agent diizinkan
pada repo. Kuota/pemakaian mengikuti paket dan kebijakan organisasi.
Gunakan data latihan, bukan credential atau tiket rahasia.

## 1. Lihat kondisi awal

1. Buka tab **Code** pada repository latihan.
2. Buka `README.md`, lalu cari bagian **Ticket Triage Policy (Current)**.
3. Pastikan ada Severity **Low, Medium, High**, tetapi belum ada Priority P0-P3.

**Severity** menjelaskan besarnya dampak masalah. **Priority** menentukan
urutan penanganannya. Kita meminta agent membuat usulan aturan Priority.

**Target perubahan hanya `README.md` pada root repo baru.**
Tidak lagi memakai path `demos/copilot-agents/README.md` dari repo training.
Pertahankan instruksi demo yang sudah ada di atas bagian kebijakan.

Jika P0-P3 sudah ada dari latihan sebelumnya, siapkan branch/repo baseline
yang masih berisi kebijakan awal. Jangan menghapus pekerjaan orang lain.

## 2. Buat Issue

Klik **Issues > New issue**. Pilih formulir kosong/umum jika diminta.

> File `ISSUE.md` yang di-upload belum menjadi GitHub Issue. Isinya adalah
> bahan instruksi; Anda tetap perlu membuat tiket melalui tab Issues.

**Title:**

```text
Tambahkan Priority P0-P3 pada kebijakan triage
```

**Body — salin teks berikut:**

```markdown
## Tujuan
Tambahkan sistem Priority agar penanganan tiket lebih konsisten.

## Kebutuhan
- Hanya ubah README.md pada root repository, bagian kebijakan triage.
- Tambahkan definisi Priority P0, P1, P2, P3.
- Tambahkan mapping Severity Low/Medium/High ke default Priority.
- Jelaskan kapan P0 dipakai sebagai eskalasi.
- Tambahkan checklist "How to triage in 60 seconds".
- Pertahankan definisi Severity, triage harian, dan instruksi demo.
- Perjelas aturan "High severity first" agar konsisten dengan Priority baru.
- Pertahankan bahasa Inggris pada kebijakan seperti sumber.

## Batasan dan kriteria selesai
- Jangan mengubah ISSUE.md, STEER.md, workflow, atau pengaturan repo.
- Jangan mengarang SLA, owner, atau jadwal on-call.
- Ini usulan kebijakan latihan, bukan kebijakan resmi perusahaan.
- Laporkan validasi yang benar-benar dilakukan; jangan klaim tes yang tidak dijalankan.
- Buka PR untuk review manusia. Jangan merge.
```

Klik **Create** atau **Submit new issue**, sesuai tampilan GitHub.

**Yang dicek:** issue tersimpan di `copilot-agents-lab`, bukan repo training
atau upstream.

## 3. Assign ke Copilot

1. Di halaman issue, klik **Assignees**.
2. Pilih **Copilot**.
3. Jika dialog muncul, pastikan repository tujuan `copilot-agents-lab`
   dan branch awal `main`. Gunakan agent Copilot standar.
4. Konfirmasi assignment.

**Yang diharapkan:** Copilot mulai bekerja di background dan membuat PR.
Tautan sesi/PR mungkin baru muncul setelah beberapa saat.
Jangan membuat tugas duplikat hanya karena masih mengantre.

Jika Copilot tidak ada di Assignees, periksa akses, paket, dan izin cloud
agent dengan admin. Membuat repo baru tidak otomatis mengaktifkan fitur ini.

## 4. Monitor lewat tab Agents

Pada menu atas repo, klik **Agents** yang terlihat di screenshot.
Pilih sesi untuk issue tadi. Jika tidak menemukannya, gunakan tautan
aktivitas pada issue/PR atau [halaman Agents](https://github.com/copilot/agents).

README sumber menyebut **AgentHQ**; pada tampilan ini gunakan tab **Agents**.

| Yang dipantau | Yang diharapkan | Jika tidak sesuai |
|---|---|---|
| Repo dan issue | Sesuai tugas di `copilot-agents-lab` | Pilih sesi yang benar |
| Status | Mengantre, berjalan, atau selesai | Jika gagal/menunggu input, baca pesan/log |
| Aktivitas | Membaca dan mengubah README kebijakan | Jika salah arah, kirim instruksi bagian 5 |
| Perubahan, jika tersedia | Hanya `README.md` yang berubah | Minta perbaikan scope |
| Validasi dan pemakaian, jika tersedia | Ada penjelasan pemeriksaan dan kemajuan | Periksa jika berulang tanpa kemajuan; jangan menganggap token sama dengan biaya pasti |

Cukup periksa **awal pekerjaan, setelah steering, dan saat selesai**.
Tidak perlu membaca seluruh log. Nama status dan menu dapat berbeda antarversi.

## 5. Kirim arahan tambahan (steering)

Ketika agent masih berjalan, buka kolom pesan lanjutan pada sesi Agents
dan kirim:

```text
Persyaratan tambahan: ringkas bagian kebijakan triage agar sekitar satu
layar jika memungkinkan. Pertahankan definisi P0-P3, mapping Severity,
dan checklist. Jangan hapus instruksi demo di bagian atas README.
Tetap ubah hanya README.md pada root repository.
```

Ini mencerminkan arahan dalam `STEER.md`. "Satu layar" adalah sasaran
keringkasan, bukan ukuran tetap; jangan mengorbankan kebutuhan wajib.

**Yang dicek:** pesan tercatat di sesi dan arahnya terlihat pada hasil.
Agent dapat memproses arahan setelah tool yang sedang berjalan selesai.

**Jika agent sudah selesai atau tidak ada kolom steering:** buka PR-nya
dan kirim komentar berikut dari akun yang memiliki write access:

```text
@copilot Ringkas bagian kebijakan triage agar sekitar satu layar jika
memungkinkan. Pertahankan definisi P0-P3, mapping Severity, checklist,
dan instruksi demo. Hanya ubah README.md. Perbarui PR ini; jangan merge.
```

Ini revisi setelah hasil awal, bukan steering di tengah sesi.
Jangan hanya menulis komentar baru di issue setelah assignment, karena
komentar tersebut tidak otomatis diteruskan ke agent.

## 6. Review hasil pada Pull requests

Klik **Pull requests**, lalu buka PR yang terkait issue tadi.

| Bagian PR | Yang perlu dilihat |
|---|---|
| **Conversation** | Ringkasan pekerjaan, kaitan ke issue, dan laporan validasi |
| **Files changed** | Diff: perubahan sebelum/sesudah; ini bukti utama hasil kerja |
| **Checks** | Hasil pemeriksaan otomatis, jika tersedia |

Checklist singkat:

- [ ] Hanya `README.md` yang berubah; `ISSUE.md` dan `STEER.md` tetap.
- [ ] Instruksi demo dan definisi Severity lama tidak hilang.
- [ ] Definisi P0, P1, P2, P3 jelas.
- [ ] Ada default Priority untuk Low, Medium, dan High serta aturan eskalasi P0.
- [ ] Ada checklist triage 60 detik dan aturan baru tidak saling bertentangan.
- [ ] Kebijakan ringkas sesuai steering, tanpa SLA/owner yang dikarang.

Jika belum lengkap, komentari PR:

```text
@copilot Tolong lengkapi mapping untuk Severity Low, Medium, dan High.
Bedakan default Priority dengan eskalasi P0. Tetap ringkas dan hanya
ubah README.md. Perbarui PR ini, jangan membuat PR baru atau merge.
```

Tunggu revisi, lalu periksa **diff terbaru**, bukan hanya balasan agent.
Untuk perubahan dokumentasi, review isi dan format Markdown sudah relevan.
Jika tidak ada checks otomatis, catat apa adanya; bukan "semua tes lulus".
Jika workflow meminta approval, minta pihak berwenang meninjaunya dahulu.

**Merge tidak wajib untuk menyelesaikan latihan.** Jika akan merge,
ikuti persetujuan dan aturan repository. Agent selesai bukan berarti
hasilnya otomatis benar atau siap disahkan sebagai kebijakan.

## 7. Tanda latihan berhasil dan kendala umum

Latihan selesai jika Anda bisa menunjukkan:
**issue -> sesi agent -> arahan tambahan -> PR -> hasil review manusia**.
Catat tautan issue, sesi, dan PR sebagai bukti.

| Kendala | Tindakan |
|---|---|
| Tidak ada Copilot di Assignees | Periksa write access serta paket/kebijakan agent dengan admin |
| Sesi masih mengantre | Periksa status/kuota; jangan membuat banyak tugas duplikat |
| Agent tidak melihat perubahan laptop | Pastikan file tersedia di branch GitHub; perubahan lokal tidak otomatis dikirim |
| Sesi gagal atau tidak maju | Baca pesan/log; hentikan jika jelas salah arah atau tidak diperlukan |
| Agent selesai sebelum steering | Pakai komentar PR `@copilot` seperti bagian 5 |
| Agent mengubah file lain | Minta mengembalikan scope PR ke `README.md` tanpa menimpa kerja kontributor lain |

**Kalimat penutup trainer:**
"Kita mendelegasikan pekerjaan, memantau arah, memberi koreksi, lalu
memverifikasi hasil. Agent membantu eksekusi; manusia tetap memutuskan."

### Referensi

- [Demo sumber](https://github.com/ps-copilot-sandbox/copilot-fundamentals-training/tree/main/demos/copilot-agents)
- [Memulai tugas dan assignment issue](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
- [Monitor dan steering sesi](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents)
- [Scope tugas dan iterasi PR](https://docs.github.com/en/copilot/tutorials/cloud-agent/get-the-best-results)
