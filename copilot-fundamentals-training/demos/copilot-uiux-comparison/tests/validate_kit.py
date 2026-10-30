"""Check A/B/C parity, setup guards, fixture arithmetic, guide and ZIP."""

import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from unittest.mock import patch
from urllib.parse import urlsplit
import zipfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from verify_setup import COMMON, skill_files, verify


def require(condition, message):
    if not condition:
        raise AssertionError(message)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.local_links, self.remote_runtime = [], [], []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if "id" in attributes:
            self.ids.append(attributes["id"])
        if tag in {"script", "link", "img"} and ("src" in attributes or "href" in attributes):
            self.remote_runtime.append(attributes.get("src", attributes.get("href")))
        if tag == "a" and "href" in attributes:
            url = attributes["href"]
            if not urlsplit(url).scheme:
                self.local_links.append(url)
        if tag == "iframe":
            require(attributes.get("sandbox") == "", "Preview must start with scripts disabled and no same-origin access")


def check_setup_guards():
    with tempfile.TemporaryDirectory(prefix="uiux-c-verify-") as directory:
        root = Path(directory)
        shutil.copytree(ROOT / "materials", root / "materials")
        shutil.copytree(ROOT / "workspaces", root / "workspaces", ignore=shutil.ignore_patterns("output", "__pycache__"))
        shutil.copy2(ROOT / "skill-sources.json", root / "skill-sources.json")
        with patch("verify_setup.ROOT", root):
            verify()
            mutations = (
                ("workspaces/landing/C/input/data.js", "A/B/C/source differ"),
                ("workspaces/landing/C/.github/skills/frontend-design/SKILL.md", "upstream resources differ"),
                ("workspaces/landing/C/.github/skills/nusa-landing-design/SKILL.md", "companion differs"),
                ("workspaces/dashboard/C/.github/skills/ui-ux-pro-max/data/colors.csv", "upstream resources differ"),
            )
            for relative, expected_error in mutations:
                path = root / relative
                original = path.read_bytes()
                path.write_bytes(original + b"\nchanged for validation\n")
                try:
                    verify()
                except ValueError as error:
                    require(expected_error in str(error), f"Wrong setup rejection: {error}")
                else:
                    raise AssertionError(f"Setup accepted an altered C file: {relative}")
                finally:
                    path.write_bytes(original)
            prompt = root / "workspaces" / "landing" / "C" / "prompt.md"
            original = prompt.read_bytes()
            try:
                prompt.write_bytes(original + b"\nAdditional C design direction.\n")
                changed = verify()
                require(changed["prompts"]["landing"]["C"] != changed["prompts"]["landing"]["A"], "Directed C prompt must be tracked separately")
                prompt.write_bytes(b" \n")
                try:
                    verify()
                except ValueError as error:
                    require("C prompt must not be empty" in str(error), f"Wrong empty-prompt rejection: {error}")
                else:
                    raise AssertionError("Setup accepted an empty C prompt")
            finally:
                prompt.write_bytes(original)


def main():
    result = verify()
    require(result["conditions"] == ["A", "B", "C"], "All three conditions must be verified")
    check_setup_guards()
    require(len({result["pairs"][case]["prompt.md"] for case in result["pairs"]}) == 1, "A/B must share one base prompt across use cases")
    data = (ROOT / "materials" / "dashboard" / "data.js").read_text(encoding="utf-8")
    cases = json.loads(data.removeprefix("window.DEMO_DATA = ").strip().removesuffix(";"))["cases"]
    active = [case for case in cases if case["status"] != "Selesai"]
    late = [case for case in active if case["age_minutes"] >= 120]
    require((len(cases), len(active), len(late), len(cases) - len(active)) == (12, 9, 4, 3), "Dashboard metrics incorrect")
    require("DEMO-UI-C006" in {case["id"] for case in late}, "Exact 120-minute case was missed")
    require("DEMO-UI-C011" not in {case["id"] for case in late}, "Closed case was counted as active")
    require({case["id"] for case in late} == {case["id"] for case in cases if case["priority"] == "Tinggi"}, "Documented priority-filter example is wrong")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parser = Page()
    parser.feed(html)
    require(len(parser.ids) == len(set(parser.ids)), "Duplicate guide IDs")
    require(not parser.remote_runtime, "The guide must be one self-contained HTML file")
    for link in parser.local_links:
        if link.startswith("#"):
            require(link[1:] in parser.ids, f"Broken anchor: {link}")
        else:
            require((ROOT / link).exists(), f"Broken local download: {link}")
    payload = re.search(r'<script id="lab-data" type="application/json">(.*?)</script>', html, re.DOTALL)
    require(payload is not None, "Embedded task payload missing")
    lab = json.loads(payload[1])
    require(lab["version"] == 2, "A/B/C payload version missing")
    prompt = (ROOT / "materials" / "prompt.md").read_bytes().decode("utf-8")
    require(lab["prompt"] == prompt, "HTML A/B copy prompt differs from base prompt")
    require(lab["promptHash"] == hashlib.sha256(prompt.encode("utf-8")).hexdigest(), "Displayed prompt hash wrong")
    for case in ("dashboard", "landing"):
        for field, filename in (("brief", "brief.md"), ("data", "data.js")):
            require(lab["cases"][case][field] == (ROOT / "materials" / case / filename).read_bytes().decode("utf-8"), f"HTML material out of sync: {case}/{field}")
        optimized = lab["cases"][case]["optimized"]
        c_prompt = (ROOT / "workspaces" / case / "C" / "prompt.md").read_bytes()
        require(c_prompt.decode("utf-8") != prompt, f"C must use its directed prompt, not the A/B prompt: {case}")
        require(optimized["prompt"] == c_prompt.decode("utf-8"), f"HTML C copy prompt out of sync: {case}")
        require(optimized["promptHash"] == hashlib.sha256(c_prompt).hexdigest(), f"Wrong C prompt hash: {case}")
        require(result["prompts"][case] == {"A": lab["promptHash"], "B": lab["promptHash"], "C": optimized["promptHash"]}, f"Incorrect prompt provenance: {case}")
        require(optimized["name"] == result["skills"][case]["optimized"]["name"], f"Wrong C workflow: {case}")
        require(optimized["sha256"] == result["skills"][case]["optimized"]["sha256"], f"Stale C workflow hash: {case}")
        require(optimized["direction"] and len(optimized["checks"]) == 4, f"Missing C design evidence checks: {case}")
    for identifier in ("c-options", "folder-c", "command-c", "include-c", "file-c", "frame-c", "c-acceptance-list", "copy-c-prompt", "c-prompt-text", "download-c-prompt"):
        require(identifier in parser.ids, f"Missing C guide surface: {identifier}")
    controller = re.search(r"<script>\s*(.*?)</script>", html, re.DOTALL)
    require(controller is not None, "Guide controller missing")
    syntax = subprocess.run(["node", "--check"], input=controller[1], text=True, encoding="utf-8", capture_output=True, check=False)
    require(syntax.returncode == 0, syntax.stderr)
    with zipfile.ZipFile(ROOT / "uiux-comparison-kit.zip") as archive:
        require(archive.testzip() is None, "Corrupt kit")
        for name in archive.namelist():
            parts = Path(name).parts
            require(".." not in parts, "Unsafe archive member")
            require(not {"node_modules", ".git", "output", "__pycache__", ".tsupgrader"}.intersection(parts), f"Private/generated data bundled: {name}")
            require(not re.search(r"/workspaces/(dashboard|landing)/A/.*SKILL\.md$", name), "Skill contaminated A in ZIP")
        for relative in (
            "index.html", "materials/prompt.md", "scripts/verify_setup.py",
            "workspaces/dashboard/B/.github/skills/ui-ux-pro-max/SKILL.md",
            "workspaces/dashboard/B/.github/skills/ui-ux-pro-max/LICENSE",
            "workspaces/dashboard/B/.github/skills/ui-ux-pro-max/scripts/search.py",
            "workspaces/dashboard/B/.github/skills/ui-ux-pro-max/data/colors.csv",
            "workspaces/landing/B/.github/skills/frontend-design/SKILL.md",
            "workspaces/landing/B/.github/skills/frontend-design/LICENSE.txt",
            "materials/skills/nusa-operations-design/SKILL.md",
            "materials/skills/nusa-landing-design/SKILL.md",
        ):
            require(archive.read("uiux-skill-lab/" + relative) == (ROOT / relative).read_bytes(), f"Archive stale: {relative}")
        for case in ("dashboard", "landing"):
            for condition in ("A", "B", "C"):
                for relative in COMMON:
                    path = ROOT / "workspaces" / case / condition / relative
                    require(archive.read("uiux-skill-lab/" + path.relative_to(ROOT).as_posix()) == path.read_bytes(), f"Workspace archive stale: {path}")
            for condition in ("B", "C"):
                for path in skill_files(ROOT / "workspaces" / case / condition / ".github" / "skills").values():
                    require(archive.read("uiux-skill-lab/" + path.relative_to(ROOT).as_posix()) == path.read_bytes(), f"Skill archive stale: {path}")
        count = len(archive.namelist())
    print("PASS: six workspaces, identical A/B prompts, exact per-workspace C prompts, and B/C skill provenance.")
    print("PASS: setup rejects changed C inputs, workflow and upstream resources.")
    print("PASS: dashboard arithmetic and exact boundary cases.")
    print("PASS: self-contained HTML, local links, embedded data, and JavaScript syntax.")
    print(f"PASS: ZIP with {count} files, complete B/C resources and licenses, no generated A/B/C outputs.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        sys.exit(1)
