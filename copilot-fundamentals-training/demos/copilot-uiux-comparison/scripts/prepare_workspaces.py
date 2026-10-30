"""Prepare A/B/C inputs and C companion skills without overwriting work."""

import json
from pathlib import Path
import sys

from verify_setup import skill_files

ROOT = Path(__file__).resolve().parent.parent


def put(path, data):
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"Existing material differs: {path}. Review it before preparing again.")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def main():
    for case in ("dashboard", "landing"):
        for condition in ("A", "B", "C"):
            workspace = ROOT / "workspaces" / case / condition
            sources = {
                "prompt.md": ROOT / "materials" / "prompt.md",
                ".github/copilot-instructions.md": ROOT / "materials" / "copilot-instructions.md",
                ".vscode/settings.json": ROOT / "materials" / "workspace-settings.json",
                "input/brief.md": ROOT / "materials" / case / "brief.md",
                "input/data.js": ROOT / "materials" / case / "data.js",
            }
            for relative, source in sources.items():
                destination = workspace / relative
                if condition == "C" and relative == "prompt.md" and destination.is_file():
                    if not destination.read_text(encoding="utf-8").strip():
                        raise ValueError(f"Existing C prompt is empty: {destination}")
                    continue
                put(destination, source.read_bytes())
            print(f"Prepared {case}/{condition}: controlled inputs; existing C prompt and output left untouched.")
    packages = json.loads((ROOT / "skill-sources.json").read_text(encoding="utf-8"))
    for package in packages:
        case, name = package["Case"], package["Name"]
        optimized = package["OptimizedSkill"]
        source = ROOT / "materials" / "skills" / optimized
        destination = ROOT / "workspaces" / case / "C" / ".github" / "skills"
        workflow = source / "SKILL.md"
        if not workflow.is_file():
            raise ValueError(f"Missing C workflow source: {workflow}")
        put(destination / optimized / "SKILL.md", workflow.read_bytes())
        upstream = ROOT / "workspaces" / case / "B" / ".github" / "skills" / name
        if not upstream.is_dir():
            print(f"{case}/C: run install-skills.ps1 to install the missing upstream {name}.")
            continue
        content = (upstream / "SKILL.md").read_text(encoding="utf-8")
        if (f"github-pinned: {package['Revision']}" not in content
                or f"github-repo: https://github.com/{package['Repository']}" not in content):
            raise ValueError(f"Review upstream provenance before copying: {upstream}")
        for relative, path in skill_files(upstream).items():
            put(destination / name / relative, path.read_bytes())
        print(f"Prepared {case}/C: unchanged upstream {name} plus local {optimized}.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"Workspace preparation failed: {error}", file=sys.stderr)
        sys.exit(1)
