---
name: banking-executive-deck
description: 'Create a synthetic banking executive PowerPoint or PPTX from reviewed workshop documents. Use for an executive brief, presentation, or slide deck with business process and architecture diagrams, evidence, and human approval.'
license: MIT
---

# Banking Executive Deck

This is an original workshop skill, not an Awesome Copilot or Microsoft product.
Use the neutral Bank Nusa Demo identity. Never imply affiliation with a real bank.

## Workflow

1. Read the participant's deck brief and reviewed source documents. If they do
   not exist, stop; do not silently substitute reference answers.
2. Confirm audience, purpose, baseline version, and requested decision. Keep
   as-is facts separate from proposed improvements.
3. Read [spec guide](./assets/spec-guide.md). Produce a JSON specification with
   exactly eight slides, at most five bullets per slide, sources, and notes.
4. Include business-process and as-is architecture diagrams as native diagram
   objects. Do not replace diagrams with prose or decorative placeholders.
5. Recalculate metrics from the supplied CSV. Show denominators and units.
   Never invent financial benefit, compliance status, owners, or due dates.
6. Use [generator](./scripts/build-deck.cjs). Resolve its path from this skill's
   installed directory, not from an assumed global location. In the provided
   starter workspace:

   ```powershell
   npm ci
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   node .github\skills\banking-executive-deck\scripts\build-deck.cjs --spec output\deck-spec.json --out output\executive-brief.pptx
   ```

   The wrapper validates the spec and invokes the bundled
   [Python renderer](./scripts/build_deck.py) using the starter's `.venv`.
   Python 3.10+ and `python-pptx==1.0.2` are required.

7. Missing dependencies are an explicit stop condition. Ask before installing
   if the environment requires approval; never install globally.
8. The generator refuses to overwrite an existing output. Choose a new path.
9. Report structural checks separately from visual review. Ask the participant
   to open the deck, inspect every slide, and check labels, clipping, notes,
   sources, and the SINTETIS footer. Do not claim visual inspection from a
   successful write alone.

## Limitations

- 16:9, neutral navy/teal theme; not a licensed corporate branding template.
- Supported content is documented in the spec guide. No SmartArt, animations,
  automatic layout repair, or automatic factual verification.
- Text, shapes, and tables are editable PowerPoint objects. Complex design may
  still need manual adjustment. PNG/SVG rendering belongs to the diagram lab.
- No remote services, email, publishing, or real banking access.
