# climx — Architecture (CLIMX-A)

Status: `designed` — selected 2026-07-19 by a Phyriad AAP run (3 independent candidates,
3 adversarial lenses, feasibility veto; full record in [`planning/aap/`](planning/aap/),
verdict chain AT0 FREEZE-WITH-FIXES→frozen · AT1 DIVERSE · AT2 SCORED×3 · AT3 CONVERGED ·
AT4 CLEARS · ATF APPROVED FOR HANDOFF). Implementation not started; every number below
tagged "estimate" becomes a measured number at the milestone that first produces it.
Scope of the claim: best of the three candidates searched against the frozen objective
([`planning/aap/AAP_OBJECTIVE.md`](planning/aap/AAP_OBJECTIVE.md)) — no absolute-optimality
claim.

## What this is

A rebuild of the 2023 school project (tag `v0-school`) into a living, $0-recurring-cost,
CV-grade weather site for Mexico at municipal granularity, using official SMN/CONAGUA
data — designed first as a **learning vehicle** for industry-standard frontend
fundamentals (the frozen objective's priority: learning > sustainability > presentation >
speed, with app-correctness as an unconditional veto).

## The one dataset fact everything depends on

**`idmun` is NOT a national key.** It is the INEGI per-state municipality number: only 570
distinct values across 2,463 municipios; 85.7% collide across states (verified first-hand
2026-07-19 against a fresh SMN payload; the v0 code already worked around it implicitly).
**The unique key is the composite `(ides, idmun)` — every file path, route, and lookup in
this design carries both.** This was the FATAL defect the AAP's adversarial phase caught in
2 of 3 candidates.

## Axis 1 — Data pipeline

- **Source:** SMN `method=1` daily municipal forecast,
  `https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1` (verified 2026-07-19:
  200, gzip 335 KB → 5.0 MB, 9,852 records = 2,463 municipios × 4 days; **no CORS
  header** — the browser can never fetch it directly; the old `/webservices/` path already
  rotted once). `method=3` hourly exists but is out of scope.
- **Fetch:** `scripts/fetch-smn.mjs` (plain Node ≥18, global `fetch`, zero deps) run by
  GitHub Actions cron **`23 1,5,9,13,17,21 * * *`** (every 4 h, minute-offset off the
  documented top-of-hour high-load window). Schema guard before any write: parses as
  array, >2,000 records, sampled record carries expected fields — else exit non-zero
  touching nothing (last-good data stays deployed).
- **Partition** (`scripts/partition-data.mjs`), all composite-keyed:
  - `public/data/forecast/{ides}/{idmun}.json` — 2,463 files, 4-day forecast each
    (~200–390 B gzip measured-class).
  - `public/data/index/all-lite.json` — one row per municipio incl. `ides`, `idmun`,
    `nmun`, `nes`, `lat`, `lon` (~41–46 KB gzip) — feeds search, state browse, and
    geolocation.
  - `public/data/meta.json` — `{fetchedAt, ok, lastAttempt}`; **committed on every run,
    success or failure** (preserving last-good `fetchedAt`) — this both feeds the age
    banner and keeps repo activity alive against GitHub's 60-day scheduled-workflow
    auto-disable [V2].
- **Commit discipline:** content-hash skip-if-unchanged (hash excludes timestamps) —
  bounds git growth and needless deploys to SMN's ~daily real publish cadence.
- **Staleness contract:** client renders `now − meta.fetchedAt` as a visible, `aria-live`
  age banner on every forecast view. A separate tiny **watchdog workflow** asserts
  `fetchedAt < 12 h` and fails loudly (GitHub's free failure e-mail) — so "pipeline stuck"
  is distinguishable from "SMN down" without a human watching.
- **Degradation (K3):** pipeline never overwrites good data with a bad fetch; client
  additionally keeps a `localStorage` last-good copy per municipio. Forced-failure tests:
  (a) pipeline — mocked 500 ⇒ deployed `meta.json` byte-identical; (b) client — mocked
  fetch rejection ⇒ last-good render + visible age, never blank.
- **Residual, declared:** after a ≥60-day total-pipeline-failure window the cron needs one
  manual re-enable (platform mechanic [V2]; the watchdog makes the failure visible long
  before).

## Axis 2 — Stack / tooling

Runtime deps: **`react`, `react-dom` — nothing else.** Dev: `typescript` (strict), `vite`
+ `@vitejs/plugin-react`, `vitest` + `@vitest/coverage-v8` + `jsdom`,
`@testing-library/react`/`jest-dom`/`user-event`, `eslint` + `typescript-eslint` +
`eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y`, `prettier`.

Hand-rolled BY DESIGN (each is an M1 checklist item the operator is learning by
construction): the **router** (History API + `popstate`, 3 route shapes, `useParams`/
`navigate` hooks, GH-Pages `404.html` deep-link shim), the **data layer**
(`fetchWithCache` + TTL over `localStorage` + staleness), the **layout primitives**
(`Stack`/`Cluster`/`Grid`/`Box`/`Text` over design tokens in `tokens.css`: 4 px spacing
scale, semantic color roles, type scale — no hardcoded px/hex outside tokens), and all
**layout CSS** (CSS Modules, native Vite). Pages consume routing ONLY through
`useParams`/`navigate` — the declared fallback: swapping in `react-router-dom` behind that
interface is contained, at the declared cost of one M1 item's by-construction purity.

CI (`ci.yml`, every push/PR): `npm ci` → lint → `tsc --noEmit` → tests with coverage
(≥80 % lines gate on `lib/data/` + `lib/geo/`) → build. Deploy job **`needs: ci`**, main
only, via `actions/upload-pages-artifact` + `actions/deploy-pages`. The gate is
unconditional (M5).

## Axis 3 — Source structure

```
climx/
├── .github/workflows/        # ci.yml · deploy.yml (needs: ci) · data-refresh.yml · data-watchdog.yml
├── public/
│   ├── 404.html              # GH-Pages SPA deep-link redirect shim
│   └── data/                 # GENERATED by the pipeline — never hand-edited
├── scripts/                  # fetch-smn.mjs · partition-data.mjs (composite-key)
├── src/
│   ├── main.tsx · app.tsx
│   ├── styles/               # tokens.css · reset.css
│   ├── router/               # hand-rolled: history, matcher, Route/Link/useParams
│   ├── primitives/           # Stack, Cluster, Grid, Box, Text (+ module.css each)
│   ├── lib/
│   │   ├── data/             # fetchWithCache, useForecast, useMunicipioIndex, staleness — no JSX
│   │   └── geo/              # haversine, nearestMunicipio (replaces the v0 Google key)
│   ├── components/           # ForecastCard, AgeBanner, SearchCombobox (ARIA combobox), MunicipioList
│   └── pages/                # HomePage · StatePage (/estado/:ides) · MunicipioPage (/estado/:ides/municipio/:idmun)
└── docs/                     # this file · planning/aap/ (the search record)
```

Routes use numeric ids only (`ides`, `idmun`) — no accented-name URLs. `lib/` is
JSX-free and owns every `fetch`/`localStorage` touch: that boundary is what makes the
coverage gate coherent.

## Milestones (each ends deployed + producing a real number)

S0 scaffold+gates (4–6 h) → S1 pipeline live (8–12 h; measures partition sizes, asserts
2,463 files) → S2 watchdog+forced-failure (2–4 h) → S3 municipality view (10–14 h;
measures the M4 view payload) → S4 search/browse/geo (10–12 h; **quality-veto
instrument: two same-`idmun` municipios in different states must show distinct correct
forecasts**) → S5 hardening (6–10 h; coverage/a11y/Lighthouse). Total 40–58 h, estimate.

## Metrics contract (from the frozen objective)

M1 8/8 learning checklist by construction · M2 $0/month (≈600–780 Actions-min/mo vs
unlimited public-repo quota [V2]; site ≈2 MB vs 1 GB cap) · M3 ≤12 h freshness, visible
age, watchdog-alarmed · M4 home bundle ≤150 KB gz (est. 75–95) and municipio-view data
≤200 KB gz (est. ≤47 first visit) · M5 unconditional CI gate · M6 Lighthouse ≥90/≥90 both
pages, mobile.

## Honest weakest point

The hand-rolled router (History API edge cases × dynamic segments × the 404 shim) is the
single highest execution risk — contained by the hook-boundary fallback, at a declared
pedagogical price. Everything else that killed candidates in the search (the `idmun`
collision, the deep-link 404s, the cron auto-disable) is structurally addressed above, not
hoped away.
