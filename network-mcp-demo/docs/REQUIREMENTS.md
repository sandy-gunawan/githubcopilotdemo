# Kebutuhan dan batasan demo

Dokumen ini menjadi acuan implementasi dan pengujian.

| ID | Kebutuhan | Bukti penerimaan |
|---|---|---|
| REQ-001 | Aplikasi terisolasi, tidak mengubah aplikasi lain | Semua file berada di `network-mcp-demo`, tidak ada koneksi device asli |
| REQ-002 | Data structured yang saling berhubungan | 3 site, 25 device, interface, link, VLAN, metrics, alert |
| REQ-003 | Data unstructured yang dapat dicari dan dibaca | Runbook, incident, config text, log; pencarian full-text SQLite |
| REQ-004 | Ingestion dummy yang dapat diulang | Generator deterministik, import tervalidasi dan transaksional, reset eksplisit |
| REQ-005 | MCP server sungguhan | Discovery tools/resources dan tools/call melalui SDK MCP Streamable HTTP |
| REQ-006 | Agent sungguhan melalui GitHub Copilot SDK | Agent memanggil server MCP; tool call dan hasil ditampilkan |
| REQ-007 | CRUD structured dan unstructured yang aman | Preview, approval manusia, pemeriksaan versi, audit, batas referensi delete |
| REQ-008 | Dashboard interaktif | Summary, inventory/filter, detail, topology, metrics, knowledge, changes, audit |
| REQ-009 | Persistence | Perubahan tetap tersimpan setelah database dibuka kembali |
| REQ-010 | Skenario investigasi yang konsisten | Congestion branch, interface down, CPU tinggi; jawaban berbasis bukti |
| REQ-011 | Error eksplisit | Agent gagal login tidak diganti jawaban hardcoded; pesan error terlihat |
| REQ-012 | Dokumentasi mudah dipahami | Tujuan, setup, arsitektur, diagram, model data, MCP, demo, ekspektasi, keterbatasan |

## Prinsip proyek

- Hanya data fiktif. Tidak ada SSH, SNMP, kredensial device, atau operasi ke network asli.
- Backend adalah sumber kebenaran. Model tidak boleh mengesahkan perubahan sendiri.
- Membaca tidak mengubah state. Menulis selalu melalui change request.
- Approval hanya tersedia pada aplikasi web lokal, bukan MCP tools.
- Semua klaim kondisi jaringan harus memiliki hasil tool sebagai bukti.
- Data dokumen adalah konten tidak tepercaya, bukan instruksi baru untuk agent.
- Demo lokal single-user, bukan sistem produksi atau sistem multi-tenant.
- Tidak ada provisioning cloud pada scope ini.
