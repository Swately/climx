# CANDIDATE D2 — "industry-replica"

Designer angle: mirror what a competent production frontend team ships in 2026 — boring,
popular, conventional tools; PR discipline; CI/CD; code-quality gates. Judged strictly
against `AAP_OBJECTIVE.md` (frozen 2026-07-19). No other candidate file was read.

## 1. Design summary

A Vite + React 19 + TypeScript SPA, styled with CSS Modules over hand-authored design
tokens (no component library — the M1 burden-of-proof for MUI/Mantine is not worth
carrying when CSS Modules costs nothing extra and keeps K4 trivially satisfied), routed
with React Router, data-fetched with TanStack Query against a static JSON artifact
regenerated twice daily by a scheduled GitHub Actions workflow and committed to a `data/`
branch/folder served through GitHub Pages. Quality gates (ESLint + Prettier + `tsc --noEmit`
+ Vitest + Testing Library + build) run in one CI workflow on every push and PR, mirroring
a typical mid-size company's frontend repo: `apps/` single package (no monorepo — team of
one, monorepo tooling would be resume-padding, not realism), conventional `src/{routes,
components,features,lib,types}` layout, Conventional Commits, CODEOWNERS-style PR template
even solo. The bet: nothing here should surprise a hiring manager who has shipped React in
industry, and nothing here should be a black box that swallows a learning-checklist item.

## 2. Axis 1 — Data pipeline

**Source.** SMN `method=1` daily municipal forecast, `https://smn.conagua.gob.mx/tools/
GUI/webservices/?method=1` (verified E3: HTTP 200, gzip 335 KB / 5.0 MB raw JSON, 9,852
records = 2,463 municipios × 4 days, no CORS header). Browser-direct fetch is blocked by
CORS, so the client never talks to SMN directly (also removes SMN reachability from the
client's runtime critical path, which is what K3 asks for).

**Fetch mechanism.** A GitHub Actions **scheduled workflow** (`.github/workflows/
fetch-data.yml`, `on: schedule: cron: '0 */6 * * *'` — every 6 hours, i.e. 4 runs/day) runs
a small Node script (`scripts/fetch-forecast.mjs`, plain `fetch` + `zlib`, no framework)
that:
1. GETs `method=1`, validates it parses as JSON and has >2000 records (a naive schema
   guard against SMN serving an error page as 200 — observed failure mode class per E3's
   note that the old endpoint already rotted 301→500 once).
2. Transforms the flat 9,852-record array into a partitioned shape (below).
3. Writes the partitioned files to `public/data/` and a `meta.json` with `fetchedAtUtc`.
4. Commits via `git commit` + `git push` if the content hash changed (skip empty commits
   on unchanged SMN payloads — SMN publishes once/day per E3, so 3 of 4 runs typically
   no-op).
5. On fetch/parse failure: workflow exits non-zero, **does not touch** `public/data/`
   (last-good data stays deployed), and GitHub emails the operator a failed-workflow
   notification (free, built into Actions — no extra service, satisfies E1).

**Partitioning.** SMN's flat array is re-keyed by `idmun` at build time into:
- `public/data/index.json` — municipio directory: `{idmun, nmun, nes, lat, lon}` for all
  2,463 municipios (~180 KB raw, ~35 KB gzip) — this is the only file the home/search view
  needs, so search-by-name and geolocation-nearest-lookup never pull forecast data.
- `public/data/forecast/{ides}/{idmun}.json` — one file per municipio (2,463 files, ~4
  records/~600 B raw each, ~300 B gzip), grouped in per-state directories (`ides` = state
  id, 32 states) purely for filesystem tidiness — the client fetches individual municipio
  files directly, never a per-state bundle, so a municipio view never over-fetches.
- `public/data/meta.json` — `{ fetchedAtUtc, sourceRecordCount, municipioCount }`, ~80 B.

This is a build-time partition, not a runtime API — it exists so the "municipality
forecast" network request (M4's heaviest-data view) is ~300 B gzip instead of 335 KB.

**Where data lives.** Committed into the repo under `public/data/` (or a dedicated
orphan `data` branch merged into the Pages build — implementation detail, does not change
the contract) and published as static files by GitHub Pages — no database, no server, no
third-party storage (E1/E2).

**Staleness contract.** Cron cadence 6 h; SMN itself refreshes ~daily (E3). Worst case:
SMN publishes right after a run completes → up to ~6 h wait for next run to see it, well
inside M3's 12 h budget with margin for one missed/failed run (a single skipped run still
lands inside 12 h; two consecutive failures would not — see weakest point). The client
renders `meta.json.fetchedAtUtc` as "Datos actualizados hace Xh" on every forecast view
(TanStack Query's own `dataUpdatedAt` is fetch-time, not source-time, so the app reads the
source timestamp explicitly — this is the M3 "visible age" requirement and one of the M1
checklist items, "explicit cache/staleness handling").

**Failure degradation (K3).** The client fetches `meta.json` + the relevant partition
file(s) via TanStack Query with `staleTime` tuned to the 6 h cadence and no client-side
retry-forever loop. If a fetch 404s or the network is down, the UI falls back to
whatever TanStack Query has cached in `localStorage` (persisted via
`@tanstack/query-sync-storage-persister`) and shows the last known `fetchedAtUtc` with a
visible "showing last-saved data, could not refresh" banner — never a blank screen. On a
genuinely cold cache with no network (first visit, offline), the view shows an explicit
error state with a retry button, not silent wrongness — satisfies K3's "must degrade to
last-good data with visible age" for the return-visitor case, and fails honestly (not
silently) for the true-cold-and-offline case, which K3 does not require covering since
there is no prior "last-good" to degrade to.

**Cadence/size arithmetic.** 4 scheduled runs/day × ~1–2 min each (single HTTP GET + JSON
transform + git commit, no build step in this job) ≈ 4–8 Actions-minutes/day ≈
120–240 min/month for data-fetch alone (see §6 for the combined budget against E1's
"unlimited public-repo minutes" and M2's arithmetic requirement).

## 3. Axis 2 — Stack / tooling

| Tool | Role |
|---|---|
| **Vite** | Build tool / dev server. Replaces CRA (explicitly DROPPED, deprecated). Industry-standard default for new React SPAs as of 2026; fast HMR, ships smaller than CRA/webpack output. |
| **React 19** | UI library. Already the app's framework; keeps continuity with v0 (E5). |
| **TypeScript (strict mode)** | Language. `"strict": true` in `tsconfig.json` — direct M1 item (1). |
| **React Router v6/7** | Client-side routing, URL-addressable state — M1 item (8). Same library family as v0, upgraded API. |
| **CSS Modules + hand-authored design tokens** (`src/styles/tokens.css` custom properties: spacing scale, color scale, type scale) | Styling. **No component library.** CSS Modules is itself boring-industry-standard (used at scale by e.g. GitHub's own frontends historically, Next.js default) and keeps layout/tokens fully project-authored — this is what keeps K4 and M1 items (2) and (3) satisfied by construction, no burden-of-proof argument needed. |
| **TanStack Query (React Query) v5** | Data fetching/caching layer against the static JSON. Industry-default async-state library; provides the "explicit cache/staleness handling" of M1 item (7) with named, inspectable cache config rather than hand-rolled fetch+useState. |
| **`@tanstack/query-sync-storage-persister`** | Persists the Query cache to `localStorage` so last-good data survives a reload with no network — the K3 mechanism. |
| **Vitest** | Unit test runner. Vite-native, Jest-API-compatible — industry default for Vite projects in 2026. |
| **React Testing Library** | Component tests, accessibility-oriented queries (`getByRole` etc.) — reinforces M1 item (4) by making a11y the natural query path in tests. |
| **`@vitest/coverage-v8`** | Coverage reporting, gates the data-layer ≥ 80% line coverage of M1 item (5) in CI. |
| **ESLint** (`eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `@typescript-eslint`) | Lint gate; `jsx-a11y` directly enforces M1 item (4) at lint time, not just by convention. |
| **Prettier** | Formatting, run in CI as a check (not autofix-on-push) — standard workplace gate. |
| **`eslint-plugin-testing-library` / `eslint-plugin-vitest`** | Lint rules for the test files themselves — a detail real teams bother with, keeps this "industry-replica" honest. |
| **GitHub Actions** | CI/CD: PR workflow (lint + typecheck + test + build) and the separate scheduled data-fetch workflow (§2). Also builds+deploys to Pages on merge to default branch. |
| **GitHub Pages** | Static hosting (E2). |
| **Husky + lint-staged** | Pre-commit hook running ESLint/Prettier on staged files — standard workplace friction-reducer; deliberately *not* a CI substitute (CI re-runs full checks regardless, per M5 being unconditional). |
| **`.github/pull_request_template.md`** | Conventional PR checklist (tests added, a11y checked, screenshot for UI changes) — process realism for a solo repo; costs nothing, documents intent for anyone (including future-operator) reading the repo. |

**Styling approach, concretely.** `src/styles/tokens.css` defines CSS custom properties:
a spacing scale (`--space-1` … `--space-8`, 4px base), a color scale (`--color-*` per
semantic role: background/surface/text/accent/warning, each with a light value — dark
mode out of scope unless the operator wants it as a stretch milestone), and a type scale
(`--font-size-*`, `--line-height-*`). Every component gets a co-located `Component.module.
css` importing those tokens via `var(--space-3)` etc. — never hardcoded pixel values.
Layout (flexbox/grid) is hand-written in each module's CSS, never delegated to a library
grid system — this is the literal text of M1 item (2)'s threshold ("layout containers of
100% of routed views are project-authored").

**Test tooling shape.** Co-located `*.test.tsx` / `*.test.ts` next to source. Data-layer
modules (`src/lib/forecast.ts`, the fetch/parse/nearest-municipio logic) get unit tests
run against fixture JSON (a trimmed slice of real SMN shape, checked into `src/lib/
__fixtures__/`) — this is the module CI gates at ≥80% line coverage. Components get RTL
render + interaction tests (search input, municipio card, error/stale banners) using
`userEvent`, asserting via accessible roles/labels — a11y-by-test-design.

**CI shape (`ci.yml`).** Triggered on `push` and `pull_request` to any branch touching
the app (not the scheduled data branch). Single job, matrix-free (one Node LTS version —
a real matrix would be over-engineering for a solo repo, noted here as a deliberate
non-choice): checkout → `npm ci` → `npm run lint` → `npm run typecheck` (`tsc --noEmit`)
→ `npm run test -- --coverage` (fails under 80% on `src/lib/**`) → `npm run build` →
upload `dist/` as a build artifact. A second job (`deploy`, `needs: ci`, `if: github.
ref == 'refs/heads/main'`) publishes `dist/` to Pages via `actions/deploy-pages`. This is
M1 item (6) and the M5 gate, verbatim.

## 4. Axis 3 — Source structure

```
climx/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # lint+typecheck+test+build+deploy, every push/PR
│   │   └── fetch-data.yml          # cron every 6h, updates public/data/
│   └── pull_request_template.md
├── public/
│   └── data/
│       ├── index.json              # municipio directory (search/geolocation source)
│       ├── meta.json                # { fetchedAtUtc, sourceRecordCount, municipioCount }
│       └── forecast/
│           └── {ides}/{idmun}.json # one file per municipio, ~4-day forecast
├── scripts/
│   └── fetch-forecast.mjs           # the scheduled-workflow script (§2)
├── src/
│   ├── main.tsx                     # entry, router mount
│   ├── App.tsx                      # <Routes> table only
│   ├── routes/
│   │   ├── Home.tsx                 # search + state browser landing
│   │   ├── StateMunicipios.tsx      # /estado/:nes — municipio list for a state
│   │   └── MunicipioForecast.tsx    # /estado/:nes/municipio/:idmun — the heavy view (M4)
│   ├── components/                  # presentational, reusable, NOT route-level layout
│   │   ├── ForecastCard/
│   │   │   ├── ForecastCard.tsx
│   │   │   └── ForecastCard.module.css
│   │   ├── MunicipioSearch/
│   │   ├── StaleBanner/             # renders meta.fetchedAtUtc + degraded-data notice
│   │   └── ErrorState/
│   ├── features/
│   │   └── geolocation/
│   │       ├── useNearestMunicipio.ts   # haversine over index.json, no external geocoder
│   │       └── useNearestMunicipio.test.ts
│   ├── lib/                         # the data layer — the ≥80%-coverage target
│   │   ├── forecast.ts              # fetch + parse + shape municipio forecast
│   │   ├── forecast.test.ts
│   │   ├── municipioIndex.ts        # loads/searches index.json
│   │   ├── municipioIndex.test.ts
│   │   ├── queryClient.ts           # TanStack Query client + persister config
│   │   └── __fixtures__/
│   │       └── sample-forecast.json
│   ├── styles/
│   │   ├── tokens.css               # design tokens: spacing/color/type scales
│   │   └── global.css               # resets, landmark defaults
│   └── types/
│       └── forecast.ts              # shared TS types for the SMN-derived shape
├── scripts/fetch-forecast.test.mjs (optional, node:test)
├── .eslintrc.cjs / eslint.config.js
├── .prettierrc
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json                    # strict: true
└── package.json
```

**Component architecture.** Three route components own layout (satisfies M1 item 2's
threshold literally — 3/3 routed views, project-authored containers). `components/` holds
leaf/presentational pieces reused across routes (a card, a search box, a banner) — these
may internally use only project CSS, no library layout primitives, keeping K4 clean even
though there IS no component library dependency to worry about in D2's specific choice.
`features/geolocation` isolates the one piece of nontrivial client logic (nearest-municipio
via haversine distance over `index.json`, replacing the DROPPED Google geocoding API per
the objective's explicit instruction) as a hook + colocated test, not smeared across
routes.

**Data-layer boundary.** `src/lib/` is the only code that touches `fetch`/`public/data/*`
or TanStack Query directly. Routes and components consume typed hooks (`useMunicipioForecast(idmun)`, `useMunicipioIndex()`) exported from `lib/`, never raw fetch calls — this
boundary is what makes "data layer ≥ 80% coverage" a coherent, checkable target (M1 item 5)
rather than a fuzzy claim, and is exactly the layer the CI coverage gate points at.

## 5. Full dependency list

**Runtime:**
- `react`, `react-dom` — UI runtime.
- `react-router-dom` — client routing / URL-addressable state.
- `@tanstack/react-query` — data fetching/caching, explicit staleness state.
- `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client` —
  localStorage persistence for the K3 offline/last-good path.

**Dev:**
- `vite`, `@vitejs/plugin-react` — build/dev server.
- `typescript` — language + `tsc --noEmit` typecheck gate.
- `vitest`, `@vitest/coverage-v8`, `jsdom` — test runner, coverage, DOM env.
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` —
  component testing.
- `eslint`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-testing-library`, `eslint-plugin-vitest` —
  lint + a11y + test-quality gates.
- `prettier` — formatting check in CI.
- `husky`, `lint-staged` — pre-commit gate (local dev friction reducer, not a CI
  substitute).
- `gh-pages` **not used** — deploy goes through `actions/deploy-pages` (GitHub's own
  Action), which is the current (2026) idiomatic path and avoids a `gh-pages`-branch
  publish step the old app used.

**Total: 4 runtime, ~16 dev ≈ 20 packages** (excluding their transitive trees). No
component library, no CSS-in-JS runtime, no chart library, no state-management library
beyond TanStack Query (routes/components use local `useState`/URL params — no Redux/
Zustand needed at this app's scale, and adding one would be resume-padding, not realism:
a real 2026 team building a site this size would not reach for global state either).

## 6. Budget arithmetic

**Actions minutes/month (E1: public repo, standard runners are free/unlimited, but the
arithmetic is still owed per M2's instrument requirement — treating it as "unlimited"
without a number is the smuggling M2 warns against):**
- `fetch-data.yml`: 4 runs/day × ~1.5 min avg × 30 days ≈ **180 min/month**.
- `ci.yml` (push+PR checks): solo dev, estimate ~8 pushes/week × ~3 min (install+lint+
  typecheck+test+build) ≈ 8 × 4.3 weeks × 3 ≈ **~104 min/month**.
- `deploy` job (only on `main` merges): ~2 merges/week × ~1 min (upload+deploy-pages) ×
  4.3 ≈ **~9 min/month**.
- **Total ≈ 293 min/month.** Even if this were metered (it is not, on a public repo —
  E1/verified quota) this is far under any plausible private-repo free tier (2,000
  min/month) for comparison — margin is large either way. M2 = $0/month holds.

**Payload sizes vs M4:**
- Home page JS bundle: React + React Router + TanStack Query + app code, no component
  library, tree-shaken by Vite/Rollup, minified+gzipped. Estimate (unverified, to be
  measured at Stage 2 — see §7): React 19 + React-DOM ≈ 45 KB gz, React Router ≈ 10 KB
  gz, TanStack Query ≈ 13 KB gz, app code + CSS Modules output ≈ 15–25 KB gz →
  **≈85–95 KB gz total**, against the M4 ceiling of 150 KB gz — roughly 55–65 KB of
  headroom. This is the number that must be measured for real at the first runnable
  milestone; it is a design-time estimate, not a verified figure.
- Municipio forecast view data payload: one `forecast/{ides}/{idmun}.json` (~4 records,
  ~300 B gz per §2) + `index.json` if not already cached (~35 KB gz, cached after first
  visit via TanStack Query persistence) → **first visit ≈35 KB gz, repeat visit ≈0.3 KB
  gz**, both far under the 200 KB gz M4 ceiling for that view.

**Dependency count:** 4 runtime + ~16 dev ≈ 20 direct packages (§5) — mid-weight for an
"industry-replica" (a real 2026 team's frontend repo commonly runs 15–30 direct deps;
this sits inside that band, deliberately not padded).

**Estimated build-hours per milestone** (solo learner, LLM-assisted, E4) — see §7 for
what each stage produces; hours are the designer's estimate, not measured:
- Stage 1 (scaffold + CI skeleton): 4–6 h.
- Stage 2 (data pipeline + fetch-data workflow + partitioning script): 6–10 h (includes
  learning the SMN shape hands-on, first bundle-size measurement).
- Stage 3 (routing + data layer + hooks + tests): 8–12 h.
- Stage 4 (styling: tokens + CSS Modules across 3 routes + a11y pass): 8–12 h.
- Stage 5 (offline/degradation path + Lighthouse/M4/M6 tuning + Pages deploy): 5–8 h.
- **Total ≈ 31–48 h**, plausible for a part-time solo learner over several weeks —
  supports K5 (incrementally buildable, every stage runnable/measurable, detailed next).

## 7. Staged milestones

Each stage ends runnable (deployed or locally runnable) and measurable (produces a real
number), per K5/K6.

1. **Stage 1 — Scaffold.** Vite+React+TS app, ESLint/Prettier/Husky wired, CI workflow
   running lint+typecheck+test(empty)+build on a trivial "hello climx" page, deployed to
   Pages. **Produces:** first Lighthouse score (near-perfect on an empty page — establishes
   the ceiling), first bundle-size number, first green CI run link.
2. **Stage 2 — Data pipeline live.** `fetch-forecast.mjs` + `fetch-data.yml` running on
   schedule, `public/data/` populated and committed, `meta.json` present. **Produces:**
   first real `fetchedAtUtc` timestamp, actual `index.json`/per-municipio file sizes
   (validates the §2/§6 size estimates against reality), first Actions-minutes actual
   reading from the workflow run log.
3. **Stage 3 — Core routes + data layer.** Home (search + state list), StateMunicipios,
   MunicipioForecast wired to real data via `lib/` hooks; unit tests for `lib/` at ≥80%
   coverage enforced in CI. **Produces:** coverage report number, a working end-to-end
   forecast view against live SMN-derived data — the quality veto's spot-check becomes
   possible here.
4. **Stage 4 — Styling + a11y.** Tokens applied, hand-written layout for all 3 routes,
   `jsx-a11y` lint clean, keyboard nav verified. **Produces:** first real Lighthouse
   Accessibility score on the deployed municipio view; M1 checklist items (2)(3)(4)
   become true by inspection.
5. **Stage 5 — Degradation + persistence + polish.** localStorage persister wired,
   forced-SMN-failure test (mock the fetch to fail, assert last-good data + banner render),
   Lighthouse Performance tuning (image/font loading, code-splitting per route).
   **Produces:** the K3 forced-failure test result, final M4 bundle/payload numbers, final
   M6 Lighthouse pair (home + municipio view) on the deployed URL — the metrics the
   objective actually asks to instrument.
6. **Stage 6 (stretch, not required for the checklist) — geolocation polish + search
   UX.** Nearest-municipio haversine hook, debounced search. **Produces:** nothing new on
   the M1–M6 scorecard; pure UX refinement, explicitly optional.

## 8. M1 checklist self-assessment (8/8 claimed by construction)

1. **TypeScript strict mode** — `tsconfig.json` `"strict": true`, enforced in CI via
   `tsc --noEmit`. **Yes, by construction.**
2. **Hand-written flexbox/grid layout, 100% of routed views** — 3/3 routes (Home,
   StateMunicipios, MunicipioForecast) own their layout in project CSS Modules; no
   component library is present to have delegated it to. **Yes, by construction** (this
   is the item D2 is most exposed on if MUI had been chosen instead — it was deliberately
   not chosen for this reason).
3. **Design tokens used by UI code** — `tokens.css` custom properties, imported by every
   `*.module.css`. **Yes, by construction**, checkable by grep for hardcoded px/hex values
   outside `tokens.css`.
4. **Accessibility: landmarks + keyboard-operable** — semantic `<main>`/`<nav>`/`<header>`
   in route shells, `jsx-a11y` lint gate, RTL tests query by role. **Yes, largely by
   construction; keyboard-operability of custom widgets (e.g. search autocomplete, if
   built) still needs a manual pass — lint catches missing roles/labels, not full keyboard
   trap-freedom.**
5. **Unit+component tests, data layer ≥80% coverage** — Vitest + `@vitest/coverage-v8`
   gate on `src/lib/**` in CI, RTL component tests co-located. **Yes, by construction**,
   enforced (build fails under threshold), not aspirational.
6. **CI: lint+typecheck+tests+build on every push/PR** — `ci.yml` literally runs all four
   in one job. **Yes, by construction.**
7. **Explicit cache/staleness handling** — TanStack Query with named `staleTime`/
   persister config, plus the app-level `meta.fetchedAtUtc` display (source-data age,
   distinct from Query's own fetch-time cache state). **Yes, by construction**, and
   arguably more rigorous than a hand-rolled fetch+useState version would be, since the
   library forces the cache states to be named and handled rather than implicit.
8. **Client-side routing, URL-addressable states** — React Router with `/estado/:nes`
   and `/estado/:nes/municipio/:idmun` params. **Yes, by construction.**

**Self-assessed: 8/8.** The one item worth flagging as partially-library-mediated rather
than fully hand-rolled is (7): TanStack Query *is* the mechanism, not a wrapper around a
hand-rolled one. The objective's K4 test is about layout/styling/fetching/a11y being
"hidden" by a black box such that the checklist can't reach ≥6/8 — here the checklist
reaches 8/8 with the fetching mechanism named and inspectable (staleTime, persister,
`meta.fetchedAtUtc` all visible in the code and the UI), which is a materially different
claim than "TanStack Query used, therefore learned nothing" — the operator still has to
understand cache invalidation, stale-while-revalidate semantics, and persistence to wire
it correctly, which is itself an industry-standard skill, just not a hand-rolled one.

## 9. Honest weakest point

**The two-consecutive-failure gap in the freshness contract.** M3 requires ≤12 h staleness
"while SMN is reachable." The design's 6 h cron cadence gives one full run of slack against
a single failed run (job fails, data stays stale by up to ~6 h extra, still under 12 h if
SMN was reachable on the following run). But if SMN is reachable and the workflow itself
fails twice in a row for an unrelated reason (Actions outage, a transient GitHub API error
on the `git push` step, a bug in `fetch-forecast.mjs` triggered by an undocumented SMN
schema drift), staleness silently exceeds 12 h while SMN is reachable — which is a design
gap against M3's exact wording, not just a K3 (SMN-down) scenario, and nothing in this
design detects or surfaces "the pipeline itself is stuck" versus "SMN is down." A more
complete design would add a second, independent staleness check (e.g. a workflow that just
asserts `meta.fetchedAtUtc` is <12 h old and fails loudly/pages the operator if not,
decoupled from the fetch logic itself) — this was deliberately left out of D2 to keep the
milestone list boring/small per the industry-replica bet's own philosophy (a real small
team would likely accept this same gap and fix it only after it bites once), but it is a
real, argued gap, not a hedge.
