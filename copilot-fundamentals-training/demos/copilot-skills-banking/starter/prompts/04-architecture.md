Baca dan gunakan .github/skills/architecture-blueprint-generator/SKILL.md
dan .github/skills/draw-io-diagram-generator/SKILL.md.
Baca input/system-landscape.md, input/openapi.yaml, input/business-policy.md,
dan input/meeting-notes.md. Pakai baseline 1.0 (120 menit), bukan change request.

Buat output/architecture-blueprint.md dalam bahasa Indonesia:
1. Label SINTETIS / BUKAN PRODUKSI. Tegaskan ini declared simulation,
   bukan analisis kode aplikasi nyata.
2. C4 Context dan C4 Container as-is. Ini dua tingkat detail, bukan dua deployment.
3. Sequence alur keluhan sampai close, termasuk notification failure.
4. Tanggung jawab komponen, arah akses, data, dan trust boundary konseptual.
5. Evidence per klaim dari nama file input. Unknowns ditandai TBD.
6. Bagian to-be terpisah: SLA Scheduler dan transactional outbox + worker.
   Label semua komponen baru USULAN. Jelaskan manfaat potensial dan trade-off,
   tanpa menjanjikan KPI, availability, biaya, atau compliance.

Simulator hanya GET status, bukan transaksi uang. WEB tidak langsung ke DB.
As-is tidak punya scheduler, broker, outbox, atau retry worker.
Simpan .drawio dan SVG mandiri untuk context, containers, sequence di
output/diagrams. Tanamkan referensi PNG dalam dokumen.
Gunakan istilah C4 dengan benar; jangan menyebut flowchart sebagai C4.
Jangan mengubah input atau menimpa output yang sudah ada tanpa persetujuan.
