---
title: "ADR-0001: Evaluasi notification outbox"
status: Proposed
date: 2026-10-19
authors: ["Solution Architect (peran sintetis)"]
tags: [architecture, decision, synthetic]
---

# ADR-0001: Evaluasi notification outbox

**SINTETIS / BUKAN PRODUKSI.** Contoh referensi, belum merupakan keputusan.

## Status

Proposed. Approver individu TBD. Tidak ada implementasi yang dilakukan.

## Context

Fixture menyatakan retry Notification Stub masih manual. Close membutuhkan
resolusi, receipt sukses, dan audit. Pola retry harus mempertimbangkan kondisi
pengiriman berhasil tetapi pencatatan receipt gagal.

## Decision

Usulkan evaluasi transactional outbox dan worker. Jangan menganggap opsi ini
sudah dipilih final atau sudah ada pada arsitektur as-is.

## Consequences

### Positive

- POS-001: Niat kirim dapat dicatat secara durable bersama data kasus.
- POS-002: Retry terkontrol dan audit lebih mudah ditelusuri.

### Negative

- NEG-001: Worker, retry policy, dan observability menambah beban operasional.
- NEG-002: Pengiriman ulang dapat duplikat; idempotency harus didesain.
- NEG-003: Exactly-once delivery tidak dijamin.

## Alternatives Considered

- ALT-001: Manual retry; sederhana tetapi bergantung pada tindak lanjut manusia.
- ALT-002: Retry sinkron terbatas; lebih sedikit komponen, namun request dapat
  lebih lama dan niat kirim tidak otomatis durable setelah proses terhenti.
- ALT-003: Transactional outbox + worker; kandidat untuk eksplorasi, memerlukan
  batas transaksi, deduplikasi, dan pemantauan yang jelas.

Alternatif belum ditolak secara final. Bukti beban, biaya, serta kesesuaian
operasional belum tersedia. PIC dan due date evaluasi TBD.

## Evidence

`starter/input/system-landscape.md`, `starter/input/openapi.yaml`,
`starter/input/business-policy.md`, `starter/input/meeting-notes.md`.
