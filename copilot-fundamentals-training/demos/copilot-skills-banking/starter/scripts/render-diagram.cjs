"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");

function renderDiagram(input, output) {
  if (!input || !output || !/\.svg$/i.test(input) || !/\.png$/i.test(output)) {
    throw new Error("Usage: node scripts\\render-diagram.cjs input.svg output.png");
  }
  if (fs.existsSync(output)) {
    throw new Error(`Output already exists: ${output}. Choose a new filename.`);
  }
  const svg = fs.readFileSync(input, "utf8");
  if (/<(?:script|foreignObject)\b|(?:href|src)\s*=\s*["'](?:https?:|\/\/|file:)|<!ENTITY|@import|url\s*\(\s*["']?(?:https?:|\/\/|file:)/i.test(svg)) {
    throw new Error("Use a self-contained SVG without scripts or external resources.");
  }
  const renderer = new Resvg(svg, {
    background: "#ffffff",
    fitTo: { mode: "width", value: 2400 },
    font: { defaultFontFamily: "Arial", loadSystemFonts: true },
  });
  const png = renderer.render().asPng();
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, png, { flag: "wx" });
  return output;
}

if (require.main === module) {
  try {
    console.log(`PNG created: ${renderDiagram(process.argv[2], process.argv[3])}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { renderDiagram };
