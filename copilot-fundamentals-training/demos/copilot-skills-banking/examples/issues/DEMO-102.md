# DEMO-102 - Evaluasi desain pengecekan SLA

**SINTETIS / BUKAN PRODUKSI. Status: Draft lokal.**

- Tipe: improvement usulan, bukan root cause terkonfirmasi.
- Prioritas usulan: Medium.
- PIC individu: TBD. Due date: TBD. Approval required: Ya.
- Evidence: `system-landscape.md` menyatakan pengecekan manual;
  `complaints.csv` memuat 5/12 durasi resolusi >120 menit.
- Expected: keputusan eksplisit mengenai opsi scheduler sebelum implementasi.
- Acceptance usulan:
  - Scheduler hanya muncul di to-be, bukan as-is.
  - Uji kasus aktif menit 119, 120, 121; eskalasi mulai 120.
  - Kasus closed tidak dieskalasi sebagai kasus aktif.
  - Unknowns operasional dan approval dicatat.
- Dependensi: review blueprint; keputusan stakeholder.
- Batasan: tidak ada klaim perbaikan KPI atau deployment.
