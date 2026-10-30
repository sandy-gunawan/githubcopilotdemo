"""Bundle public workshop files; never include installed tools or participant work."""

import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "banking-skills-workshop.zip"
EXCLUDED_DIRS = {"node_modules", ".git", ".venv", "__pycache__", "output", ".tsupgrader"}
DOWNLOADED_SKILLS = {
    "meeting-minutes",
    "incident-postmortem",
    "documentation-writer",
    "draw-io-diagram-generator",
    "architecture-blueprint-generator",
    "create-architectural-decision-record",
    "md-to-docx",
}


def included(path):
    relative = path.relative_to(ROOT)
    if path == ARCHIVE or any(part in EXCLUDED_DIRS for part in relative.parts):
        return False
    if relative.parts[:3] in {("starter", "docs", "adr"), ("starter", "docs", "postmortems")}:
        return False
    if ".github" in relative.parts and "skills" in relative.parts:
        if any(part in DOWNLOADED_SKILLS for part in relative.parts):
            return False
    return path.is_file() and not path.is_symlink()


def main():
    files = {}
    for folder in ("starter", "examples"):
        for path in sorted((ROOT / folder).rglob("*")):
            if included(path) and path.suffix in {".md", ".csv", ".yaml", ".json", ".ps1", ".cjs"}:
                if path.name != "package-lock.json":
                    files[path.relative_to(ROOT).as_posix()] = path.read_bytes().decode("utf-8")
    content = {"version": 1, "files": files}
    (ROOT / "workshop-content.js").write_text(
        '"use strict";\nwindow.WORKSHOP_CONTENT = ' +
        json.dumps(content, ensure_ascii=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    paths = [path for path in sorted(ROOT.rglob("*")) if included(path)]
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, "banking-skills-workshop/" + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(ARCHIVE) as archive:
        bad_file = archive.testzip()
        if bad_file:
            raise RuntimeError(f"Corrupt archive member: {bad_file}")
    print(f"Bundled {len(files)} text resources and {len(paths)} files: {ARCHIVE.name}")


if __name__ == "__main__":
    main()
