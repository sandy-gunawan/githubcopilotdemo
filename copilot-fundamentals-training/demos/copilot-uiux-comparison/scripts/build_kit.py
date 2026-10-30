"""Embed public task materials in the single HTML guide and package the kit."""

import hashlib
import json
from pathlib import Path
import re
import zipfile

from verify_setup import verify

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "uiux-comparison-kit.zip"
EXCLUDED = {".git", "node_modules", "__pycache__", ".tsupgrader", "output"}


def included(path):
    relative = path.relative_to(ROOT)
    return path.is_file() and not path.is_symlink() and path != ARCHIVE and not EXCLUDED.intersection(relative.parts)


def main():
    verified = verify()
    text = lambda path: path.read_bytes().decode("utf-8")
    prompt = text(ROOT / "materials" / "prompt.md")
    sources = json.loads((ROOT / "skill-sources.json").read_text(encoding="utf-8"))
    content = {
        "version": 2,
        "prompt": prompt,
        "promptHash": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "commits": {item["Name"]: item["Revision"] for item in sources},
        "cases": {
            "dashboard": {
                "title": "Dashboard antrean keluhan",
                "kicker": "Untuk petugas Operations",
                "description": "Layar kerja untuk mencari kasus yang perlu ditangani, bukan halaman promosi.",
                "skill": "UI UX Pro Max",
                "license": "MIT",
                "optimized": {
                    "direction": "Triage-first: kasus aktif yang mencapai SLA menjadi fokus, bukan empat kartu KPI yang sama dominannya.",
                    "checks": [
                        "Eskalasi SLA paling mudah ditemukan, tetapi seluruh kasus tetap tersedia tanpa filter awal tersembunyi.",
                        "Antrean padat dan terbaca; filter, jumlah hasil, KPI, dan ringkasan kanal tetap konsisten.",
                        "Detail menjaga konteks antrean; keyboard, Escape, pengembalian fokus, dan tampilan 390px diuji.",
                        "Ada bukti pencarian lokal upstream, rencana layout/token, kritik screenshot, dan tabel keputusan ke elemen UI; pemeriksaan yang belum dijalankan disebutkan."
                    ]
                },
                "baseline": "Data utuh: 12 kasus, 9 aktif, 4 perlu eskalasi SLA, 3 selesai. Tepat 120 menit sudah memicu eskalasi untuk kasus aktif.",
                "tasks": ["Temukan kasus aktif yang mencapai 120 menit.", "Gabungkan pencarian, status, prioritas, dan kanal.", "Buka detail dan tangani kondisi tanpa hasil."],
                "acceptance": [
                    "Tanpa filter: KPI 12 total / 9 aktif / 4 perlu eskalasi / 3 selesai.",
                    "Kasus DEMO-UI-C006 aktif tepat 120 menit harus ditandai; kasus selesai C011 tidak termasuk eskalasi aktif.",
                    "Filter prioritas Tinggi: 4 kasus, semuanya aktif dan perlu eskalasi. Ringkasan kanal ikut filter.",
                    "Cari kode yang tidak ada: daftar kosong, KPI mengikuti 0 hasil, tersedia reset.",
                    "Buka detail dengan keyboard; Escape menutup dan fokus kembali ke pemicu.",
                    "Ulangi pada 390px dan 1440px. Lihat apakah tugas lebih mudah, bukan hanya lebih dekoratif."
                ]
            },
            "landing": {
                "title": "Landing page Tabungan Target Nusa",
                "kicker": "Untuk pengunjung yang ingin memahami produk contoh",
                "description": "Halaman produk rekaan dengan biaya terlihat, kalkulator target, FAQ, dan form simulasi.",
                "skill": "Frontend Design",
                "license": "Apache-2.0",
                "optimized": {
                    "direction": "Planner-first: kalkulator dan perjalanan target menjadi pusat halaman, bukan sekadar hero dengan kartu saldo dekoratif.",
                    "checks": [
                        "Komposisi, tipografi sistem, dan hierarki mendukung tindakan merencanakan, bukan hanya mengganti warna.",
                        "Visual bulanan berasal dari rumus yang sama, menjelaskan pembulatan bila perlu, dan tidak mengarang bunga atau hasil finansial.",
                        "Biaya mudah ditemukan; input invalid tidak meninggalkan angka atau visual sukses yang kedaluwarsa.",
                        "Ada rencana layout/token, kritik screenshot 390px/1440px, dan tabel keputusan ke elemen UI; pemeriksaan yang belum dijalankan disebutkan."
                    ]
                },
                "baseline": "Contoh: target Rp12 juta, awal Rp0, 12 bulan = Rp1 juta setoran pokok per bulan. Biaya admin contoh Rp5.000/bulan belum termasuk hasil kalkulator.",
                "tasks": ["Pahami manfaat, biaya, dan langkah penggunaan.", "Coba kalkulator target beserta validasi input.", "Buka FAQ dan kirim form simulasi tanpa data nyata."],
                "acceptance": [
                    "CTA utama menuju kalkulator; biaya Rp5.000/bulan dan setoran awal contoh Rp100.000 tetap terlihat.",
                    "Target Rp12.000.000 / awal Rp0 / 12 bulan menghasilkan Rp1.000.000 per bulan.",
                    "Bulan 0, pecahan, atau lebih dari 60 ditolak. Input tidak valid tidak boleh menampilkan hasil sukses.",
                    "Tabungan awal >= target menghasilkan Rp0, dengan penjelasan bahwa target sudah tercapai.",
                    "FAQ bisa dipakai dengan keyboard. Form menolak nama <2 karakter atau checkbox yang belum dicentang.",
                    "Konfirmasi form menyebut simulasi: tidak ada data dikirim atau rekening dibuka. Tidak ada klaim hasil finansial/regulator."
                ]
            }
        }
    }
    for case in content["cases"]:
        content["cases"][case]["brief"] = text(ROOT / "materials" / case / "brief.md")
        content["cases"][case]["data"] = text(ROOT / "materials" / case / "data.js")
        workflow = verified["skills"][case]["optimized"]
        content["cases"][case]["optimized"].update({key: workflow[key] for key in ("name", "sha256")})
        content["cases"][case]["optimized"].update({
            "prompt": text(ROOT / "workspaces" / case / "C" / "prompt.md"),
            "promptHash": verified["prompts"][case]["C"],
        })
    payload = json.dumps(content, ensure_ascii=True, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    replacement = '<!-- LAB_DATA_BEGIN -->\n<script id="lab-data" type="application/json">' + payload + '</script>\n<!-- LAB_DATA_END -->'
    html, count = re.subn(r"<!-- LAB_DATA_BEGIN -->.*?<!-- LAB_DATA_END -->", lambda match: replacement, html, flags=re.DOTALL)
    if count != 1:
        raise ValueError("Expected exactly one embedded lab-data block.")
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    paths = [path for path in sorted(ROOT.rglob("*")) if included(path)]
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, "uiux-skill-lab/" + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(ARCHIVE) as archive:
        if archive.testzip():
            raise ValueError("Archive verification failed.")
    print(f"Built one self-contained index.html and {ARCHIVE.name} ({len(paths)} files).")
    print("Six workspaces included: A without skills, B with upstream, C with unchanged upstream plus local workflow.")
    print("A/B share one prompt; C copy buttons use the prompt from the selected C workspace.")
    print("Upstream licenses are included. No generated A/B/C results are bundled.")


if __name__ == "__main__":
    main()
