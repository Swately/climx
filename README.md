# climx

Municipal-level weather forecast for Mexico — all 2,463 municipios — built on the
official SMN/CONAGUA data feed. Live at: _(pending first deploy)_.

Search any municipio (accent-insensitive), browse by state, or use one-tap
geolocation (no external geocoding service — nearest-municipio is computed
client-side over the dataset's own coordinates). Data refreshes automatically
every 4 hours via GitHub Actions and the UI always shows how old it is; if the
source goes down, the site keeps serving the last good snapshot and says so.

## Why it's built the way it is

- **No backend, $0/month, no API keys.** The SMN endpoint has no CORS, so a
  scheduled GitHub Action fetches, validates, and partitions the national payload
  (5 MB) into per-municipio static files (~350 B gzip each) served by GitHub
  Pages. A failed fetch touches nothing — last-good data is never overwritten.
- **The dataset's trap, handled.** `idmun` is NOT a national key (INEGI numbering
  resets per state: 570 distinct values for 2,463 municipios). Every path, route,
  and lookup here is keyed by the composite `(ides, idmun)` — and a regression
  test keeps it that way.
- **Hand-rolled where it teaches, dependencies where it doesn't.** 2 runtime
  dependencies (react, react-dom). The router (History API + GH-Pages deep-link
  shim), the fetch/cache/staleness layer, the layout primitives
  (`Stack/Cluster/Grid/Box/Text` over design tokens), and the ARIA combobox are
  project code, tested. See `/lab` for the living styleguide.
- **Quality gates in CI:** ESLint (+ jsx-a11y) · `tsc --noEmit` (TS strict) ·
  Vitest (41 tests; data layer gated at ≥80% line coverage) · build — on every
  push/PR; deploy only after checks pass. An independent watchdog workflow alarms
  if data goes stale.

## Stack

React 19 · TypeScript (strict) · Vite · Vitest + Testing Library · CSS Modules
over custom-property design tokens · GitHub Actions + Pages.

## Run it

```bash
npm ci
npm run dev        # dev server
npm test           # unit + component tests
npm run coverage   # with the data-layer threshold gate
npm run build      # production build
```

Data can be regenerated locally: `node scripts/fetch-smn.mjs out.json && node
scripts/partition-data.mjs out.json public/data`.

## Provenance

Rebuilt 2026 from a 2023 university project (preserved at tag `v0-school`).
The architecture was selected through a documented design search — three
candidate architectures, adversarial review, feasibility veto — recorded in
[`docs/planning/aap/`](docs/planning/aap/). Design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Measured numbers: [`docs/planning/MEASUREMENTS.md`](docs/planning/MEASUREMENTS.md).

Data source: Servicio Meteorológico Nacional (CONAGUA), México.
