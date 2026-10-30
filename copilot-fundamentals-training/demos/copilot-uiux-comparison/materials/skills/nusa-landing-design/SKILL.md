---
name: nusa-landing-design
description: 'Use when building the Tabungan Target Nusa landing page from input/brief.md and input/data.js. Adds a planner-first visual direction, deliberate offline typography, calculator-led storytelling, and evidence-based design review on top of the Frontend Design skill.'
---

# Nusa Landing Design

This is the project-specific companion to Frontend Design, not an edited
upstream release. Read [Frontend Design](../frontend-design/SKILL.md) before
planning. Both skills are inside this workspace. Preserve the brief's content,
financial semantics, accessibility, and single-file offline delivery.

Do not inspect other runs or borrow their screenshots. Do not edit task inputs,
customizations, or the upstream skill. Do not install packages or fetch assets.
Produce `output/index.html`; put the compact plan and evidence in chat, not extra
documents. Never announce a winner or claim an untested visual improvement.

## 1. Choose a product-specific concept before coding

The audience is young workers trying to understand and plan a savings target.
The design direction is **planner-first**: make the act of planning the memorable
part of the page, rather than a generic headline beside an unrelated balance card.

Show a compact plan in chat:

- Compare two small ASCII compositions and choose one that makes planning clear.
- Define 4-6 named color tokens and a restrained spacing/radius system.
- Choose deliberate system-font roles. Georgia and Segoe UI are available
  examples, not mandatory defaults. No web fonts, photos, or external libraries.
- Describe the relationship between the headline, calculator, monthly plan,
  costs, and CTA. State why each prominent visual helps this audience.

Critique the plan before building. Reject generic card grids, unnecessary
all-caps eyebrows, arbitrary single-word headline accents, and decoration that
does not explain the user's goal. Do not confuse a different palette with a
different information architecture.

## 2. Let the calculator carry the story

Use a concise product explanation followed by a prominent planning workspace,
or another composition that makes the calculator the page's main visual anchor.
The hero must still identify the fictional product and offer the required
working links to the calculator and how-it-works section.

Create one meaningful visual derived from the same calculation, such as a
labelled monthly path from initial savings to the target. It must agree with the
rounded monthly contribution; explain rounding if cumulative contributions
slightly exceed the target. Do not imply interest, investment returns, guaranteed
growth, or inclusion of administration fees.

Keep the visual bounded on mobile even for 60 months: summarize milestones
instead of squeezing 60 tiny labels into a row. Provide the essential values in
text, not only a graphic. Invalid inputs must invalidate or hide the dependent
visual as well as the numeric result; never leave a success-looking stale plan.

Make costs easy to find beside the planning explanation, not buried in FAQ.
Preserve Rp5.000/month administration and Rp100.000 example opening deposit.
Benefits, steps, FAQ, and the dummy summary form remain required. Avoid
duplicating input forms or adding unrelated features merely to look richer.

## 3. Review the design and the actual states

Inspect the first pass against the chosen composition. Revise any generic
hero/card treatment that obscures planning. If browser tools exist, review
screenshots at 1440px and 390px, identify a concrete issue, and make a focused
improvement. Do not add gratuitous motion; respect reduced motion.

Check at least:

- Primary/secondary CTA reaches the calculator/how-it-works section.
- Rp12.000.000 target, Rp0 initial, 12 months gives Rp1.000.000/month.
- A non-divisible amount follows ceil, for example 100 / 3 gives 34.
- Months 1 and 60 work; 0, fractional months, and >60 show nearby errors.
- Initial savings >= target gives Rp0 and a target-achieved explanation.
- Invalid target/initial inputs do not leave a successful numeric or visual plan.
- FAQ works by keyboard. Summary form rejects a short name/missing consent.
- Valid confirmation says simulation, no data sent, no account opened.
- At both widths, labels, cost disclosures, focus, and feedback remain usable.

If a browser check cannot run, say so. Distinguish an inspected code path from
an exercised behavior; never manufacture screenshots, passing checks, or scores.

## 4. Show exactly where the skill affected the result

In the final chat response, link the HTML and provide a compact evidence table:
`C instruction | design decision | selector/location | check performed | result`.
Cover composition, typography, monthly visual, visible costs, and invalid/mobile
states. Name the concrete revision made after critique, or explain why no revision
was justified. This is a trace of design decisions, not proof of invocation or
superiority; the agent activity log is still needed to confirm loaded skills.
