"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const skills = [
  "meeting-minutes", "incident-postmortem",
  "documentation-writer", "draw-io-diagram-generator", "architecture-blueprint-generator",
  "create-architectural-decision-record", "md-to-docx", "banking-executive-deck",
];
let failures = 0;
function report(ok, message) {
  console.log(`${ok ? "[OK]" : "[BELUM SIAP]"} ${message}`);
  if (!ok) failures++;
}

report(Number(process.versions.node.split(".")[0]) >= 22, "Node.js 22+");
for (const name of skills) {
  const file = path.join(root, ".github", "skills", name, "SKILL.md");
  const exists = fs.existsSync(file);
  const content = exists ? fs.readFileSync(file, "utf8") : "";
  const foundName = content.match(/^name:\s*['"]?([a-z0-9-]+)['"]?\s*$/m);
  report(exists && foundName && foundName[1] === name, `Skill ${name}`);
}

for (const [label, moduleName, directory] of [
  ["Renderer diagram", "@resvg/resvg-js", root],
  ["Konverter Word / docx", "docx", path.join(root, ".github", "skills", "md-to-docx", "scripts")],
  ["Konverter Word / marked", "marked", path.join(root, ".github", "skills", "md-to-docx", "scripts")],
]) {
  try {
    require.resolve(moduleName, { paths: [directory] });
    report(true, label);
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    report(false, `${label}: dependency belum terpasang`);
  }
}

const python = path.join(root, ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");
if (!fs.existsSync(python)) {
  report(false, "Python lokal .venv belum dibuat");
} else {
  const result = spawnSync(python, ["-c", "import sys, pptx; assert sys.version_info >= (3, 10); assert pptx.__version__ == '1.0.2'"], {
    encoding: "utf8", windowsHide: true, timeout: 15000,
  });
  report(!result.error && result.status === 0, "Python 3.10+ dan generator PowerPoint");
  if (result.error || result.status !== 0) console.error(result.error ? result.error.message : result.stderr.trim());
}

for (const name of ["business-policy.md", "meeting-notes.md", "meeting-transcript.md", "incident-chronology.md", "complaints.csv", "system-landscape.md", "openapi.yaml", "deck-brief.md", "deck-spec.json", "diagram-layouts.json", "incident-timeline-layout.json"]) {
  report(fs.existsSync(path.join(root, "input", name)), `Bahan dummy: ${name}`);
}

if (failures) {
  console.error(`\nMasih ada ${failures} pemeriksaan yang belum siap. Ikuti bagian Persiapan di HTML.`);
  process.exitCode = 1;
} else {
  console.log("\nFile skill, bahan, dan tool lokal sudah siap. Buka folder starter di VS Code, pilih Agent, lalu salin prompt demo.");
  console.log("Cek ini tidak menguji login Copilot, izin tools, atau apakah skill dipanggil oleh model.");
}
