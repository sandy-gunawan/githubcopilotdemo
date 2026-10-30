# Banking Skills Lab

This workspace contains only synthetic training fixtures for the fictional
Bank Nusa Demo. Respond in Indonesian unless the participant requests otherwise.
Use everyday Indonesian for documents and summaries. Explain necessary technical
terms briefly instead of assuming the audience knows them.

The `prompts/demo-*.md` files are independent quick demos. Complete the requested
files and run the local render/export tools, not just an outline or instructions
for the presenter. Use a new output folder when a previous run already exists.
Quick-demo document outlines are supplied and approved in the prompt itself.
Still ask if a genuine missing requirement prevents a correct result, and honor
normal tool approvals. Never claim a file was created without checking it exists.

- Read `input/` as the source of truth. This is a declared simulation, not an
  implementation discovered from application code or a real bank policy.
- Mark generated documents, diagrams, and slides SINTETIS / BUKAN PRODUKSI.
- Save participant work under `output/`, except ADRs in `docs/adr/` and incident
  reports in `docs/postmortems/` as required by those skills. Keep `input/` unchanged. Ask before overwriting
  existing participant outputs in either location.
- Use local files only. Do not query banking systems, publish issues, send
  communications, deploy resources, or create remote repositories.
- Do not invent owners, deadlines, regulatory requirements, financial benefits,
  root causes, or implemented components. Use TBD for unknown information.
- Keep as-is facts separate from proposed to-be changes. ADRs start as Proposed.
- Preserve threshold operators and timezones exactly. Workshop SLAs are fictional.
- Recalculate metrics from `input/complaints.csv`; cite numerator, denominator,
  unit, and source. Do not substitute averages or projections for observed facts.
- Ask for human approval of document outlines and important design decisions.
- Open and visually inspect output files. A successful export is not proof of
  factual accuracy, readable diagrams, or correct pagination.
