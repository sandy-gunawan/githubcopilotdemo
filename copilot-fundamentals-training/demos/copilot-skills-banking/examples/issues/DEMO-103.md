# DEMO-103 - Evaluasi retry notifikasi yang durable

**SINTETIS / BUKAN PRODUKSI. Status: Draft lokal.**

- Tipe: design usulan, bukan temuan keamanan.
- Prioritas usulan: Medium.
- PIC individu: TBD. Due date: TBD. Approval required: Ya.
- Evidence: `system-landscape.md`, `openapi.yaml`, ADR Proposed.
- Expected: pembandingan alternatif retry dengan gate close yang tetap benar.
- Acceptance usulan:
  - Bandingkan manual retry, retry sinkron terbatas, dan outbox.
  - Bahas duplikasi, idempotency, transaksi DB, audit, dan monitoring.
  - Notifikasi gagal membuat kasus tetap terbuka.
  - Tidak menjanjikan exactly-once atau mengklaim outbox sudah ada.
- Dependensi: ADR Proposed dan review manusia.
- Batasan: implementasi, budget, dan delivery target belum disetujui.
