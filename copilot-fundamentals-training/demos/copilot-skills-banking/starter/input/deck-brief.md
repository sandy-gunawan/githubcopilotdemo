# Executive deck brief

**SINTETIS / BUKAN PRODUKSI**

- Organisasi: Bank Nusa Demo, bukan organisasi nyata.
- Audiens: pimpinan Operations, BA, dan Solution Architect.
- Tujuan: meminta review SOP dan persetujuan eksplorasi desain, bukan go-live.
- Format: 8 slide, widescreen 16:9, bahasa Indonesia.
- Gaya: navy, teal, mint; whitespace cukup; satu pesan utama per slide.
- Diagram: proses bisnis dan arsitektur as-is, bukan placeholder.
- Source of truth: input fixture dan dokumen hasil lab yang sudah direview.

## Outline

1. Konteks dan tujuan keputusan.
2. Baseline terukur: 12 kasus, 9/12 ack tepat waktu (75%), 5/12 resolusi > 120 menit.
3. Proses bisnis baseline dengan cabang eskalasi dan notifikasi.
4. Arsitektur as-is: gateway, service, DB, simulator read-only, stub, audit.
5. Opsi to-be: scheduler dan outbox, jelas berlabel USULAN.
6. Roadmap berbasis tahap; PIC dan tanggal implementasi TBD.
7. Risiko, kontrol manusia, dan unknowns.
8. Keputusan yang diminta dan langkah berikutnya.

Jangan menjanjikan penghematan, compliance, atau target KPI yang belum
disetujui. Grafik dari baseline bukan prediksi manfaat. Cantumkan sumber dan
speaker notes. Diagram harus tetap terbaca saat slide ditampilkan penuh.
