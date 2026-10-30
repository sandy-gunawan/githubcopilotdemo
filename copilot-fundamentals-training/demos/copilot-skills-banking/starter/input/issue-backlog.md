# Backlog fixture - local drafts only

**SINTETIS / BUKAN PRODUKSI.** ID di bawah bukan GitHub Issue sungguhan.
Semua status: Draft. PIC individu: TBD. Due date: TBD.

## DEMO-101 - SOP dan diagram tidak lengkap

- Tipe: documentation.
- Prioritas usulan: High.
- Masalah fixture: panduan awal belum menunjukkan cabang data tidak lengkap,
  fraud, eskalasi kasus aktif, serta notifikasi gagal.
- Acceptance: dokumen dan diagram memuat semua cabang; ack <= 15 menit,
  eskalasi elapsed >= 120 menit; close hanya setelah receipt berhasil.
- Bukti sumber: business-policy.md.

## DEMO-102 - Pengecekan SLA manual

- Tipe: improvement.
- Prioritas usulan: Medium.
- Masalah fixture: as-is tidak memiliki scheduler. Ada 5 dari 12 kasus dengan
  resolution duration > 120 menit. Ini tidak membuktikan penyebab keterlambatan.
- Acceptance usulan: desain scheduler dibahas sebagai to-be; threshold diuji pada
  menit 119, 120, 121; tidak mengeskalasi kasus yang sudah closed.
- Keputusan implementasi dan dampak KPI: TBD.
- Bukti sumber: system-landscape.md, complaints.csv, business-policy.md.

## DEMO-103 - Notifikasi gagal dapat menghambat penutupan

- Tipe: design.
- Prioritas usulan: Medium.
- Masalah fixture: Notification Stub mendukung gagal kirim, retry masih manual.
- Acceptance usulan: ADR membandingkan manual retry dan durable outbox; membahas
  duplikasi, idempotency, audit, serta trade-off operasional.
- Bukti sumber: system-landscape.md, openapi.yaml.

## Aturan draft issue

Tulis judul, konteks, evidence, expected behavior, acceptance criteria,
prioritas usulan, dependensi, PIC TBD, due date TBD, dan approval required.
Tidak ada `gh issue create`, API GitHub, Jira, atau pengiriman pesan.
