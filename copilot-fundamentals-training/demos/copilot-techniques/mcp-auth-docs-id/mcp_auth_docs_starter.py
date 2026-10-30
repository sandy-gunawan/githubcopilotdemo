"""Latihan melengkapi server MCP MyCorp-Auth dengan Copilot.

Lengkapi ketiga blok pass sebelum menjalankan atau menghubungkan ke VS Code.
Referensi trainer: mcp_auth_docs.py pada folder yang sama.
"""

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
    # LANGKAH 1 - Pilih pass, lalu minta Copilot:
    # "Lengkapi search_auth_docs. Strip query; tolak query kosong dan limit
    # di luar 1..20 dengan ValueError. Tolak DOCS_DIR yang tidak ada dengan
    # FileNotFoundError. Cari *.md secara rekursif dan terurut, baca UTF-8,
    # pisahkan paragraf dengan r'\n\s*\n'. Cocokkan frasa literal memakai
    # casefold, bukan regex query. Kembalikan {'matches': [...]} dengan file
    # relatif terhadap DOCS_DIR dan excerpt. Maksimal limit paragraf;
    # jika tidak cocok, matches kosong. Jangan sembunyikan error baca file."
    query = query.strip()
    if not query:
        raise ValueError("Query tidak boleh kosong")
    if not (1 <= limit <= 20):
        raise ValueError("Limit harus antara 1 dan 20")
    if not DOCS_DIR.exists():
        raise FileNotFoundError(f"DIRECTORY {DOCS_DIR} tidak ditemukan")

    matches = []
    for md_file in sorted(DOCS_DIR.rglob("*.md")):
        rel_path = md_file.relative_to(DOCS_DIR)
        try:
            content = md_file.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as e:
            raise e
        paragraphs = re.split(r'\n\s*\n', content)
        for para in paragraphs:
            if query.casefold() in para.casefold():
                matches.append({"file": str(rel_path), "excerpt": para})
                if len(matches) >= limit:
                    break
        if len(matches) >= limit:
            break
    return {"matches": matches}


def run_server() -> None:
    # LANGKAH 2 - Pilih pass, lalu minta Copilot:
    # "Konfigurasikan logging level INFO ke stderr, kemudian jalankan mcp
    # menggunakan transport stdio. Jangan print ke stdout, jangan pakai
    # Flask, jangan buka port HTTP, dan jangan menulis protokol manual."
    import logging
    logging.basicConfig(level=logging.INFO)
    mcp.run(transport="stdio")


def main() -> None:
    # LANGKAH 3 - Pilih pass, lalu minta Copilot:
    # "Gunakan argparse. Argumen posisi mode opsional hanya menerima test,
    # --query default token, --limit integer default 5. Dalam mode test,
    # panggil search_auth_docs dan print JSON indent=2, ensure_ascii=True.
    # Tangani hanya OSError, UnicodeError, ValueError pada mode test dengan
    # parser.exit(1, pesan error ke stderr). Tanpa mode, panggil run_server.
    # Jangan jalankan test dan transport MCP secara bersamaan."
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", choices=["test"])
    parser.add_argument("--query", default="token")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    if args.mode == "test":
        try:
            result = search_auth_docs(args.query, args.limit)
            print(json.dumps(result, indent=2, ensure_ascii=True))
        except (OSError, UnicodeError, ValueError) as e:
            parser.exit(1, f"{e}\n")
    else:
        run_server()


if __name__ == "__main__":
    main()
