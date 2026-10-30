"""Verify deliverable files, not only successful generator exit codes."""

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def validate_pptx(path):
    with zipfile.ZipFile(path) as archive:
        check(archive.testzip() is None, "Corrupt PPTX ZIP")
        for content_type in ET.fromstring(archive.read("[Content_Types].xml")):
            if content_type.tag.endswith("Override"):
                part = content_type.attrib["PartName"].lstrip("/")
                check(part in archive.namelist(), f"Content type refers to missing PPTX part: {part}")
        slides = sorted(name for name in archive.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name))
        notes = [name for name in archive.namelist() if re.fullmatch(r"ppt/notesSlides/notesSlide\d+\.xml", name)]
        check(len(slides) == 8, f"Expected eight slides, got {len(slides)}")
        check(len(notes) == 8, "Missing speaker notes")
        for name in slides:
            tree = ET.fromstring(archive.read(name))
            text = " ".join(node.text or "" for node in tree.findall(".//a:t", NS))
            check("SINTETIS / BUKAN PRODUKSI" in text, f"Missing synthetic label: {name}")
            check("Sumber:" in text, f"Missing source: {name}")
            for geometry in tree.findall(".//a:prstGeom", NS):
                if geometry.attrib.get("prst") == "diamond":
                    check(not geometry.findall(".//a:gd", NS), "Diamond must not contain a roundRect radius adjustment")
        for number in (3, 4):
            tree = ET.fromstring(archive.read(f"ppt/slides/slide{number}.xml"))
            check(len(tree.findall(".//p:sp", NS)) >= 15, f"Slide {number} lacks native diagram shapes")
            check(len(tree.findall(".//a:ln", NS)) >= 12, f"Slide {number} lacks connectors")
        for name in notes:
            text = archive.read(name).decode("utf-8")
            check("SINTETIS" in text, f"Missing note content: {name}")
    print(f"PPTX OK: {path.name}, 8 slides, 8 notes, native diagram objects")


def validate_docx(path, expected_images):
    with zipfile.ZipFile(path) as archive:
        check(archive.testzip() is None, f"Corrupt DOCX: {path.name}")
        tree = ET.fromstring(archive.read("word/document.xml"))
        text = " ".join(node.text or "" for node in tree.findall(".//w:t", NS))
        images = [name for name in archive.namelist() if name.startswith("word/media/") and name.endswith(".png")]
        check(len(images) == expected_images, f"{path.name}: expected {expected_images} PNGs, got {len(images)}")
        check(len(tree.findall(".//a:blip", NS)) == expected_images, f"{path.name}: PNGs are not embedded in document body")
        check("Image not found" not in text, f"{path.name}: image placeholder present")
        check("SINTETIS" in text, f"{path.name}: missing synthetic label")
        for name in images:
            png = archive.read(name)
            check(png[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG: {name}")
    print(f"DOCX OK: {path.name}, {expected_images} embedded PNG(s)")


class WorkshopHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.resources = []
        self.prompts = []
        self.sections = []
        self.tabs = []
        self.skills = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if "data-file" in attrs:
            self.prompts.append(attrs["data-file"])
        if "data-skill" in attrs:
            self.skills.append(attrs["data-skill"])
        if tag == "section":
            self.sections.append(attrs["id"])
        if attrs.get("role") == "tab":
            self.tabs.append(attrs)
        if tag == "img" and attrs.get("src"):
            check(bool(attrs.get("alt")), "Missing useful image alt")
        if tag == "script" and "src" in attrs:
            self.resources.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.resources.append(attrs["href"])
        for name in ("href", "src"):
            if name in attrs:
                self.links.append(attrs[name])


def validate_html():
    parser = WorkshopHTML()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    check(len(parser.ids) == len(set(parser.ids)), "Duplicate HTML IDs")
    check(len(parser.sections) == 11, "Expected eleven navigable sections")
    check(len(parser.tabs) == 9, "Expected three tabs for each of three labs")
    for tab in parser.tabs:
        check(tab["aria-controls"] in parser.ids, "Tab target missing")
    for url in parser.links:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            continue
        if parts.path:
            check((ROOT / unquote(parts.path)).exists(), f"Broken local link: {url}")
        elif parts.fragment:
            check(parts.fragment in parser.ids, f"Broken section link: {url}")
    for url in parser.resources:
        check(not urlsplit(url).scheme, f"Unexpected CDN dependency: {url}")
    bundle = (ROOT / "workshop-content.js").read_text(encoding="utf-8")
    prefix = '"use strict";\nwindow.WORKSHOP_CONTENT = '
    check(bundle.startswith(prefix), "Unexpected content manifest shape")
    content = json.loads(bundle[len(prefix):].rstrip().removesuffix(";"))
    for name in parser.prompts:
        check(content["files"][name] == (ROOT / name).read_bytes().decode("utf-8"), f"Stale copy prompt: {name}")
    check(len(set(parser.prompts)) == 16, "Expected five quick demos, two operations inputs, and nine workshop resources")
    for name in ("demo-01-business.md", "demo-02-architecture.md", "demo-03-powerpoint.md", "demo-04-minutes.md", "demo-05-incident.md"):
        check("starter/prompts/" + name in parser.prompts, f"Missing copy-ready quick demo: {name}")
    print(f"HTML OK: 11 sections, 9 tabs, {len(parser.links)} local/external references")


def validate_skill_reference():
    parser = WorkshopHTML()
    parser.feed((ROOT / "skills.html").read_text(encoding="utf-8"))
    expected = {
        "meeting-minutes", "incident-postmortem", "documentation-writer",
        "draw-io-diagram-generator", "architecture-blueprint-generator",
        "create-architectural-decision-record", "md-to-docx", "banking-executive-deck",
    }
    check(len(parser.skills) == 8 and set(parser.skills) == expected, "Skill reference must describe all eight skills exactly once")
    check(len(parser.ids) == len(set(parser.ids)), "Duplicate skill reference IDs")
    check("install" in parser.ids and "install-title" in parser.ids, "Skill reference needs an installation section")
    for url in parser.links:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            continue
        if parts.path:
            check((ROOT / unquote(parts.path)).exists(), f"Broken skill reference link: {url}")
        elif parts.fragment:
            check(parts.fragment in parser.ids, f"Broken skill reference anchor: {url}")
    check(len([url for url in parser.links if url.startswith(
        "https://github.com/github/awesome-copilot/tree/0fe6545b950671641b2b14b44eb56678fea6c6b4/skills/"
    )]) == 7, "Skill reference must identify seven pinned community sources")
    print("SKILL REFERENCE OK: eight summaries, seven community sources, original skill linked locally")


def validate_diagrams():
    for name in ("business-process", "architecture-context", "architecture-containers", "sequence", "incident-timeline"):
        folder = ROOT / "examples" / "diagrams"
        ET.parse(folder / f"{name}.svg")
        tree = ET.parse(folder / f"{name}.drawio")
        cells = tree.findall(".//mxCell")
        ids = [cell.attrib["id"] for cell in cells]
        check(len(ids) == len(set(ids)) and "0" in ids and "1" in ids, f"Invalid draw.io IDs: {name}")
        for cell in cells:
            for ref in ("source", "target", "parent"):
                check(ref not in cell.attrib or cell.attrib[ref] in ids, f"Invalid draw.io {ref}: {name}")
        check((folder / f"{name}.png").read_bytes()[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid diagram PNG: {name}")
    print("DIAGRAMS OK: 5 SVG, 5 editable draw.io, 5 PNG")


def validate_archive():
    with zipfile.ZipFile(ROOT / "banking-skills-workshop.zip") as archive:
        check(archive.testzip() is None, "Corrupt workshop kit")
        names = archive.namelist()
        for name in names:
            parts = Path(name).parts
            check(not {"node_modules", ".git", ".venv", "output", ".tsupgrader"}.intersection(parts), f"Private/generated data bundled: {name}")
            check(".." not in parts, f"Unsafe archive path: {name}")
            check(name.startswith("banking-skills-workshop/"), f"Unexpected archive root: {name}")
            check("/starter/docs/adr/" not in name, f"Participant ADR was bundled: {name}")
            check("/starter/docs/postmortems/" not in name, f"Participant incident report was bundled: {name}")
        for relative in (
            "index.html", "skills.html", "app.js", "styles.css", "workshop-content.js",
            "starter/package-lock.json",
            "starter/.github/skills/banking-executive-deck/SKILL.md",
            "starter/prompts/06-powerpoint.md",
            "starter/prompts/demo-01-business.md", "starter/prompts/demo-02-architecture.md", "starter/prompts/demo-03-powerpoint.md",
            "starter/scripts/check-demo.cjs",
            "starter/prompts/demo-04-minutes.md", "starter/prompts/demo-05-incident.md",
            "starter/input/meeting-transcript.md", "starter/input/incident-chronology.md",
            "examples/meeting-minutes.docx", "examples/incident-postmortem.docx",
            "examples/business-process.docx", "examples/architecture-blueprint.docx", "examples/executive-brief.pptx",
        ):
            entry = "banking-skills-workshop/" + relative
            check(archive.read(entry) == (ROOT / relative).read_bytes(), f"Archive is stale: {relative}")
        check(not any("/skills/md-to-docx/" in name for name in names), "Downloaded community skill was bundled")
        for skill in ("meeting-minutes", "incident-postmortem"):
            check(not any(f"/skills/{skill}/" in name for name in names), f"Downloaded {skill} was bundled")
    print(f"ZIP OK: {len(names)} files, source and binary examples match disk")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pptx", type=Path)
    args = parser.parse_args()
    if args.pptx:
        validate_pptx(args.pptx)
        return
    validate_html()
    validate_skill_reference()
    validate_diagrams()
    validate_docx(ROOT / "examples" / "business-process.docx", 1)
    validate_docx(ROOT / "examples" / "architecture-blueprint.docx", 3)
    validate_docx(ROOT / "examples" / "meeting-minutes.docx", 0)
    validate_docx(ROOT / "examples" / "incident-postmortem.docx", 1)
    validate_pptx(ROOT / "examples" / "executive-brief.pptx")
    validate_archive()
    print("ALL WORKSHOP ARTIFACT CHECKS PASSED")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, ValueError, OSError, zipfile.BadZipFile, ET.ParseError) as error:
        print(f"VALIDATION FAILED: {error}", file=sys.stderr)
        sys.exit(1)
