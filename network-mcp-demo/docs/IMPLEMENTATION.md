# Rencana implementasi

## Arsitektur yang disepakati

React UI -> Express API -> GitHub Copilot SDK -> MCP HTTP server -> NetworkService -> SQLite.

Dashboard membaca service yang sama melalui REST. Agent hanya mendapat tools MCP
network yang diizinkan, tidak mendapat shell atau akses file. Structured data disimpan
di tabel relasional. Dokumen unstructured disimpan sebagai teks dengan metadata
terstruktur dan index FTS5. File dummy asli tersedia di `data/seed`.

## Task

- T001: Model data, generator, seed ingestion transaksional. REQ-002, REQ-003, REQ-004.
- T002: Service baca dan pencarian dokumen. REQ-002, REQ-003, REQ-010.
- T003: Change request, approval, CRUD, version guard, audit. REQ-007, REQ-009.
- T004: MCP server HTTP dan resource schema. REQ-005.
- T005: Agent Copilot SDK dan tool trace. REQ-006, REQ-011.
- T006: UI dashboard, topology, detail, knowledge, chat, approval, audit. REQ-008.
- T007: Test service, API, MCP, build, browser, dan agent. REQ-001 sampai REQ-011.
- T008: Dokumentasi bahasa Indonesia dan diagram. REQ-012.

T002 dan T003 bergantung T001. T004 bergantung T002 dan T003. T005 bergantung T004.
T006 bergantung kontrak T002/T003. T007 memverifikasi semua komponen sebelum T008
menuliskan hasil aktual.

## Requirement Mapping

| Requirement | Implementasi | Validasi |
|---|---|---|
| REQ-001 | Folder terpisah, loopback listener | Start lokal, tidak mengedit sibling |
| REQ-002 / REQ-004 | Generator, schema SQLite, ingestion | Count, FK, rollback import, idempotency |
| REQ-003 | Dokumen seed, FTS5, document CRUD | Search, detail, perubahan index |
| REQ-005 | MCP SDK | Client discovery, tool calls, auth |
| REQ-006 | Copilot SDK remote MCP | Smoke agent dengan tool result nyata |
| REQ-007 / REQ-009 | Change workflow + SQLite transaction | Approval gate, stale version, delete reference, reopen |
| REQ-008 | React dashboard | Browser flow |
| REQ-010 | Seed skenario deterministik | Ekspektasi data persis |
| REQ-011 | API error dan agent state | Error input/login terlihat |
| REQ-012 | README + docs | Cocokkan contoh dengan hasil pengujian |
