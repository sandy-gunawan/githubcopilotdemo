---
name: nusa-operations-design
description: 'Use when building the Bank Nusa Demo complaints dashboard from input/brief.md and input/data.js. Adds a triage-first design workflow, local UI UX Pro Max research, task-specific visual hierarchy, and evidence-based review for an offline single-file Operations interface.'
---

# Nusa Operations Design

This is the project-specific companion to UI UX Pro Max, not a replacement or
an edited upstream release. Read [UI UX Pro Max](../ui-ux-pro-max/SKILL.md) before
planning. Both skills are inside this workspace. The brief and fixture always
win over recommendations.

Use only this workspace. Do not inspect other runs, copy another result, edit
inputs/customizations, install packages, or fetch assets. Produce the requested
single `output/index.html`; keep the plan and review in chat, not extra documents.
Never claim this run is better than another run you have not independently tested.

## 1. Research, then make the task visible

Resolve the upstream search script from its installed directory. On Windows,
these are local searches with public design terms, not customer data:

```powershell
python .github\skills\ui-ux-pro-max\scripts\search.py "data-dense dashboard" --domain style --json
python .github\skills\ui-ux-pro-max\scripts\search.py "keyboard focus modal" --domain ux --json
```

Check domain, result identity, and suitability for an Operations queue. If a
result is empty or off-topic, retry once with a narrower query. Reject marketing
sections, Contact Sales, external fonts, and invented metrics. If Python or a
verified match is unavailable, state that explicitly and distinguish your own
reasoning from retrieved guidance; do not install anything or claim search ran.
If persisting upstream research, its output directory must be `output/`.

Before coding, show a compact plan in chat:

- Main job: find active cases at or beyond 120 minutes, filter, inspect detail.
- Compare two small ASCII layouts, then choose a triage-first workbench.
- Define 4-6 named color tokens, system-font roles, spacing, density, and focus.
- Explain how the leading alert, queue, filters, channel summary, and detail
  panel help that job. State which upstream recommendation you accepted/rejected.

## 2. Build an Operations workbench, not a bank landing page

Give the active SLA queue the strongest hierarchy. A compact, text-labelled
escalation summary should lead into the actual case list; supporting total,
active, and completed KPIs should not compete as four equally dominant cards.
Keep all cases available initially: no automatic filter hiding other cases.
An urgency-first order is allowed only on a derived copy of the fixture.

Use a restrained light work surface, dark ink, and a distinct warning treatment
with text such as "Perlu eskalasi". Color must not be the only signal. Use
tabular numerals for ages/counts, aligned rows, readable density, and visible
labels. Avoid oversized hero copy, promotional illustrations, decorative charts,
or identical rounded cards for every region.

Keep search and filters next to the queue. Show the current result count and
an obvious reset. Channel counts and every KPI must describe the filtered set,
including an empty set. Do not invent percentages or recompute ages from the
computer clock.

The detail panel should preserve queue context on desktop. On mobile, use a
readable drawer/dialog or equivalent; Escape and a close button must work and
focus must return to the triggering case. A modal must manage keyboard focus.
At 390px, contain any table scrolling inside the queue, not the whole page.

## 3. Critique and test before delivery

Review the first implementation against the plan, not against other runs.
If urgency still looks like a generic equal-card dashboard, revise hierarchy
and density before polishing decoration. If browser tools are available, inspect
screenshots at 1440px and 390px and make a focused improvement after critique.
Honor reduced motion; do not add animation to make the page look more advanced.

Check at least:

- Initial KPI: 12 total, 9 active, 4 requiring SLA escalation, 3 completed.
- Active C006 at exactly 120 minutes is included; completed C011 is excluded.
- Priority Tinggi gives 4 active/escalated cases and matching channel totals.
- Case-insensitive search combines with all filters using AND.
- No results gives zero KPIs, an explanation, and a functioning reset.
- Detail opens with keyboard; close/Escape restore focus.
- At both widths, labels, warnings, controls, and queue information remain usable.

Do not silently treat an unavailable browser as a passing visual check. Report
what actually ran, what failed, what was revised, and what remains unverified.

## 4. Make the contribution inspectable

In the final chat response, link the HTML and include a compact evidence table:
`C instruction | design decision | selector/location | check performed | result`.
Cover hierarchy, queue density, filters/empty state, detail focus, and mobile.
Reference actual screenshot observations when available, not invented scores.
This table explains implementation choices; it is not proof of skill invocation
or a guarantee of superiority. Invocation evidence remains the agent activity log.
