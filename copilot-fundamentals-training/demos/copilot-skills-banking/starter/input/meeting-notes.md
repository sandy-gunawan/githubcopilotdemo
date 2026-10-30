# Catatan rapat operasional (fixture)

**SINTETIS / BUKAN PRODUKSI**

- Judul: Review keluhan transfer Bank Nusa Demo.
- Tanggal: 2026-10-19, 14:00-14:30 WIB (07:00-07:30 UTC).
- Organizer: Koordinator Operations (peran fiktif).
- Peserta: peran CS, Operations, Supervisor, Business Analyst, Solution Architect.
- Reviewer notulen: Fasilitator workshop.
- Bahan: business-policy.md, complaints.csv, system-landscape.md.

## Catatan mentah

CS: ada acknowledgement yang melewati 15 menit. Tolong hitung dari CSV, bukan
perkiraan. Operations: pengecekan umur kasus dan retry notifikasi masih manual.
Itu kondisi proses; belum merupakan root cause yang terkonfirmasi.

BA meminta panduan kerja dengan diagram yang menunjukkan jalur normal, data
kurang lengkap, dugaan fraud, ambang 120 menit, dan notifikasi gagal.

Architect meminta dokumentasi as-is dulu. Scheduler SLA dan notification outbox
adalah opsi to-be yang belum dibangun, belum disetujui, dan belum punya budget.
Core Banking Simulator harus tetap read-only.

Supervisor menyetujui pembuatan draft materi workshop, bukan perubahan sistem
produksi. Keputusan desain final, PIC individu, biaya, dan tanggal implementasi
belum ditentukan. Jangan menjadikan peserta rapat sebagai PIC otomatis.

## Keputusan eksplisit

1. Baseline kebijakan versi 1.0 dipakai untuk lab awal.
2. Semua hasil ditandai sintetis dan disimpan lokal.
3. Draft SOP dan diagram harus direview bersama.
4. Issue hanya berupa draft Markdown, tidak diterbitkan ke GitHub.

## Belum diputuskan

- Apakah scheduler dan outbox akan diimplementasikan.
- Target KPI baru dan budget.
- PIC individu dan due date implementasi.
- Perubahan ambang SLA; hanya boleh disimulasikan pada salinan versi 1.1.
