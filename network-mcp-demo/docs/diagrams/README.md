# Visual draw.io untuk belajar NetOps Lab

Semua visual dokumentasi memakai **draw.io**. Setiap gambar memiliki:

- **`.drawio`**: sumber yang bisa dibuka dan diedit.
- **`.png`**: hasil gambar yang ditampilkan pada panduan.

Kedua file memakai nama dasar yang sama. Mengedit PNG bukan cara mengubah
sumber diagram; edit file draw.io, lalu ekspor ulang.

## Urutan visual

| Gambar | Pertanyaan yang dibantu | Sumber editable | Preview |
|---|---|---|---|
| Peta belajar | Kita akan belajar apa? | [peta-belajar.drawio](peta-belajar.drawio) | [PNG](peta-belajar.png) |
| Kantor operasi | MCP, agent dan tool itu apa? | [mcp-kantor-operasi.drawio](mcp-kantor-operasi.drawio) | [PNG](mcp-kantor-operasi.png) |
| Arsitektur | Siapa terhubung ke siapa? | [arsitektur.drawio](arsitektur.drawio) | [PNG](arsitektur.png) |
| Investigasi | Bagaimana pertanyaan Bandung menjadi jawaban? | [alur-investigasi.drawio](alur-investigasi.drawio) | [PNG](alur-investigasi.png) |
| Dua jenis data | Structured dan unstructured bedanya apa? | [jenis-data.drawio](jenis-data.drawio) | [PNG](jenis-data.png) |
| Ingestion | Bagaimana sumber menjadi data yang dapat dibaca? | [alur-ingestion.drawio](alur-ingestion.drawio) | [PNG](alur-ingestion.png) |
| Discovery | Bagaimana agent tahu tools yang tersedia? | [discovery-tools.drawio](discovery-tools.drawio) | [PNG](discovery-tools.png) |
| Akses MCP | Siapa mengantar permintaan dan hasil? | [alur-akses-mcp.drawio](alur-akses-mcp.drawio) | [PNG](alur-akses-mcp.png) |
| Peta kode MCP | File mana memanggil file dan fungsi apa sampai SQLite? | [peta-kode-mcp.drawio](peta-kode-mcp.drawio) | [PNG](peta-kode-mcp.png) |
| Urutan get_device | Bagaimana handler memanggil service dan beberapa SELECT? | [urutan-get-device.drawio](urutan-get-device.drawio) | [PNG](urutan-get-device.png) |
| Tool structured | Query SQL mana yang membaca perangkat? | [tool-structured-sql.drawio](tool-structured-sql.drawio) | [PNG](tool-structured-sql.png) |
| Tool unstructured | Mengapa search dan read adalah dua langkah? | [tool-unstructured-search.drawio](tool-unstructured-search.drawio) | [PNG](tool-unstructured-search.png) |
| Bukti live read | Bagaimana membuktikan SQL dan MCP mengambil nilai baru, bukan jawaban tetap? | [bukti-data-live.drawio](bukti-data-live.drawio) | [PNG](bukti-data-live.png) |
| Perubahan | Mengapa agent tidak boleh approve sendiri? | [alur-perubahan.drawio](alur-perubahan.drawio) | [PNG](alur-perubahan.png) |
| Status request | Apa arti pending, rejected, applied dan failed? | [status-perubahan.drawio](status-perubahan.drawio) | [PNG](status-perubahan.png) |
| Relasi data, opsional | Kolom mana menghubungkan tabel? | [relasi-data.drawio](relasi-data.drawio) | [PNG](relasi-data.png) |

Warna biru menandai data/layanan structured, ungu menandai agent atau teks
dokumen, hijau untuk hasil/layanan, dan oranye untuk persetujuan atau peringatan.
Semua gambar memakai kasus BR-SW-01 yang sama.

## Membuka dan mengedit

1. Buka **draw.io Desktop**.
2. Pilih **File > Open**, lalu pilih salah satu file `.drawio` pada folder ini.
3. Klik kotak atau panah yang ingin diubah.
4. Simpan file sumber.
5. Pilih **File > Export as > PNG** dan simpan dengan nama dasar yang sama.

Anda juga dapat membuka file sumber dengan extension draw.io yang sesuai
di VS Code. Sumber berupa elemen gambar yang dapat diedit, bukan satu foto.

## Mengekspor ulang seluruh PNG

Komputer memerlukan draw.io Desktop. Tidak perlu menyalakan aplikasi network.

```powershell
Set-Location 'C:\clients\Organization\demo\fundamental\network-mcp-demo'
.\scripts\render-diagrams.ps1
```

Script memeriksa XML sumber, menjalankan exporter draw.io, dan menolak hasil
yang gagal atau tidak menghasilkan PNG baru.

Jika lokasi executable berbeda:

```powershell
.\scripts\render-diagrams.ps1 -DrawioPath 'D:\Tools\draw.io\draw.io.exe'
```

Saat menambah gambar pada Markdown, pakai bentuk yang muat selebar halaman:

```html
<img src="diagrams/arsitektur.png" alt="Gambaran susunan aplikasi NetOps Lab" width="100%">
```

Contoh path tersebut berlaku untuk dokumen yang berada langsung di folder docs.
Dokumen dalam subfolder memakai path relatif yang sesuai.

## Batas gambar

Gambar menjelaskan mekanisme yang ada, bukan janji integrasi hardware atau cloud
yang belum dibuat. Perangkat dan telemetry adalah simulasi. SQL pada diagram
disederhanakan agar terbaca; query dan penjelasan lengkap tersedia di
[bab tools](../04-mcp.md).
Peta file, fungsi dan SQL aktual tersedia di
[MCP dalam kode](../11-mcp-dalam-kode.md).
