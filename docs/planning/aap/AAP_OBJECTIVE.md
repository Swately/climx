# AAP Frozen Objective — climx rebuild architecture search
Status: **FROZEN 2026-07-19** (AT0 verdict: FREEZE WITH FIXES; the 4 point-fixes applied
below, nothing else changed; gate agent a2a01a4733f0dc9d6, Sonnet). DO NOT drift — AINV-12
byte-checks this file at ATF.
Process: Phyriad AAP (`protocols/analysis/ARCHITECTURE_ANALYSIS_PROTOCOL.md`), scoped run.

## Design problem

Rebuild "climx" (formerly CLIMAX, a 2023 university-course React weather app for Mexico,
tagged `v0-school`) into a real, living, CV-grade project. The search covers exactly THREE
axes; everything else is out of scope for this AAP:

1. **Data pipeline** — how SMN forecast data is fetched, refreshed, partitioned, stored,
   and served to the client; the staleness contract.
2. **Stack / tooling** — build tool, language, styling approach (including own-primitives
   vs component library), data/state libraries, test tooling, CI.
3. **Source structure** — folder organization, component architecture, data-layer
   boundaries inside the app.

## Named workload / use case (the fixed case feasibility is vetoed against)

A visitor opens the site on phone or desktop. They grant or deny geolocation. They see
today's + 3-day forecast for their municipality (or one found via search / per-state
browsing), with the data at most 12 hours old when the source is reachable, and the data's
age visible at all times. The site works on a cold cache over a mid-range mobile connection.

## Success metrics (measurable; instrument named)

- **M1 — Learning coverage.** Count of industry-fundamental competencies exercised *by
  construction* and verifiable in the repo, out of this closed checklist of 8:
  (1) TypeScript strict mode on; (2) hand-written flexbox/grid layout — threshold: the
  layout containers of 100% of routed views are project-authored (a library may provide
  leaf widgets at most, never page/section layout); (3) design tokens (spacing/color/type scales) used by the UI
  code; (4) accessibility: semantic HTML landmarks + keyboard-operable interactive
  elements; (5) unit + component tests, data layer ≥ 80% line coverage (coverage report);
  (6) CI running lint + typecheck + tests + build on every push/PR; (7) client data
  fetching with explicit cache/staleness handling; (8) client-side routing with URL-addressable
  states. Instrument: repo inspection + coverage/CI artifacts. Target: 8/8.
- **M2 — Recurring cost.** USD 0 / month, shown by quota arithmetic against the free tiers
  actually used (GitHub Actions on a public repo; GitHub Pages 100 GB/month soft cap).
  Instrument: the arithmetic itself, with each quota cited.
- **M3 — Freshness & degradation.** Deployed data ≤ 12 h old while SMN is reachable; UI
  displays data age; app remains fully usable on last-good data when SMN is down.
  Instrument: pipeline schedule + a forced-failure test.
- **M4 — Payload.** Initial JS bundle ≤ 150 KB gzip, measured on the HOME page, cold
  cache; data transferred ≤ 200 KB gzip, measured on the MUNICIPALITY FORECAST view (the
  heaviest data view). Instrument: build output / network panel on the deployed site.
- **M5 — Quality gate.** CI green (lint + typecheck + tests + build) required on the
  default branch. Instrument: CI config + run history. **M5 is an unconditional gate
  (like the quality veto), not a ranked, tradeable metric** (AT0 fix).
- **M6 — Lighthouse.** Performance ≥ 90 and Accessibility ≥ 90 on BOTH the home page and
  the municipality forecast view, deployed production URL, mobile preset; both must pass.
  Instrument: Lighthouse run.

## Priority ordering (who wins on conflict — PERFECTION_TRADEOFF template, declared)

1. **P1 Learning value (M1).** The project's declared reason to exist: the operator is
   using it to learn the frontend fundamentals industry asks for.
2. **P2 Sustainability (M2, M3).** Free forever, alive without maintenance — the "de
   verdad" requirement.
3. **P3 Presentation (M4, M6).** The CV face.
4. **P4 Delivery speed.** Explicitly last: slower-but-educational beats faster-but-opaque.

**Quality veto (not a score):** the app must show *correct* forecasts for the selected
municipality (spot-check against the SMN source). A broken or wrong app fails regardless
of every metric above.

## Feasibility envelope (hard constraints)

- **E1** $0 recurring. Only GitHub free services on a public repo (Actions, Pages). No
  external service requiring an account, key, or card — free-tier third parties included
  (free tiers rot).
- **E2** Static hosting (GitHub Pages). No runtime server. No secrets in client code.
- **E3** Data source: SMN/CONAGUA `method=1` daily municipal forecast — verified
  first-hand 2026-07-19: `https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1`,
  HTTP 200, gzip 335 KB → 5.0 MB JSON, 9,852 records = 2,463 municipios × 4 days, schema
  identical to the 2023 snapshot; **no CORS header** → browser-direct fetch is blocked;
  the old `/webservices/` path already rotted once (301 → 500). `method=3` hourly exists
  (7.6 MB gz / ~104 MB raw) — optional, not required. Fields incl. `lat`/`lon` per
  municipio.
- **E4** Solo developer (the operator), learning TS/React; Windows dev machine; LLM
  assistance available. No team, no reviewer pool.
- **E5** Repo continuity: migration happens on a branch of the existing repo; tag
  `v0-school` and full history preserved; no history rewrite inside this effort.
- **E6** Toolchain: free/open npm ecosystem only.

## Kill criteria (each can disqualify a candidate outright)

- **K1** Any recurring cost > $0, or any required external service beyond GitHub.
- **K2** Any secret/API key required in client code.
- **K3** App unusable (blank, broken, or silently wrong) when SMN is unreachable — must
  degrade to last-good data with visible age.
- **K4** Fundamentals hidden: layout, styling, data fetching, and a11y all delivered by
  framework black boxes such that the M1 checklist cannot reach ≥ 6/8 by construction.
- **K5** Not incrementally buildable by a solo learner: no staged milestone path where
  every stage ends runnable and measurable.
- **K6** Unmeasurable: no staged path to real numbers for M2–M6 on the real deployed
  target.

## Declared constraints — dropped/forbidden drivers (smuggling check)

- **DROPPED:** jQuery, `github` npm package, alasql, materialize.css, Create React App
  (deprecated toolchain), Google geocoding API (keyed external dependency — geolocation
  resolves via nearest-municipality over the dataset's own lat/lon or equivalent
  key-free means).
- **FORBIDDEN:** React-Native-API-on-web emulation (tap-tap style `onPress`/
  `numberOfLines` primitives) — cross-platform is not in scope.
- **NOT forbidden but must be argued against M1:** component libraries (MUI, Mantine,
  etc.) — a candidate may propose one, but carries the burden of showing M1 ≥ 6/8 still
  holds by construction.

## Candidate angles for A1 (three independent bets)

- **D1 pedagogy-max:** maximize fundamentals learned per feature; hand-roll everything
  instructive (own primitives + tokens, hand CSS); dependencies only where hand-rolling
  teaches nothing.
- **D2 industry-replica:** mirror what a competent production team would ship in 2026
  with established libraries and conventions; the repo should read like a workplace.
- **D3 longevity-max:** minimize moving parts so the deployed site still works untouched
  in 3 years; boring technology, fewest dependencies, static-first.

Each DESIGNER returns: a complete design across the three axes + full dependency list +
quota/complexity budget (Actions minutes, payload sizes, dependency count, estimated
build-hours per milestone) + staged milestones (each ending runnable + measurable) + its
own honest weakest point.

## Verified input evidence (supervisor, first-hand, 2026-07-19)

- SMN endpoint state: see E3 (probed today with curl; headers + payload inspected).
- v0 app surveyed: CRA + React 18 + MUI, ~1,500 JS lines / 37 files, 124 MB images in
  `src/`, static Dec-2023 snapshot, alasql in 7 files, jQuery/`github` deps unused in
  code, hardcoded Google Maps key in `src/hooks/location.js:35`, route map:
  home / `elementClime/:nes/:nmun` / `listComponent` / `munList/:nes`.
- GitHub quotas: Actions minutes free/unlimited on public repos (standard runners);
  Pages soft cap 100 GB/month bandwidth, 1 GB published-site size. Verified against
  docs.github.com by the AT0 gate agent first-hand 2026-07-19 (delegated verification,
  supervisor cross-checked against general knowledge — declared per CONDUCT §2
  delegated-work row) [V2].
