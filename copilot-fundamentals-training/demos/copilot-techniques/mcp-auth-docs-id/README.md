# Praktik MCP: Tanya Dokumentasi MyCorp-Auth melalui Copilot

Panduan ini merupakan alternatif mandiri untuk modul MCP sebelumnya. Modul
lama tidak diubah. Kita tetap memakai dokumen di
[mycorp-auth-docs](../mycorp-auth-docs), tetapi membuat server MCP yang benar,
bukan server Flask dengan endpoint REST.

**Cara belajar:** peserta melengkapi tiga blok `pass` dengan bantuan Copilot,
menguji hasil kode, lalu menghubungkan server tersebut ke VS Code.

**Hasil akhir:** Copilot dapat memanggil tool `search_auth_docs`, menerima
kutipan Markdown, lalu menjelaskan alur token atau masalah autentikasi.
Nama servernya tetap **authDocs**.

Panduan ditujukan untuk **Windows, PowerShell, Python 3.11+, dan VS Code**.
Perkiraan waktu praktik: 30-45 menit.

> Folder ini menyediakan latihan berbasis `pass`, solusi terpisah untuk
> trainer, dan daftar dependency. Script Flask pada folder induk tidak perlu diubah.
> Jangan mencampurkan kode Flask lama dengan kode MCP di bawah.

### Ringkasan alur demo yang sudah berhasil

1. Lengkapi tiga blok `pass` pada
   [mcp_auth_docs_starter.py](mcp_auth_docs_starter.py) menggunakan Copilot.
2. Buat `.venv` di dalam folder modul dan uji pencarian dengan mode `test`.
3. Daftarkan `authDocs` pada konfigurasi **workspace yang sedang dibuka**.
   Tidak perlu pindah jendela jika workspace Anda sudah memuat repository ini.
4. Pilih **Start** untuk server dari VS Code. Tidak perlu menyalakan script
   manual atau membiarkan terminal server terbuka.
5. Tanyakan alur token atau error 401 di Copilot Chat.
6. Periksa pemanggilan **`authDocs-search_auth_docs`** beserta hasil kutipannya.
   Jawaban yang benar tanpa pemanggilan tool belum membuktikan MCP bekerja.

Langkah 5-6 di bawah menjelaskan koneksi dan contoh pertanyaan yang sudah
berhasil dicoba. Template kode tetap memakai `pass` untuk sesi latihan baru.

## 1. Apa itu MCP?

**Model Context Protocol (MCP)** adalah aturan komunikasi standar agar aplikasi
AI dapat menggunakan kemampuan dari program lain.

Bayangkan Copilot sebagai petugas layanan pelanggan. Petugas ini bisa
menjelaskan informasi, tetapi membutuhkan akses ke lemari dokumen perusahaan.
Server MCP bertugas membuka lemari tersebut melalui fungsi yang jelas:
**cari dokumen**. Petugas tidak perlu mengetahui cara membaca setiap file.

Dalam latihan ini:

| Bagian | Peran |
|---|---|
| VS Code + Copilot | Aplikasi tempat pengguna bertanya, disebut **host** |
| MCP client di dalam host | Menghubungkan host ke server dan mengirim permintaan |
| Server Python `authDocs` | Menyediakan kemampuan pencarian |
| Tool `search_auth_docs` | Fungsi pencarian yang boleh dipanggil |
| Folder `mycorp-auth-docs` | Sumber informasi yang dicari |
| Model AI | Memilih tool dan merangkum hasilnya menjadi jawaban |

Server ini **tidak menjalankan model AI**, tidak memerlukan API key model,
dan tidak melakukan login ke layanan MyCorp-Auth. Ia hanya membaca dokumentasi
contoh yang sudah tersedia.

### Alur saat pengguna bertanya

```text
Pengguna: "Apa alur token MyCorp-Auth?"
    |
    v
Copilot memilih tool search_auth_docs
    |
    v
MCP client mengirim query="token", limit=8
    |
    v
Server Python membaca paragraf dari file Markdown
    |
    v
Server mengembalikan nama file dan kutipan yang cocok
    |
    v
Copilot menyusun jawaban berdasarkan kutipan
```

Saat koneksi dimulai, client dan server melakukan **initialize** untuk
menyepakati kemampuan/protokol. Client kemudian dapat meminta **tools/list**
untuk menemukan tool, dan **tools/call** untuk menjalankannya. SDK MCP
menangani pesan JSON-RPC tersebut, sehingga kita tidak perlu menulis parser
protokol sendiri.

### Mengapa stdin/stdout, bukan Flask?

Untuk server lokal, VS Code dapat menjalankan Python sebagai proses anak:

- **stdin**: jalur masuk permintaan MCP dari client ke server.
- **stdout**: jalur keluar balasan MCP dari server ke client.
- **stderr**: jalur log atau pesan diagnostik.

Tidak perlu port 8000, browser, atau terminal server terpisah.

**HTTP juga bisa digunakan untuk MCP**, misalnya dengan transport
Streamable HTTP. Namun, endpoint Flask biasa seperti `POST /authdoc`
tidak otomatis menjadi MCP. Ia belum menyediakan protokol dan penemuan tool.

> Saat server melayani MCP, jangan menulis `print("Server siap")` ke stdout.
> Itu dapat mengacaukan jalur protokol. Gunakan `logging` ke stderr.
> `print()` pada mode `test` di panduan ini aman karena mode tersebut tidak
> menjalankan transport MCP.

## 2. Persiapan lingkungan dan data

Yang dibutuhkan:

- Python 3.11 atau lebih baru.
- VS Code dengan fitur Copilot Chat dan penggunaan tools.
- Akses Copilot yang aktif; kebijakan organisasi mengizinkan MCP lokal.
- Koneksi internet saat memasang dependency.

### Masuk ke folder modul untuk instalasi dan pengujian

Jika belum punya repository:

```powershell
git clone https://github.com/ps-copilot-sandbox/copilot-fundamentals-training
Set-Location .\copilot-fundamentals-training\demos\copilot-techniques\mcp-auth-docs-id
code .
```

Jika repository sudah tersedia, **jangan clone lagi**. Buka folder
modul di terminal. Untuk lokasi contoh pada komputer latihan:

```powershell
Set-Location C:\clients\Organization\demo\fundamental\copilot-fundamentals-training\demos\copilot-techniques\mcp-auth-docs-id
```

Jika jendela VS Code sudah membuka `fundamental` atau repository ini,
**tetap gunakan jendela tersebut**; tidak perlu menjalankan `code .` lagi.
Jika ingin workspace khusus latihan, buka modul dengan `code .`.
Pilih konfigurasi MCP yang sesuai lokasi workspace pada langkah 5.

**Semua perintah berikut dijalankan dari folder `mcp-auth-docs-id`, bukan
dari root repository atau folder `demos`.** Environment `.venv` dibuat di
folder modul agar dependency latihan terpisah dari demo lainnya.
Lokasi terminal berbeda dari lokasi workspace: `Set-Location` hanya
mengubah folder terminal, bukan folder paling atas Explorer.
Seluruh folder data tetap diperlukan di lokasi aslinya; jangan memindahkan
hanya folder modul tanpa folder data di sebelahnya.

### Struktur yang digunakan

```text
copilot-fundamentals-training\
  demos\
    copilot-techniques\
      README.md
      mcp_auth_docs.py            (modul Flask lama; tidak digunakan)
      mcp-auth-docs-id\
        .venv\                   (environment khusus modul)
        .vscode\
          mcp.json               (konfigurasi MCP lokal)
        .gitignore               (mengabaikan environment dan cache Python)
        README.md                (panduan ini)
        mcp_auth_docs.py          (referensi solusi trainer)
        mcp_auth_docs_starter.py  (file utama latihan peserta)
        requirements.txt
      mycorp-auth-docs\
        overview.md
        token_flow.md
        troubleshooting.md
        misc\
          support.md
```

Data tidak perlu diganti:

| Dokumen | Isi |
|---|---|
| [overview.md](../mycorp-auth-docs/overview.md) | Gambaran layanan, metode autentikasi, endpoint |
| [token_flow.md](../mycorp-auth-docs/token_flow.md) | Login, penerbitan JWT, penggunaan token, refresh |
| [troubleshooting.md](../mycorp-auth-docs/troubleshooting.md) | Error 401, signature, roles, token kedaluwarsa |
| [support.md](../mycorp-auth-docs/misc/support.md) | Panduan memperoleh refresh token |

**Catatan kualitas data:** ini dokumentasi contoh, bukan spesifikasi produksi
yang sudah diverifikasi. Ada bagian yang disamarkan dengan `******`,
perbedaan endpoint `/login` dan `/auth/login`, serta penyebutan HS256
bersamaan dengan public key di dokumen lain. MCP tidak memperbaiki
ketidakkonsistenan tersebut. Minta Copilot menyebut sumber dan menandai
perbedaannya, bukan mengarang detail yang hilang.

### Buat virtual environment dan pasang SDK

```powershell
python3 --version
python3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\requirements.txt
```

**Periksa sebelum lanjut:**

```powershell
Get-Location
Test-Path .\.venv\Scripts\python.exe
.\.venv\Scripts\python.exe -m pip show mcp
```

Lokasi harus berakhir dengan `mcp-auth-docs-id`, `Test-Path` harus menghasilkan
`True`, dan `pip show` harus menampilkan SDK MCP v1. Jika `False`, pastikan
perintah `python3 -m venv .venv` berhasil sebelum mencoba mode `test`.

Jika Windows hanya mengenali `python`, ganti `python3` pada dua perintah
pertama dengan `python`. Setelah environment terbentuk, gunakan path Python
di `.venv` seperti contoh, bukan Python global.

**Mengapa dibatasi `<2`?** Kode modul ini menggunakan API SDK MCP **v1**
(`FastMCP`). SDK v2 memiliki perubahan API. Batas versi mencegah kode v1
dipasangkan dengan SDK v2 secara tidak sengaja.

Tidak perlu Flask. Tidak perlu mengaktifkan virtual environment atau mengubah
PowerShell Execution Policy karena kita memanggil Python environment secara langsung.
Folder `.venv` dan cache Python sudah diabaikan oleh
[.gitignore](.gitignore) khusus modul. Jangan commit atau membagikan environment.

**Jika mengikuti versi panduan sebelumnya:** environment di root repository
tidak digunakan lagi. Buat ulang `.venv` di folder modul dan pasang dependency
dari `requirements.txt`; jangan memindahkan folder environment secara manual
karena sejumlah path di dalamnya dapat terikat ke lokasi lama.

## 3. Lengkapi server MCP dengan Copilot

**File utama seluruh praktik ini adalah
[mcp_auth_docs_starter.py](mcp_auth_docs_starter.py).** Perintah pengujian dan
konfigurasi MCP di bagian berikutnya juga memakai file tersebut, sehingga
yang didemokan benar-benar kode hasil peserta.

Versi lengkap ada di [mcp_auth_docs.py](mcp_auth_docs.py) sebagai pegangan
trainer saja; implementasi lengkapnya tidak ditampilkan di panduan peserta.

### 3A. Siapkan latihan dari template `pass`

Starter sudah memuat import, nama server, lokasi dokumen, dan dekorator
`@mcp.tool()`. Peserta melengkapi **tiga blok `pass`**, bukan membuat
protokol MCP dari nol. Dekorator tetap terlihat agar trainer dapat menjelaskan
bagaimana fungsi Python didaftarkan menjadi tool.

**Starter sengaja belum berfungsi.** Sebelum dilengkapi, fungsi Python
dengan `pass` mengembalikan `None` dan `main()` tidak menjalankan apa pun.
Karena itu, tidak adanya error/output **bukan bukti berhasil**. Editor juga
dapat menandai return type fungsi pencarian yang belum lengkap; ini diharapkan.
Jangan hubungkan starter yang belum selesai ke VS Code.

**Jika `pass` sudah diganti oleh Copilot pada demo sebelumnya**, itu hasil
latihan yang valid, bukan kesalahan. Simpan salinannya jika masih dibutuhkan.
Untuk memulai sesi baru, kembalikan **hanya isi tiga fungsi latihan** menjadi
`pass` mengikuti template di bawah. Pertahankan import, dekorator, signature,
dan pemanggilan `main()`. Jangan mengubah file solusi atau data Markdown.

Template ini menggambarkan **kondisi awal sebelum dilengkapi Copilot**,
bukan server yang sudah siap dijalankan:

```python
"""Latihan melengkapi server MCP MyCorp-Auth dengan Copilot."""

import argparse
import json
import logging
from pathlib import Path
import re

from mcp.server.fastmcp import FastMCP


mcp = FastMCP("authDocs")
DOCS_DIR = Path(__file__).resolve().parent.parent / "mycorp-auth-docs"


@mcp.tool()
def search_auth_docs(
    query: str, limit: int = 5
) -> dict[str, list[dict[str, str]]]:
    """Cari frasa literal dalam dokumentasi autentikasi MyCorp-Auth.

    Pencarian tidak membedakan huruf besar/kecil dan mencakup subfolder.
    Gunakan kata/frasa seperti token, JWT, LDAP, atau refresh.
    limit membatasi jumlah paragraf, bukan jumlah dokumen.
    """
    # LANGKAH 1: Lengkapi pencarian sesuai prompt pada bagian 3B.
    pass


def run_server() -> None:
    # LANGKAH 2: Jalankan server MCP stdio sesuai prompt pada bagian 3B.
    pass


def main() -> None:
    # LANGKAH 3: Pisahkan mode test dan server sesuai prompt bagian 3B.
    pass


if __name__ == "__main__":
    main()
```

### 3B. Ganti setiap `pass` melalui Copilot

1. Buka [mcp_auth_docs_starter.py](mcp_auth_docs_starter.py). Jangan sertakan
   file solusi ke konteks Copilot jika ingin menunjukkan proses menghasilkan
   kode dari instruksi.
2. Pilih `pass` pada `search_auth_docs`, lalu tekan **Ctrl+I** untuk Inline
   Chat. Gunakan prompt **LANGKAH 1** di bawah. Tinjau hasil sebelum
   menerima: query literal, validasi input, UTF-8, subfolder, dan format hasil
   harus sesuai. Jangan sekadar menerima karena kodenya terlihat meyakinkan.
3. Lakukan hal yang sama untuk `run_server` (**LANGKAH 2**).
   Tekankan bahwa SDK menangani protokol; transport harus `stdio`.
4. Lengkapi `main` (**LANGKAH 3**) agar mode `test` terpisah dari mode server.
5. Simpan dan pastikan ketiga `pass` sudah diganti. Jika Copilot menghasilkan
   Flask atau endpoint `/authdoc`, minta perbaikan: ini server MCP stdio,
   bukan REST API.

Contoh prompt pembuka untuk Inline Chat:

```text
Lengkapi hanya blok pass yang saya pilih berdasarkan komentar LANGKAH
di atasnya. Gunakan API mcp.server.fastmcp dari SDK MCP v1 yang sudah
diimpor. Pertahankan signature dan struktur file. Jangan mengubah dokumen
atau file solusi, jangan menambah dependency, dan jelaskan hasil perubahan.
```

Tambahkan instruksi berikut sesuai blok yang dipilih. Komentar pada file
latihan juga dapat digunakan sebagai panduan.

**LANGKAH 1 - fungsi `search_auth_docs`:**

```text
Lengkapi search_auth_docs. Strip query dan tolak query kosong dengan
ValueError. limit harus 1 sampai 20. Pastikan DOCS_DIR adalah direktori;
jika tidak ada, naikkan FileNotFoundError. Cari *.md secara rekursif
dan terurut, baca dengan UTF-8, lalu pisahkan paragraf pada baris kosong
memakai pola r"\n\s*\n". Cocokkan query sebagai frasa literal memakai
casefold(), bukan sebagai regex. Kembalikan {"matches": [...]} dengan
setiap item berisi file relatif terhadap DOCS_DIR dan excerpt paragraf
yang sudah di-strip. Batasi jumlah paragraf sesuai limit.
Jika tidak ada kecocokan, kembalikan {"matches": []}.
Jangan sembunyikan error pembacaan file atau print ke stdout.
```

**LANGKAH 2 - fungsi `run_server`:**

```text
Lengkapi run_server. Gunakan logging level INFO dengan output ke stderr,
lalu jalankan objek mcp menggunakan transport stdio dari SDK MCP v1.
Jangan print ke stdout, jangan memakai Flask atau membuka port HTTP,
dan jangan menulis parser JSON-RPC sendiri.
```

**LANGKAH 3 - fungsi `main`:**

```text
Lengkapi main dengan argparse. Argumen posisi mode opsional hanya menerima
test, --query default token, dan --limit integer default 5.
Dalam mode test, panggil search_auth_docs dan tampilkan JSON indent=2,
ensure_ascii=True. Tangani hanya OSError, UnicodeError, dan ValueError
pada mode test dengan parser.exit(1, pesan error di stderr).
Tanpa mode, panggil run_server. Jangan menjalankan test dan transport
MCP secara bersamaan. Gunakan import yang sudah tersedia.
```

### 3C. Review hasil Copilot sebelum dijalankan

Setelah menerima saran, isi fungsi pada file latihan sudah berupa implementasi,
**bukan `pass` lagi**. Dokumentasi sengaja tetap menampilkan template awal
agar dapat digunakan ulang pada sesi berikutnya.

| Bagian | Yang harus diperiksa |
|---|---|
| `search_auth_docs` | Mengembalikan objek `matches`, bukan `None`; query literal dan batas hasil benar |
| `run_server` | Menggunakan transport `stdio`, tanpa output biasa ke stdout |
| `main` | Mode `test` mencetak hasil lalu selesai; tanpa mode menjalankan server |
| Registrasi tool | `@mcp.tool()` tetap terpasang pada fungsi pencarian |
| Data dan dependency | Tetap memakai folder data yang sama dan SDK MCP v1, tanpa Flask |

Hasil generasi tidak harus identik dengan solusi trainer. Yang penting
perilakunya memenuhi kontrak dan pengujian pada langkah 4. Jika ada bagian
yang tidak sesuai, pilih bagian tersebut lalu minta Copilot memperbaikinya.

### Penjelasan komponen yang dipertahankan atau dihasilkan

| Potongan | Fungsi |
|---|---|
| `FastMCP("authDocs")` | Membuat server dengan nama `authDocs` |
| `@mcp.tool()` | Mendaftarkan fungsi sebagai tool yang dapat ditemukan client |
| Type hints dan docstring | Membantu SDK membuat skema parameter dan deskripsi tool |
| `Path(__file__).resolve().parent.parent` | Menuju folder induk modul untuk memakai data yang sama, bukan bergantung pada folder terminal |
| `rglob("*.md")` | Menemukan Markdown, termasuk di subfolder `misc` |
| `encoding="utf-8"` | Membaca karakter pada dokumen dengan encoding yang jelas |
| `re.split(...)` | Memisahkan isi menjadi paragraf berdasarkan baris kosong |
| `casefold()` dan operator `in` | Pencarian frasa literal tanpa membedakan huruf besar/kecil |
| `{"matches": [...]}` | Hasil terstruktur berisi file dan kutipan |
| `mcp.run(transport="stdio")` | Menjalankan komunikasi MCP melalui stdin/stdout |

SDK mengubah hasil menjadi balasan tool MCP. Jika pencarian gagal karena
file tidak dapat dibaca atau input tidak valid, pemanggilan tool menjadi
error, bukan hasil sukses palsu. Tidak ada kecocokan adalah kondisi normal:
hasilnya `{"matches": []}`.

**Batas pencarian:** ini bukan pencarian semantik dan bukan mesin tanya jawab.
Query `token` cocok dengan paragraf yang mengandung kata tersebut.
Query panjang seperti `Bagaimana cara kerja seluruh alur token?` mungkin tidak
cocok secara literal. Copilot perlu memilih kata kunci yang tepat.
Hasil diurutkan berdasarkan file, bukan peringkat relevansi.

## 4. Uji pencarian dan jalankan server

### Uji cepat tanpa koneksi MCP

Setelah ketiga `pass` selesai dilengkapi, uji **file latihan hasil peserta**.
Implementasi `main` harus mendukung argumen `test`:

```powershell
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test
```

Contoh variasi:

```powershell
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test --query token --limit 2
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test --query "401 Unauthorized" --limit 3
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test --query refresh --limit 5
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test --query "frasa-tidak-ada-xyz"
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py test --query token --limit 0
```

Hasil yang wajib diperiksa:

| Percobaan | Hasil yang diharapkan |
|---|---|
| `token`, limit 2 | JSON `matches` berisi tepat 2 kutipan dari data latihan |
| `401 Unauthorized` | Ada kutipan dari `troubleshooting.md` |
| `refresh` | Ada kutipan terkait refresh token |
| Frasa yang tidak ada | `{"matches": []}`, bukan `None` atau error |
| Limit 0 | Pesan error di stderr dan exit code bukan 0; periksa `$LASTEXITCODE` segera setelah perintah |

Bentuk hasil:

```json
{
  "matches": [
    {
      "file": "token_flow.md",
      "excerpt": "...kutipan paragraf dari dokumen..."
    }
  ]
}
```

Ini ilustrasi format, bukan output persis. Jumlah dan urutan kutipan mengikuti
data serta `limit`. Satu file dapat menghasilkan beberapa kutipan.

Jika sudah mengaktifkan environment dan berada di folder `mcp-auth-docs-id`, perintah
ringkas `python3 mcp_auth_docs_starter.py test` juga dapat digunakan **asalkan `python3`
benar-benar menunjuk ke environment yang berisi SDK**. Untuk menghindari
perbedaan interpreter di Windows, utamakan perintah ber-path `.venv` di atas.

> Mode `test` hanya menguji fungsi pencarian. Itu belum membuktikan koneksi
> MCP ke Copilot berhasil. Pembuktiannya ada di langkah 6.

### Opsional: jalankan mode server secara manual

Langkah ini hanya untuk memahami perilaku stdio. **Lewati untuk demo Copilot**;
gunakan Start di VS Code pada langkah 5.

```powershell
.\.venv\Scripts\python.exe .\mcp_auth_docs_starter.py
```

Terminal akan menunggu masukan MCP. **Tidak muncul halaman web bukan berarti
gagal.** Jangan mengetik pertanyaan biasa ke terminal; server mengharapkan
pesan protokol dari MCP client.

Tekan **Ctrl+C** untuk berhenti. Pada langkah berikutnya, VS Code yang
menjalankan server sehingga Anda tidak perlu membiarkan terminal ini terbuka.
Pesan `KeyboardInterrupt` setelah Ctrl+C adalah akibat penghentian manual,
bukan bukti bahwa pencarian atau protokol MCP rusak. Proses yang dijalankan
di terminal tidak otomatis terhubung ke Copilot karena stdin/stdout-nya
terhubung ke terminal tersebut.

## 5. Deploy lokal: hubungkan server ke VS Code

Dalam latihan ini, **deploy** berarti menempatkan program, dependency,
dan konfigurasi agar VS Code dapat menjalankannya. Tidak perlu Azure,
Docker, domain, atau membuka port jaringan.

**Pilih satu konfigurasi sesuai folder paling atas Explorer:**

| Workspace VS Code | Konfigurasi yang digunakan |
|---|---|
| `fundamental`, seperti pada demo yang sudah berhasil | Konfigurasi workspace saat ini pada bagian 5B |
| `mcp-auth-docs-id` sebagai workspace tersendiri | Konfigurasi bawaan modul pada bagian 5A |
| Folder lain | Konfigurasi di folder workspace tersebut dengan kedua path disesuaikan |

VS Code membaca konfigurasi workspace yang sedang dibuka, bukan otomatis
semua `.vscode` di subfolder. Membuka script atau mengganti folder terminal
saja tidak mendaftarkan server ke workspace.

### 5A. Jika membuka folder modul sebagai workspace

Konfigurasi [.vscode/mcp.json](.vscode/mcp.json) sudah disertakan **di dalam
folder modul** dengan isi berikut. Jika menyiapkan latihan dari nol,
buat folder `.vscode` dan file `mcp.json` di dalam `mcp-auth-docs-id`,
bukan di root repository.

```json
{
  "servers": {
    "authDocs": {
      "type": "stdio",
      "command": "${workspaceFolder}\\.venv\\Scripts\\python.exe",
      "args": [
        "${workspaceFolder}\\mcp_auth_docs_starter.py"
      ]
    }
  }
}
```

Jika konfigurasi tersebut sudah ada, tambahkan entri `authDocs` ke objek
`servers` yang ada. **Jangan menimpa konfigurasi server lain.**

Perhatikan:

- `${workspaceFolder}` harus menunjuk ke folder `mcp-auth-docs-id`.
- `command` menunjuk ke Python environment yang sudah dipasangi SDK.
- `args` menunjuk ke script, **tanpa** argumen `test`.
- Script yang dihubungkan adalah **starter yang sudah dilengkapi**, bukan
  solusi trainer atau template yang masih memiliki `pass`. Jika konfigurasi
  sebelumnya memakai solusi, ubah `args` seperti contoh lalu restart server.
- `cwd` tidak diperlukan; lokasi dokumen ditentukan dari lokasi script.
- Format ini adalah format VS Code, bukan format `mcpServers` aplikasi lain.

Jika VS Code masih membuka `fundamental`, root repository, atau `demos`,
Anda bisa membuka folder modul seperti langkah 2, **atau tetap di jendela
sekarang** dengan alternatif berikut. VS Code tidak otomatis membaca
konfigurasi `.vscode` di subfolder workspace yang lebih besar.

### 5B. Cara sederhana: tetap memakai workspace yang sedang terbuka

Daftarkan server dalam `.vscode\mcp.json` **pada folder paling atas Explorer**,
bukan hanya pada subfolder modul. Environment dan script tetap berada di
folder modul; tidak perlu dipindahkan atau dijalankan manual.

Untuk workspace `fundamental` yang berisi repository latihan, gunakan:

```json
{
  "servers": {
    "authDocs": {
      "type": "stdio",
      "command": "${workspaceFolder}\\copilot-fundamentals-training\\demos\\copilot-techniques\\mcp-auth-docs-id\\.venv\\Scripts\\python.exe",
      "args": [
        "${workspaceFolder}\\copilot-fundamentals-training\\demos\\copilot-techniques\\mcp-auth-docs-id\\mcp_auth_docs_starter.py"
      ]
    }
  }
}
```

Pada komputer demo, konfigurasi ini sudah dibuat pada
`C:\clients\Organization\demo\fundamental\.vscode\mcp.json` dan berhasil digunakan.
Saat menyiapkan di komputer client, buat atau gabungkan entri tersebut ke
konfigurasi workspace mereka, lalu sesuaikan path dengan struktur foldernya.
Environment tetap berada di modul, bukan di root workspace.

Jika konfigurasi sudah berisi server lain, gabungkan entri `authDocs` ke
objek `servers`; jangan menimpa entri lain. Jika folder workspace berbeda,
sesuaikan kedua path. Contoh ini menggantikan konfigurasi workspace modul
untuk jendela tersebut; tidak perlu menambahkan server kedua.

Setelah disimpan, buka konfigurasi tersebut dan klik **Start** di atas
`authDocs` jika tombol tersedia, atau gunakan **MCP: List Servers**.
VS Code akan menjalankan Python dan menghubungkannya ke client MCP sendiri.
Lanjutkan pengujian chat di bawah, tanpa membuka jendela baru.

Jika konfigurasi MCP lama masih tersimpan pada scope workspace/global lain,
hentikan entri lama melalui **MCP: List Servers** dan gunakan konfigurasi modul
ini. Hindari menjalankan dua entri `authDocs` untuk demo yang sama.

### Start server dan gunakan dari chat

1. Buka konfigurasi MCP untuk workspace Anda. Klik **Start** di atas
   `authDocs` jika tombol tersedia. Alternatifnya, tekan **Ctrl+Shift+P**,
   jalankan **MCP: List Servers**, pilih **authDocs**, lalu **Start**.
   Tinjau dan setujui permintaan trust jika konfigurasi sudah Anda periksa.
2. Jika server tidak muncul, pastikan konfigurasi berada di folder workspace
   yang benar. Pada tampilan yang menyediakan **Show locally configured
   servers...**, periksa juga daftar tersebut. Jika gagal start, buka
   **Show Output** dari pengelolaan server MCP.
3. Buka Copilot Chat dan gunakan mode yang mendukung pemanggilan tool,
   misalnya **Agent** pada antarmuka yang menyediakannya.
4. Kirim prompt eksplisit pada langkah 6. Jika diminta persetujuan pemanggilan
   tool, periksa lalu setujui. Buka detail pemanggilan untuk melihat hasilnya.

**Tidak melihat tombol Configure Tools? Tidak perlu berhenti di sini.**
Pada tampilan demo, tombol itu tidak terlihat, tetapi tool sudah tersedia
dan berhasil dipanggil dari sesi chat setelah server terhubung.
Jika tool sudah tersedia di sesi, tidak perlu mencari tombol tambahan.

Jika tool belum tersedia dan antarmuka Anda menyediakan **Configure Tools**,
cari `authDocs` atau `search_auth_docs` lalu aktifkan. Pada versi/harness
lain, pengaturannya dapat berada di **Chat: Open Customizations > Tools**,
jika menu tersebut tersedia. Jangan menganggap ikon atau menu yang sama
pasti ada pada setiap versi VS Code.

**Server harus berjalan, tetapi VS Code yang menjalankannya.** Tidak perlu
menjalankan `python mcp_auth_docs_starter.py` lagi di terminal. Jika kode
diubah, pilih **Restart** pada server sebelum mencoba ulang.

Nama menu dapat berbeda antarversi VS Code. **MCP: Add Server > Command
(stdio)** juga bisa digunakan sebagai alternatif konfigurasi melalui wizard.
Pilih interpreter dan script yang sama dengan contoh di atas.

## 6. Bertanya melalui Copilot dan memeriksa hasil MCP

### Contoh yang sudah berhasil dicoba pada sesi demo

Setelah server terhubung, pertanyaan berikut berhasil dijawab dengan
pemanggilan tool **`authDocs-search_auth_docs`**:

```text
@mcp_auth_docs.py Jelaskan alur token MyCorp-Auth dalam 4 langkah.
@mcp_auth_docs.py Mengapa saya mendapat 401 Unauthorized?
```

Dalam antarmuka yang mendukungnya, sertakan file melalui pemilih konteks.
Penyebutan file membantu memberi konteks, tetapi **bukan command yang
menghubungkan atau menjalankan MCP**. Nama file pada pesan juga bukan
penentu script server yang dijalankan: konfigurasi pada langkah 5 tetap
menjalankan `mcp_auth_docs_starter.py` hasil peserta.

Hasil demo yang diharapkan:

| Pertanyaan | Pencarian tool yang relevan | Ringkasan hasil |
|---|---|---|
| Alur token | Query `JWT`, limit 10 | Login, validasi LDAP dan penerbitan JWT, pemakaian bearer token, lalu refresh |
| Error 401 | Query `401 Unauthorized`, limit 5 | Dokumentasi menyebut perbedaan waktu client/server dan sinkronisasi NTP sebagai kemungkinan penyebab |

Untuk alur token, sumber utamanya
[token_flow.md](../mycorp-auth-docs/token_flow.md) dan
[overview.md](../mycorp-auth-docs/overview.md).
Untuk error 401, sumbernya
[troubleshooting.md](../mycorp-auth-docs/troubleshooting.md) dan
[support.md](../mycorp-auth-docs/misc/support.md).
Hasil pencarian dokumentasi bukan diagnosis pasti atas aplikasi client;
log dan respons aplikasi tetap diperlukan untuk memastikan penyebabnya.

### Contoh bergaya modul lama

Untuk menjaga contoh latihan tetap familiar:

```text
@authDocs What is the token flow?
@authDocs How do I troubleshoot authentication errors?
@authDocs Explain the authentication overview
```

Versi bahasa Indonesia:

```text
@authDocs Jelaskan alur token MyCorp-Auth dalam 4 langkah.
@authDocs Mengapa saya mendapat 401 Unauthorized?
@authDocs Bagaimana cara memperoleh refresh token?
```

**Penting:** nama MCP server tidak otomatis menjadi chat participant `@authDocs`.
Penulisan `@authDocs` di atas adalah contoh gaya instruksi/penyebutan nama,
bukan command MCP bawaan yang dijamin dikenali VS Code. Membuat `@authDocs`
sebagai participant sungguhan membutuhkan integrasi/extension tersendiri;
itu di luar latihan ini.

Hal yang sama berlaku untuk `@author` atau `@mcp_auth_docs.py`: mengetik `@`
diikuti nama tidak otomatis menjalankan server. Menyertakan file sebagai
konteks pun berbeda dengan memanggil tool MCP.

### Cara yang lebih dapat diandalkan

Jika ingin memastikan Copilot memakai MCP, bukan hanya membaca file konteks,
gunakan prompt berikut. Tidak perlu menyertakan file atau mengetik `@`:

```text
Gunakan tool search_auth_docs dari server MCP authDocs.
Cari query "JWT" dengan limit 10.
Jelaskan alur token dalam 4 langkah dari kutipan yang dikembalikan.
Sebutkan nama file sumber.
Jangan gunakan pembacaan file workspace sebagai pengganti tool MCP.
Jika tool tidak tersedia, katakan bahwa koneksi MCP belum siap.
```

Latihan troubleshooting:

```text
Gunakan tool search_auth_docs dari authDocs dengan query "401 Unauthorized"
dan limit 3. Jelaskan penyebab dan penanganannya dari hasil tool.
```

Latihan refresh token:

```text
Gunakan tool search_auth_docs dari authDocs dengan query "refresh"
dan limit 10. Ringkas panduannya. Jika sumber berbeda mengenai endpoint
atau detail token, sebutkan perbedaannya dan jangan mengarang.
```

### Bukti bahwa MCP benar-benar bekerja

Jangan hanya melihat jawaban yang terdengar benar. Copilot bisa membaca
file workspace memakai tool lain.

Periksa tiga hal:

1. Server `authDocs` berjalan dan tool `search_auth_docs` terdaftar.
2. Percakapan memperlihatkan **pemanggilan tool milik server authDocs**.
   Buka detailnya: ada parameter `query`/`limit` dan hasil `matches`.
3. Jawaban menggunakan kutipan dari hasil tool tersebut.

Contoh alur yang diharapkan:

```text
Tool: search_auth_docs (server: authDocs)
Input: {"query": "JWT", "limit": 10}
Hasil: {"matches": [{"file": "...", "excerpt": "..."}]}
Jawaban: ringkasan berdasarkan hasil tersebut.
```

Tampilan nama tool dapat diberi awalan server oleh client. Yang penting
tool berasal dari server yang benar. Pada sesi demo, namanya ditampilkan
sebagai **`authDocs-search_auth_docs`**. Munculnya tool tersebut dengan
kutipan yang sesuai adalah bukti yang lebih kuat daripada jawaban saja.

## 7. Bagaimana dengan deploy untuk tim atau server jarak jauh?

### Dibagikan ke tim

- Bagikan script, dokumen, dan konfigurasi MCP melalui repository.
- Setiap anggota tim masuk ke folder modul di terminal, membuat `.venv`
  di dalamnya, dan memasang dependency sendiri. Konfigurasi MCP ditempatkan
  pada workspace masing-masing sesuai pilihan langkah 5.
- Jangan bagikan `.venv`, credential, token asli, atau dokumen yang tidak
  diizinkan untuk dibagikan.
- Setiap anggota meninjau trust dan mengaktifkan tool di VS Code masing-masing.
- Untuk distribusi produksi yang berulang, gunakan dependency lock yang telah
  diuji tim; batas versi pada latihan ini bukan lock seluruh dependency.

### Dijalankan di mesin lain

Stdio pada panduan ini adalah transport lokal, bukan URL layanan publik.
Untuk server bersama melalui jaringan diperlukan rancangan berbeda:
transport **Streamable HTTP**, endpoint MCP yang benar, TLS,
autentikasi/otorisasi, pembatasan akses dokumen, logging, dan pengelolaan proses.
Mengganti konfigurasi ke `http://localhost:8000/authdoc` tidak cukup.

Panduan ini sengaja menyelesaikan **deployment lokal end-to-end**, bukan
deployment layanan publik. Jangan mengekspos dokumentasi internal ke internet
hanya untuk mencoba MCP.

## 8. Troubleshooting

| Gejala | Penyebab yang mungkin | Langkah perbaikan |
|---|---|---|
| `.\.venv\Scripts\python.exe` tidak dikenali | Terminal berada di folder lain atau `.venv` belum dibuat di modul | Masuk ke `mcp-auth-docs-id`; jalankan `python3 -m venv .venv` dan instalasi langkah 2. Pastikan `Test-Path .\.venv\Scripts\python.exe` menghasilkan `True` |
| `No module named 'flask'` | Script Flask lama masih digunakan | Jalankan script di subfolder `mcp-auth-docs-id`, bukan script pada folder induk |
| `No module named 'mcp'` | SDK belum terpasang di interpreter yang dijalankan | Jalankan instalasi dengan `.\.venv\Scripts\python.exe -m pip install "mcp>=1.27,<2"` |
| `No module named 'sse_starlette'` atau dependency MCP lain | Instalasi SDK di environment tidak lengkap | Pasang ulang SDK di `.venv` dengan `.\.venv\Scripts\python.exe -m pip install --force-reinstall "mcp>=1.27,<2"` |
| Import `FastMCP` gagal setelah memasang SDK v2 | Versi SDK dan contoh kode berbeda | Gunakan versi v1 sesuai perintah instalasi modul ini |
| `authDocs` tidak ada di MCP: List Servers | Konfigurasi hanya ada di subfolder, bukan workspace aktif | Gunakan konfigurasi 5A atau 5B sesuai folder paling atas Explorer; mengganti lokasi terminal saja tidak cukup |
| Tombol Configure Tools tidak terlihat | Antarmuka atau harness berbeda | Jika tool sudah tersedia, langsung gunakan prompt eksplisit langkah 6; jika belum, periksa status server dan pengaturan tools yang tersedia pada versi tersebut |
| Server menunggu tanpa output | Normal untuk stdio | Hubungkan melalui MCP client; bukan melalui browser |
| Script sudah menyala di terminal tetapi tool tidak muncul di chat | Proses manual belum terhubung ke MCP client | Hentikan dengan Ctrl+C, lalu Start dari konfigurasi MCP di VS Code |
| Mode `test` tidak mencetak JSON atau proses langsung selesai | `main` atau fungsi lain masih berisi `pass` | Lengkapi ketiga blok sesuai langkah 3; exit code 0 saja tidak membuktikan berhasil |
| Mode `test` malah menjalankan Flask | Kode lama masih dijalankan | Periksa isi dan path script yang dijalankan |
| `Folder dokumentasi tidak ada` | Folder data tidak ada di folder induk modul | Pertahankan struktur direktori langkah 2 |
| `matches` kosong | Frasa tidak ada persis dalam paragraf | Coba `token`, `JWT`, `LDAP`, atau `refresh` |
| Jawaban token tidak lengkap | Batas hasil habis pada file lebih awal | Naikkan `limit`, maksimal 20, atau gunakan frasa lebih spesifik |
| `@authDocs` tidak dikenali | MCP server bukan participant `@` | Pilih tool, lalu minta penggunaan `search_auth_docs` secara eksplisit |
| Tool tidak muncul | Konfigurasi, proses, izin organisasi, atau pilihan tools belum benar | Periksa path workspace, output server, trust, dan Configure Tools |
| Copilot menjawab tanpa tool MCP | Memakai pengetahuan/model atau pembacaan file workspace | Gunakan prompt eksplisit langkah 6 dan periksa detail pemanggilan tool |
| Error parsing/protokol | Ada output biasa tercampur stdout | Hapus `print()` pada jalur server; kirim log ke stderr |

Jika mengubah kode server, lakukan **Restart** pada `authDocs` melalui
pengelolaan MCP agar proses menggunakan versi terbaru. Dokumen dicari ulang
pada setiap pemanggilan tool; perubahan Markdown tidak memerlukan index ulang.

## 9. Checklist keberhasilan

- [ ] Terminal berada di `mcp-auth-docs-id` untuk instalasi dan pengujian.
- [ ] Konfigurasi MCP berada di workspace aktif, sesuai pilihan 5A atau 5B.
- [ ] SDK MCP v1 terpasang di `.venv` dalam folder modul.
- [ ] Script yang digunakan berasal dari subfolder `mcp-auth-docs-id`, bukan script Flask lama.
- [ ] Ketiga blok `pass` pada file latihan telah dilengkapi dan direview.
- [ ] Mode `test` mengembalikan kutipan dari data yang sama.
- [ ] Server `authDocs` berjalan melalui stdin/stdout.
- [ ] Konfigurasi MCP menjalankan `mcp_auth_docs_starter.py` hasil peserta, bukan solusi trainer.
- [ ] `search_auth_docs` tersedia pada sesi chat; izin pengguna diberikan jika diminta.
- [ ] Ada bukti pemanggilan tool MCP di percakapan.
- [ ] Jawaban menyebut sumber, serta tidak mengarang bagian yang disamarkan.

**Inti latihan:** server menyediakan pencarian, MCP menstandarkan cara
memanggil pencarian tersebut, dan Copilot menjelaskan hasilnya.

## 10. Batas privasi dan referensi

Dokumen dibaca di komputer lokal oleh server. Namun, **kutipan hasil tool
dapat masuk ke konteks model dan diproses oleh layanan AI sesuai konfigurasi
serta kebijakan organisasi**. "Server lokal" bukan berarti seluruh percakapan
berjalan offline. Gunakan data contoh ini untuk latihan, bukan rahasia produksi.

Referensi resmi:

- [Pengantar MCP](https://modelcontextprotocol.io/docs/getting-started/intro)
- [Python SDK MCP](https://github.com/modelcontextprotocol/python-sdk)
- [Dokumentasi Python SDK jalur v1](https://github.com/modelcontextprotocol/python-sdk/tree/v1.x)
- [Menambahkan server MCP di VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
