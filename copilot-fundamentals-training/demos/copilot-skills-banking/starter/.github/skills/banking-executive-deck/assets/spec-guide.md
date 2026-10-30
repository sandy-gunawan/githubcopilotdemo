# Deck specification v1

The root JSON has `title` (string), `synthetic: true`, `diagramFile` (a local
JSON path relative to the spec), and `slides` (exactly eight objects).
Use the supplied `input/deck-spec.json` as a complete training example.

Every slide has `kind`, `title` (max 78 characters), `sources` (1-4 short strings),
and `notes` (non-empty string). Sources identify local evidence, not proof of
regulatory compliance. All slides receive a synthetic footer.

| kind | Required fields | Limits |
|---|---|---|
| title | subtitle | 220 characters |
| bullets | bullets: string[] | 1-5 items, 155 characters each |
| metrics | metrics: [{value, label, detail}] | Exactly 3; value <= 16, label <= 48, detail <= 100 |
| diagram | diagramKey | Key in diagramFile |
| table | headers: string[], rows: string[][] | 2-4 columns, 1-5 rows, 130 characters per cell |

`diagramFile` is a JSON object keyed by diagram ID. Each diagram has:

- `title`, `description`, `width` (1200), `height` (470).
- `nodes`: 1-14 items with unique `id`, `x`, `y`, `w`, `h`, `lines` (1-4 short
  strings), optional `tone` (teal, mint, amber, navy, neutral), and optional
  `shape` (rect or decision).
- `edges`: items with `points` ([[x,y], ...], 2-8 points), optional `label`,
  optional `labelX`/`labelY`, `arrow: false` for plain lines, `dashed: true`
  for lifelines, and optional `from`/`to` referring to existing node IDs.
- Coordinates are within the 1200x470 canvas. Nodes must not overlap.
  Leave enough whitespace for edge labels. Keep node lines under 27 characters.
- The generator uses editable PowerPoint shapes, not a diagram screenshot.

CLI paths are resolved relative to the terminal's working directory; the
diagramFile path is resolved relative to the JSON spec's folder.

```powershell
node .github\skills\banking-executive-deck\scripts\build-deck.cjs --spec input\deck-spec.json --out output\example.pptx
```

The generator checks structure, bounds, and simple shape overlap. It cannot
prove that a process is correct or that all connectors are visually ideal.
Open the PPTX before accepting it.
