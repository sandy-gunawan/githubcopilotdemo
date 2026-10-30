"""Server MCP lokal untuk dokumentasi MyCorp-Auth."""

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
    query = query.strip()
    if not query:
        raise ValueError("query tidak boleh kosong")
    if not 1 <= limit <= 20:
        raise ValueError("limit harus antara 1 dan 20")
    if not DOCS_DIR.is_dir():
        raise FileNotFoundError(f"Folder dokumentasi tidak ada: {DOCS_DIR}")

    matches: list[dict[str, str]] = []
    for path in sorted(DOCS_DIR.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        for paragraph in re.split(r"\n\s*\n", text):
            if query.casefold() in paragraph.casefold():
                matches.append({
                    "file": str(path.relative_to(DOCS_DIR)),
                    "excerpt": paragraph.strip(),
                })
                if len(matches) >= limit:
                    return {"matches": matches}
    return {"matches": matches}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", nargs="?", choices=["test"])
    parser.add_argument("--query", default="token")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    if args.mode == "test":
        try:
            result = search_auth_docs(args.query, args.limit)
        except (OSError, UnicodeError, ValueError) as error:
            parser.exit(1, f"Pencarian gagal: {error}\n")
        print(json.dumps(result, ensure_ascii=True, indent=2))
    else:
        logging.basicConfig(level=logging.INFO)
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
