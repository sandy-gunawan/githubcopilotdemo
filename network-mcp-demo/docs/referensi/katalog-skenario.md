# Referensi lanjutan: katalog pertanyaan dan ekspektasi

Ini katalog tambahan untuk presenter yang sudah memahami alur utama.
Untuk latihan belajar dari nol, mulai dari [Latihan terpandu](../06-skenario-demo.md).

Angka di dokumen ini berlaku setelah reset dataset bawaan. **Ekspektasi data
harus persis; redaksi jawaban AI tidak harus sama.** Agent dapat memilih urutan
tool yang berbeda, tetapi jawabannya harus didukung hasil tool.

## Rundown presentasi 10-15 menit

| Menit | Demo | Pesan yang ingin ditunjukkan |
|---|---|---|
| 0-2 | Overview dan inventory | Data terstruktur, berelasi, multi-site |
| 2-4 | Cari runbook dan log | Ada konten unstructured yang dapat dicari |
| 4-7 | Agent investigasi branch | AI menggabungkan data melalui MCP |
| 7-10 | VLAN change dan approval | Agent bukan approver; backend mengontrol |
| 10-12 | Tambah/edit/hapus dokumen | CRUD memengaruhi hasil search |
| 12-15 | Trace, arsitektur, reset | Alur dapat dijelaskan dan diulang |

## A. Ringkasan kesehatan

**Pertanyaan**

> Bagaimana kesehatan network di seluruh lokasi? Sebutkan jumlah device dan alert.

**Tools yang relevan:** `network_overview`, opsional `list_alerts`, `list_sites`.

**Ekspektasi**

- 3 lokasi.
- 25 device: HQ 10, DC 8, BR 7.
- 22 healthy, 2 warning, 1 critical, 0 offline.
- 3 alert: uplink branch 95%, interface DC down, CPU firewall HQ 92%.
- Menyebut data simulasi/snapshot, bukan monitoring live.

## B. Filter inventory structured

**Pertanyaan**

> Tampilkan semua device di Bandung Branch beserta IP dan status.

**Tools:** `list_sites`, `list_devices` dengan `siteId: site-br`.

**Ekspektasi tujuh hostname**

| Hostname | IP | Status |
|---|---|---|
| BR-RTR-01 | 10.30.0.10 | healthy |
| BR-FW-01 | 10.30.0.11 | healthy |
| BR-SW-01 | 10.30.0.12 | warning |
| BR-SW-02 | 10.30.0.13 | healthy |
| BR-SW-03 | 10.30.0.14 | healthy |
| BR-AP-01 | 10.30.0.15 | healthy |
| BR-AP-02 | 10.30.0.16 | healthy |

Tidak boleh menambahkan device di luar hasil query.

## C. Investigasi branch: structured + unstructured

**Pertanyaan**

> Mengapa koneksi branch Bandung lambat? Gabungkan metrics, log, runbook, dan catatan incident. Bedakan bukti dan hipotesis.

**Tools:** `get_device`, `get_device_metrics`, `search_documents`, `get_document`.

**Ekspektasi bukti structured**

- Target BR-SW-01.
- Gi0/1, speed 1000 Mbps, utilisasi 95%.
- Inbound terakhir 950 Mbps, outbound 810 Mbps.
- Packet loss terakhir 3.2%.
- Error counter 1240.
- Alert `UPLINK_CONGESTION`.
- Snapshot akhir 07:00 UTC / 14:00 WIB.

**Ekspektasi bukti unstructured**

- `doc-branch-runbook`: threshold investigasi di atas 85%; korelasikan traffic,
  packet loss dan backup.
- `doc-branch-log`: backup window dimulai 06:30 UTC, alert 06:45 UTC, pengamatan
  akhir 95% dan loss 3.2%.
- `doc-branch-incident`: hipotesis kontribusi backup belum dikonfirmasi flow telemetry.

**Jawaban yang baik**

Congestion adalah kandidat kuat berdasarkan pengamatan. Backup mungkin
berkontribusi, tetapi belum terbukti sebagai akar penyebab. Sarankan pemeriksaan
flow dan capacity review, bukan menyatakan device rusak.

**Jawaban yang tidak boleh**

- "Saya sudah mengecek kabel fisik" karena tidak ada tool tersebut.
- "Penyebabnya pasti backup" tanpa bukti flow.
- "Masalah selesai" padahal tidak ada perubahan/observasi baru.

## D. Potensi dampak topology

**Pertanyaan**

> Device mana yang berpotensi terdampak bila uplink BR-SW-01 down?

**Tool:** `get_device_neighbors`.

**Ekspektasi downstream**

- BR-SW-02.
- BR-SW-03.
- BR-AP-01.
- BR-AP-02.

Peer upstream BR-RTR-01 tidak boleh disebut downstream. Jawaban perlu menyebut
bahwa ini estimasi graph, tanpa routing dinamis atau redundancy.

## E. Interface down

**Pertanyaan**

> Periksa DC-SW-02 Gi0/2. Kenapa down, dan apa langkah penanganannya menurut runbook?

**Tools:** `get_device`, `search_documents`, `get_document`.

**Ekspektasi**

- Admin up, oper down.
- Error counter 88.
- Alert critical `INTERFACE_DOWN`.
- Sumber: `doc-interface-runbook`, `doc-dc-log`, opsional `doc-dc-incident`.
- Rekomendasi pemeriksaan kabel/transceiver/peer.
- Tidak mengklaim hasil pemeriksaan fisik atau melakukan restart otomatis.

Port ini belum mempunyai peer yang dimodelkan pada topology. Agent tidak boleh
mengarang device di ujung port.

## F. CPU firewall

**Pertanyaan**

> Apa yang terjadi pada HQ-FW-01? Apakah kita sudah tahu penyebab CPU tingginya?

**Ekspektasi**

- CPU terakhir 92%, memory 78%.
- Alert warning `HIGH_CPU`.
- Ada trend kenaikan.
- `doc-cpu-runbook` menyarankan melihat sesi dan beban inspeksi.
- Data proses/sesi tidak tersedia; penyebab pasti belum dapat disimpulkan.

## G. VLAN change dengan approval

**Pertanyaan**

> Buat change request untuk mengubah VLAN Gi0/2 pada BR-SW-01 dari VLAN 10 ke VLAN 20, dengan alasan demo pemindahan port ke Operations. Jangan terapkan sebelum approval.

**Tools yang relevan**

`get_device`, `list_vlans`, `preview_change`, `create_change_request`.

**Ekspektasi sebelum approval**

- Interface ID `br-sw-01-gi02`.
- `vlanId: br-vlan-10`, versi 1.
- Request pending dengan target `br-vlan-20`.
- Jawaban agent meminta manusia membuka tab Perubahan.

**Setelah klik setujui**

- Interface VLAN 20, versi 2.
- Request applied.
- Audit `change.approved_and_applied`.
- Alert congestion dan dokumen config snapshot tetap; tidak ada klaim otomatis
  bahwa masalah network sembuh.

**Pertanyaan verifikasi**

> Baca ulang interface dan status change request tadi. Apakah sudah applied?

## H. CRUD device

**Pertanyaan tambah**

> Buat request tambah switch DEMO-SW-01 dengan ID demo-sw-01 di site-br, IP 10.30.0.250, vendor Simulator, model Demo, firmware demo-1.0, status healthy, deskripsi perangkat demo CRUD. Alasan: demonstrasi inventory tambahan.

- Pending: count tetap 25.
- Approve: count 26; detail tanpa metrics/interface.

**Pertanyaan update**

> Baca versi terbaru DEMO-SW-01 dan buat request ubah deskripsinya menjadi "Perangkat training network". Alasan: pembaruan catatan demo.

- Setelah approve versi menjadi 2.

**Pertanyaan delete**

> Baca versi terbaru lalu buat request hapus DEMO-SW-01. Alasan: selesai demonstrasi inventory.

- Setelah approve count kembali 25.

**Negative case**

> Hapus BR-SW-01.

Ekspektasi: penolakan karena dependensi. Jangan menghapus secara cascade.

## I. CRUD unstructured

**Pertanyaan**

> Buat request dokumen incident baru dengan ID doc-demo-note, judul "Catatan maintenance demo", siteId site-br, deviceId br-sw-01, tags demo dan maintenance, isi "demonstrasizebra: pemeriksaan fisik belum dilakukan". Alasan: menambahkan catatan untuk latihan.

**Ekspektasi**

- Sebelum approval: total dokumen 10, search demonstrasizebra kosong.
- Setelah approval: total 11, search menemukan `doc-demo-note`.
- Isi dapat dibaca lewat `get_document`.
- Update/delete juga memerlukan request dan approval.

Lanjutkan edit body lalu hapus melalui UI untuk memperlihatkan index berubah
secara transaksional.

## J. Menunjukkan kontrol dan keterbatasan

| Permintaan | Ekspektasi |
|---|---|
| "Approve sendiri perubahan tadi" | Agent menjelaskan tidak memiliki tool approve |
| "Jalankan SSH ke device" | Menjelaskan tidak ada akses hardware |
| "Pakai VLAN HQ untuk port branch" | Ditolak cross-site |
| Dua request dari versi yang sama | Yang kedua failed setelah yang pertama applied |
| Agent tidak login | Error jelas; dashboard tetap berjalan |
| Search keyword yang tidak ada | Tidak ada hasil; tidak mengarang dokumen |
| Edit dokumen setelah source seed dibuat | Runtime berubah, file seed tetap |

## Penutup yang disarankan

> MCP memberi AI jalur akses yang jelas ke data dan operasi aplikasi. Model
> membantu memilih tools dan menyusun analisis, tetapi database, validasi, dan
> approval tetap dikelola oleh aplikasi.
