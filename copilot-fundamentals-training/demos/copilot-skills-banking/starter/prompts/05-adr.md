Baca .github/skills/create-architectural-decision-record/SKILL.md.

Saya meminta draft ADR sintetis untuk Bank Nusa Demo:
- DecisionTitle: Opsi durable notification outbox untuk keluhan.
- Context: input/system-landscape.md dan input/openapi.yaml menyatakan
  retry notifikasi masih manual; close membutuhkan receipt berhasil.
- Decision: usulkan evaluasi transactional outbox dan worker, bukan implementasi.
- Alternatives: mempertahankan manual retry; retry sinkron terbatas;
  transactional outbox dengan worker.
- Stakeholders: peran Operations, CS, Supervisor, Solution Architect.
  Nama approver individu belum tersedia, tulis TBD.

Status wajib Proposed. Bahas delivery failure, duplikasi, idempotency,
observability, beban operasional, dan batas transaksi database.
Jangan mengklaim exactly-once delivery atau komponen sudah ada.
Tidak ada estimasi biaya atau SLA produksi yang disetujui.
Ikuti format dan lokasi docs/adr dari skill, gunakan nomor berikutnya,
serta beri label SINTETIS / BUKAN PRODUKSI.
