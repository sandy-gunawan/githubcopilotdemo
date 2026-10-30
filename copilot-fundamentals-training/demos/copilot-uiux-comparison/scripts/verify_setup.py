"""Verify A/B/C isolation and skill provenance, not model invocation or quality."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
COMMON = ("prompt.md", ".github/copilot-instructions.md", ".vscode/settings.json", "input/brief.md", "input/data.js")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def skill_files(folder):
    files = {}
    for path in folder.rglob("*"):
        if path.is_symlink():
            raise ValueError(f"Skill resources must not be symlinks: {path}")
        if path.is_file() and "__pycache__" not in path.parts and path.suffix not in {".pyc", ".pyo"}:
            files[path.relative_to(folder).as_posix()] = path
    return files


def expected_source(case, relative):
    mapping = {
        "prompt.md": ROOT / "materials" / "prompt.md",
        ".github/copilot-instructions.md": ROOT / "materials" / "copilot-instructions.md",
        ".vscode/settings.json": ROOT / "materials" / "workspace-settings.json",
        "input/brief.md": ROOT / "materials" / case / "brief.md",
        "input/data.js": ROOT / "materials" / case / "data.js",
    }
    return mapping[relative]


def controlled_files(workspace):
    result = set()
    for path in workspace.rglob("*"):
        if not path.is_file():
            continue
        parts = path.relative_to(workspace).parts
        if parts[0] == "output" or "__pycache__" in parts:
            continue
        if parts[:2] == (".github", "skills"):
            continue
        result.add(path.relative_to(workspace).as_posix())
    return result


def verify(run_search=False):
    result = {"scope": "files-and-resources-only-not-model-invocation", "conditions": ["A", "B", "C"], "pairs": {}, "prompts": {}, "skills": {}}
    sources = json.loads((ROOT / "skill-sources.json").read_text(encoding="utf-8"))
    for case in ("dashboard", "landing"):
        a = ROOT / "workspaces" / case / "A"
        b = ROOT / "workspaces" / case / "B"
        c = ROOT / "workspaces" / case / "C"
        if any(set(COMMON) != controlled_files(workspace) for workspace in (a, b, c)):
            raise ValueError(f"{case}: unexpected task files. Keep only controlled material outside output and the B/C skill folders.")
        if list(a.rglob("SKILL.md")):
            raise ValueError(f"{case}/A contains a skill. Baseline is not clean.")
        for workspace in (b, c):
            if list(workspace.glob(".claude/skills/*/SKILL.md")) or list(workspace.glob(".agents/skills/*/SKILL.md")):
                raise ValueError(f"{case}/{workspace.name} contains an unexpected extra skill location.")
        hashes = {}
        for relative in COMMON:
            paths = [a / relative, b / relative, expected_source(case, relative)]
            if relative != "prompt.md":
                paths.insert(2, c / relative)
            if not all(path.is_file() for path in paths):
                raise ValueError(f"{case}: missing {relative}.")
            values = [digest(path) for path in paths]
            if len(set(values)) != 1:
                conditions = "A/B/source" if relative == "prompt.md" else "A/B/C/source"
                raise ValueError(f"{case}: {conditions} differ for {relative}.")
            hashes[relative] = values[0]
        result["pairs"][case] = hashes
        c_prompt = c / "prompt.md"
        if not c_prompt.is_file() or not c_prompt.read_text(encoding="utf-8").strip():
            raise ValueError(f"{case}: C prompt must not be empty.")
        result["prompts"][case] = {"A": hashes["prompt.md"], "B": hashes["prompt.md"], "C": digest(c_prompt)}
        package = next(item for item in sources if item["Case"] == case)
        folder = b / ".github" / "skills" / package["Name"]
        installed = list((b / ".github" / "skills").glob("*/SKILL.md"))
        if installed != [folder / "SKILL.md"]:
            raise ValueError(f"{case}/B must have exactly {package['Name']}.")
        optimized = package["OptimizedSkill"]
        c_folder = c / ".github" / "skills" / package["Name"]
        c_workflow = c / ".github" / "skills" / optimized / "SKILL.md"
        expected_skills = {c_folder / "SKILL.md", c_workflow}
        if set((c / ".github" / "skills").glob("*/SKILL.md")) != expected_skills:
            raise ValueError(f"{case}/C must have upstream {package['Name']} and companion {optimized}.")
        local_source = ROOT / "materials" / "skills" / optimized / "SKILL.md"
        if not local_source.is_file() or digest(c_workflow) != digest(local_source):
            raise ValueError(f"{case}/C companion differs from its local source.")
        workflow_text = c_workflow.read_text(encoding="utf-8")
        if not workflow_text.startswith("---\n") or f"\nname: {optimized}\n" not in workflow_text or "\ndescription: " not in workflow_text:
            raise ValueError(f"{case}/C companion has invalid discovery frontmatter.")
        original_files, copied_files = skill_files(folder), skill_files(c_folder)
        if original_files.keys() != copied_files.keys() or any(
                digest(path) != digest(copied_files[relative]) for relative, path in original_files.items()):
            raise ValueError(f"{case}/C upstream resources differ from B; do not modify the pinned package.")
        skill = (folder / "SKILL.md").read_text(encoding="utf-8")
        if f"github-pinned: {package['Revision']}" not in skill or f"github-repo: https://github.com/{package['Repository']}" not in skill:
            raise ValueError(f"{case}: skill provenance does not match the pinned source.")
        license_file = folder / ("LICENSE" if case == "dashboard" else "LICENSE.txt")
        if not license_file.is_file():
            raise ValueError(f"{case}: license file missing.")
        if case == "dashboard":
            for resource in ("scripts/search.py", "scripts/core.py", "scripts/design_system.py", "scripts/reasoning_contract.py", "data/styles.csv", "data/colors.csv", "data/products.csv", "references/quick-reference.md"):
                if not (folder / resource).is_file():
                    raise ValueError(f"UI UX Pro Max resource missing: {resource}")
            if run_search:
                search = subprocess.run(
                    [sys.executable, str(folder / "scripts" / "search.py"), "data-dense dashboard",
                     "--domain", "style", "--json"],
                    cwd=a, text=True, encoding="utf-8", capture_output=True, timeout=30, check=False,
                )
                if search.returncode or not search.stdout.strip():
                    raise ValueError(f"Skill search failed: {search.stderr or search.stdout}")
                matches = json.loads(search.stdout)
                if matches.get("domain") != "style" or not matches.get("results") or matches["results"][0].get("Style ID") != "data-dense-dashboard":
                    raise ValueError("Skill search did not return the expected dashboard style.")
                result["search"] = {"query": "data-dense dashboard", "domain": "style", "output": matches}
        result["skills"][case] = {
            "name": package["Name"], "revision": package["Revision"],
            "license": package["LicenseName"], "path": str(folder.relative_to(ROOT)),
            "optimized": {"name": optimized, "sha256": digest(local_source), "path": str(c_workflow.relative_to(ROOT))},
        }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--search", action="store_true", help="Run the reviewed local public-data search; no network or private input.")
    args = parser.parse_args()
    result = verify(args.search)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for case in result["pairs"]:
            mode = "task-directed" if result["prompts"][case]["C"] != result["prompts"][case]["A"] else "the same as A/B"
            print(f"[OK] {case}: A/B prompt is byte-identical; C prompt is {mode}.")
            print(f"[OK] {case}: A/B/C inputs and shared instructions are byte-identical.")
            print(f"[OK] {case}: A has no workspace skill; B has only {result['skills'][case]['name']}.")
            print(f"[OK] {case}: C has the same upstream plus {result['skills'][case]['optimized']['name']}.")
        if args.search:
            print("[OK] UI UX Pro Max local search returned the verified data-dense-dashboard style.")
        print("Still check personal/plugin skills and actual skill invocation in Copilot.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"Verification failed: {error}", file=sys.stderr)
        sys.exit(1)
