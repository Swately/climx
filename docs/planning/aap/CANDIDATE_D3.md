# CANDIDATE D3 — longevity-max

Designer angle: minimize moving parts so the deployed site still works, untouched, in 3
years. Boring technology, fewest dependencies, static-first, no build-time cleverness that
rots. Designed against `AAP_OBJECTIVE.md` only; no other candidate file was read.

## 1. Design summary

A two-workflow static site: one GitHub Actions cron job fetches SMN's `method=1` payload,
partitions it into ~2,463 tiny per-municipality JSON files plus one manifest, and pushes
only the `/data` subtree to the `gh-pages` branch — independent of the app's build health.
A second workflow builds the React+TypeScript app (Vite, plain CSS Modules, a hand-rolled
~50-line router, no UI/state/routing/HTTP libraries beyond React itself) and pushes only
the app subtree on push to `main`. The two pipelines never touch each other's files, so a
future toolchain break in one cannot take down the other: even if `npm install` stops
working in three years, the data-refresh job (bare `node` + `git`, no framework) keeps the
site's forecasts current for as long as GitHub Actions and the SMN endpoint both exist.
Resilience against a dead SMN source is pushed into the pipeline (never overwrite good data
with a failed fetch) rather than into client code, keeping the shipped JS minimal. Runtime
dependency count: 2 (`react`, `react-dom`).

## 2. Axis 1 — Data pipeline

**Fetch.** `scripts/fetch-smn.mjs` (plain Node, uses the built-in `fetch`, no `axios`) GETs
`https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1` (verified reachable 2026-07-19
per E3; `method=3` hourly is explicitly NOT used — 7.6 MB gz for data the named workload
never asks for is pure attack surface for a longevity design). On non-200, network error, or
a payload that fails a cheap sanity check (must parse as an array, length > 8,000, a sampled
record has `idmun`/`nmun`/`tmax`/`tmin`/`lat`/`lon`), the script exits non-zero **without
writing or committing anything** — this is the entire failure-degradation mechanism: last
known-good data on `gh-pages` is simply never touched by a bad run. No client-side fallback
logic is required for this case; a first-time visitor gets last-good data automatically
because that's the only thing ever deployed.

**Schedule.** `refresh-data.yml`: `cron: '0 */4 * * *'` (every 4 h, 6 runs/day) +
`workflow_dispatch`. Arithmetic against M3's ≤12h contract: one missed run → next success at
+8 h; two consecutive missed runs → +12 h (right at the boundary); three+ → the contract is
explicitly conditioned on "while SMN is reachable," so a longer SMN outage falls under K3's
degrade-to-last-good clause, not an M3 violation.

**Partitioning** (real sizes measured against the repo's existing `DailyForecast_MX.json`
snapshot, 9,852 records = 2,463 municipios × 4 days; live endpoint is schema-identical per
E3):
- `data/municipios/<idmun>.json` — one file per municipio, denormalized (embeds its own
  `idmun`/`nmun`/`ides`/`nes`/`lat`/`lon` plus the 4-day forecast), so the forecast view
  never depends on the index having loaded first. Measured: 1,268 B raw / **364 B gzip** per
  file. 2,463 files total.
- `data/index.json` — flat array of `{idmun, nmun, ides, nes, lat, lon}` for all 2,463
  municipios, used for name search, per-state browsing (filtered client-side), and
  nearest-municipio geolocation. Measured: 225,282 B raw / **44,989 B gzip**. (A
  minified-array-of-arrays encoding measured only ~2.4 KB smaller gzip — not worth the loss
  of readability for a solo learner debugging raw JSON, so the object form is kept.)
- `data/meta.json` — `{generatedAt: <ISO8601>, recordCount, municipioCount}`. Single
  timestamp is the whole staleness contract, deliberately: the client doesn't need to know
  *why* data is old (SMN down vs. pipeline broken), only *how* old.
- Per-estado files were considered and rejected: the largest estado (Oaxaca, 569 of the
  2,463 municipios) alone gzips to 76,492 B — technically under M4's 200 KB cap but wildly
  disproportionate for a view showing one municipality, and it would force the muni-forecast
  view to depend on estado boundaries instead of a stable id.

**Where it lives.** Same `gh-pages` branch GitHub Pages serves, under `/data/`, disjoint from
the app-build output at `/`. Two independent scheduled/triggered Actions workflows push to
that branch; since they touch disjoint paths, a `git pull --rebase` immediately before push
(retried up to 3×) resolves the only realistic race (both firing in the same minute).

**Staleness contract.** Client fetches `data/meta.json` on load, computes
`Date.now() - generatedAt`, renders it as a visible "actualizado hace Xh" badge
(`aria-live` region) on every view that shows forecast data. No polling — the badge's age
just grows if the tab stays open; a re-visit re-fetches. No service worker, no background
sync: one more moving part deliberately not built.

**Failure degradation (K3).** Because the pipeline never overwrites good data with a bad
fetch, "SMN unreachable" and "app broken" are decoupled by construction — the deployed
`/data/*` is always the last successful fetch, and the client always renders it with its true
age. A forced-failure test (mock `fetch-smn.mjs`'s SMN call to return 500, run the
workflow, assert `gh-pages:/data/meta.json` is byte-identical to before) is the concrete
instrument for M3's "forced-failure test" requirement.

**Credentials.** The workflow pushes using the default `GITHUB_TOKEN` (repo-scoped, "read and
write" permission set at the repo level) — no PAT, no third-party secret, satisfying K2 and
E1 (this is GitHub's own built-in mechanism, not an external keyed service).

## 3. Axis 2 — Stack/tooling

| Concern | Choice | Why (longevity lens) |
|---|---|---|
| Build tool | Vite + `@vitejs/plugin-react` | CRA is a dropped driver; Vite is the current standard successor. Its own churn risk is bounded to "can we rebuild later," not "does the deployed site work" — the shipped output is static files with zero runtime dependency on Vite. |
| Language | TypeScript, `strict: true` | M1 item 1, hard requirement. |
| Routing | Hand-rolled (~50 lines), native History API + `useSyncExternalStore` | 4 routes total; a library here is one more package whose major-version API can break (react-router has changed its route-tree API across major versions historically) for a surface small enough not to need it. Zero added dependency. |
| Styling | Plain CSS + CSS Modules (Vite's built-in `.module.css` support, zero extra package) | No CSS-in-JS runtime, no utility-framework build step to keep current. CSS itself has no maintenance burden — browsers don't deprecate it. |
| Design tokens | `src/styles/tokens.css`, CSS custom properties (`--space-*`, `--color-*`, `--font-size-*`) consumed via `var()` | Native platform feature, M1 item 3. Enforcement is code-review/convention only (documented in README), not lint-enforced — see M1 self-assessment, item 3. |
| State | React `useState`/`useReducer`/Context only | App scope (selected municipio, search text, geolocation permission) doesn't need Redux/Zustand/Jotai. |
| Data fetching | Native `fetch` in `src/data/client.ts` | No `axios`; native `fetch` has been standard in evergreen browsers and Node ≥18 for years. |
| Test runner | Vitest + `@vitest/coverage-v8` | Shares Vite's transform pipeline — avoids running a second bundler (Babel/Jest) alongside Vite, which would double the toolchain surface that can rot. |
| Component tests | `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` | Industry-standard, thin API, low historical churn. |
| Lint | `eslint` (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` | Minimal plugin set; catches real bugs (rules-of-hooks) without a large config surface. |
| Formatter | None (deliberately omitted) | One fewer dependency + one fewer config file to keep in sync; not required for correctness. |
| Deploy mechanism | Hand-written `git` commands in the workflow (checkout, write, commit, push) | Avoids a third-party Action (e.g. a community gh-pages-publish action) whose maintenance/ToS is itself a future-breakage risk — the exact risk class this angle is optimizing against. Only `actions/checkout` and `actions/setup-node` (both GitHub-maintained) are used. |
| Hosting | GitHub Pages, classic "serve a branch" mode | The older, more boring Pages mechanism vs. the newer OIDC/Actions-deployment API — fewer moving parts in the publish step itself. |

**CI shape.** One workflow, `ci.yml`, on `push`/`pull_request` to `main`, one job, steps run
in order and any failure fails the whole job (M5's unconditional gate): checkout →
`actions/setup-node` (cached) → `npm ci` → `npm run lint` → `npm run typecheck` (`tsc
--noEmit`) → `npm test -- --coverage` → `npm run build`.

## 4. Axis 3 — Source structure

```
climx/
  .github/workflows/
    ci.yml                  # lint + typecheck + test + build gate (M5)
    deploy-app.yml          # build on push to main, push app output to gh-pages:/
    refresh-data.yml        # cron fetch+partition+commit to gh-pages:/data (independent)
  scripts/
    fetch-smn.mjs           # fetch, validate, partition; runnable locally or in CI
  public/                   # favicon, manifest — passthrough static assets
  src/
    main.tsx                # entry, mounts <App/>
    App.tsx                 # route table
    router/router.tsx       # hand-rolled History-API router
    routes/                 # one file per page = the project-authored layout container
      HomePage.tsx           #   search + geolocate + state browse entry
      MunicipalityPage.tsx   #   /m/:idmun — today + 3-day forecast, age badge
      StatePage.tsx          #   /estado/:ides — municipio list for a state
    components/              # presentational leaves only, no layout ownership
      ForecastCard.tsx(.module.css)
      DataAgeBadge.tsx(.module.css)
      MunicipalitySearch.tsx(.module.css)
      SkeletonCard.tsx(.module.css)
    data/                     # the ONLY layer that calls fetch() or touches localStorage
      client.ts                #  getIndex(), getMunicipio(idmun), getMeta()
      cache.ts                  #  localStorage read/write + age calculation
      geolocate.ts               #  Haversine nearest-municipio over index.json's lat/lon
      types.ts                    #  TS types mirroring data/*.json shapes
      __tests__/                   #  unit tests — this dir is what M1 item 5's 80% targets
    styles/
      tokens.css                # design tokens (custom properties)
      global.css                 # resets, base element styles, landmark defaults
    test/setup.ts                 # vitest + jest-dom setup
  index.html
  vite.config.ts                  # base: '/<repo>/' — GH Pages is a project page (verified:
                                   # existing package.json homepage field has no custom domain,
                                   # no CNAME file in public/)
  tsconfig.json
  package.json
```

**Routes.** `/`, `/m/:idmun`, `/estado/:ides` — using the source schema's own stable numeric
ids (`idmun`, `ides`, both present in every record) instead of accented Spanish names
(`nmun`/`nes`) sidesteps URL-encoding edge cases entirely; this is a direct, low-cost fix
over the v0 app's `/elementClime/:nes/:nmun` name-based routes.

**Data-layer boundary.** Nothing outside `src/data/` calls `fetch` or reads `localStorage`.
Page/route components call typed hooks (`useMunicipality(idmun)`, `useIndex()`) that wrap
`src/data/client.ts`. This makes the data layer trivially unit-testable (mock `fetch`, no DOM
needed for most of it) — the concrete mechanism behind the ≥80% coverage target.

**Geolocation.** `src/data/geolocate.ts` computes nearest municipio via the Haversine formula
over `index.json`'s `lat`/`lon` — replaces the v0 app's hardcoded Google Maps geocoding key
(`src/hooks/location.js:35` in the current repo) with a key-free, dependency-free computation
over data already on the client, matching the objective's DROPPED-driver note verbatim.

**Accessibility.** `<header>`/`<nav>`/`<main>`/`<footer>` hand-authored per page, native
`<button>`/`<a>` only (no clickable `<div>`s), a skip-link, `aria-live="polite"` on the data
age badge.

## 5. Full dependency list

**Runtime (2):**
- `react` — the UI library; the M1 React-family requirement itself.
- `react-dom` — DOM renderer.

**Dev (11 packages, ~10 concerns):**
- `typescript` — strict-mode typechecking (M1 item 1).
- `vite` — dev server + production bundler.
- `@vitejs/plugin-react` — JSX transform + Fast Refresh for Vite.
- `@types/react`, `@types/react-dom` — TS types for React.
- `vitest` — test runner sharing Vite's transform pipeline.
- `@vitest/coverage-v8` — coverage report (M1 item 5, feeds M5's test gate).
- `@testing-library/react` — component test utilities.
- `@testing-library/jest-dom` — DOM assertion matchers.
- `jsdom` — DOM environment for Vitest.
- `eslint` — lint gate (M1 item 6 / M5).
- `typescript-eslint` + `eslint-plugin-react-hooks` — TS-aware + hooks lint rules. (Exact
  current package boundaries for `typescript-eslint`'s flat-config bundling should be
  re-verified at implementation time — noted as unverified against today's npm registry
  state, not asserted as fact.)

**Explicitly NOT used, with reason:** `axios` (native `fetch` suffices), `alasql` (plain
`Array.filter`/`find`/`map` replace SQL-over-JSON — alasql appears in 7 files of the v0 app
per the objective's evidence for a problem plain array methods already solve), any CSS-in-JS
library (`styled-components`/`emotion`), any component library (MUI etc.), `react-router-dom`,
any state-management library, `gh-pages` npm package (hand-rolled `git` push instead), and
`method=3` hourly SMN data entirely.

**Total direct dependency count: 13** (2 runtime + 11 dev), vs. the v0 app's 18 runtime
dependencies alone (MUI×3, emotion×2, styled-components, alasql, axios, jquery, `github`,
`gh-pages`, fontsource, react-router-dom, web-vitals, plus testing-library trio).

## 6. Budget arithmetic

**Actions minutes/month** (public repo ⇒ free/unlimited standard-runner minutes per E3's
verified evidence — this arithmetic is sanity-check, not a binding constraint):
- `refresh-data.yml`: 6 runs/day × 30 days = 180 runs. Each run ≈ checkout + cached
  setup-node + fetch/partition/commit/push, rounded up to 1 billed minute (Actions bills in
  1-min increments) → **~180 min/month**.
- `ci.yml`: during active build-out, estimate ~30 pushes/month, ~2-3 min/run (npm ci + lint +
  typecheck + test+coverage + build) → **~60-90 min/month**; post-handoff, pushes drop toward
  zero, so this cost drops toward zero too — no idle charge, no expiring tier.
- `deploy-app.yml`: same push cadence as CI, ~1-2 min/run → **~30-60 min/month** during
  build-out, near-zero after.
- **Total during active build-out: ~270-330 min/month (~5 h)**, all $0 regardless, since the
  quota used is unlimited for this repo type.

**Payload vs M4:**
- Home-page JS bundle: React+ReactDOM production + hand-rolled router + home page code, no
  UI library, no code-splitting needed at this scope. Estimated 55-80 KB gzip — **this is an
  estimate, not a measurement**; must be confirmed against real `vite build` output at
  Milestone M-4 against the 150 KB cap.
- Municipality-forecast-view data: one `data/municipios/<idmun>.json` file, **measured 364 B
  gzip** (real number, from the existing v0 snapshot's schema) — ~550× under M4's 200 KB
  cap. This headroom is the direct payoff of per-municipio (not per-estado) partitioning.

**Dependency count:** 13 direct (2 runtime + 11 dev) — see §5.

**Estimated build-hours per milestone:** see §7; sums to **~35-55 h** total, an estimate for
a solo learner (E4), not a measurement.

## 7. Staged milestones

Each ends runnable + measurable (K5); the number each stage produces is named.

1. **M-0 Scaffold** (2-4 h): Vite+React+TS scaffolded, `ci.yml` green on an empty
   lint/typecheck/build, `deploy-app.yml` publishes a placeholder page. **Produces:** a live
   URL that loads.
2. **M-1 Pipeline v1, local** (4-6 h): `fetch-smn.mjs` run manually, produces
   `data/index.json` + 2,463 `data/municipios/*.json` + `data/meta.json` on disk. **Produces:**
   file count == 2,463, measured gzip sizes logged.
3. **M-2 Pipeline live** (2-3 h): `refresh-data.yml` scheduled, first real run publishes to
   `gh-pages:/data/`. **Produces:** a fetchable `data/meta.json` with `generatedAt` < 12 h old.
4. **M-3 Data layer + router** (6-8 h): `src/data/**` with unit tests, hand-rolled router with
   stub pages. **Produces:** coverage report showing `src/data/**` ≥ 80% line coverage;
   client-side navigation across 3 URLs with no full reload.
5. **M-4 Home page** (8-10 h): search, state browse, geolocation-nearest. **Produces:** a
   measured home-page JS bundle gzip size vs. the 150 KB cap.
6. **M-5 Municipality page** (6-8 h): forecast cards, age badge, forced-failure test.
   **Produces:** a measured muni-view data payload vs. the 200 KB cap; a passing
   forced-failure test asserting last-good data + visible age under a mocked SMN outage.
7. **M-6 A11y + component tests** (4-6 h): keyboard audit, `aria-live`, component tests.
   **Produces:** a documented manual keyboard-nav pass + green component test suite.
8. **M-7 CI/Lighthouse hardening** (3-4 h): full M5 gate wired, Lighthouse run against the
   deployed URL. **Produces:** recorded Performance/Accessibility scores for both required
   pages.
9. **M-8 Handoff freeze** (2-3 h): README documents the zero-maintenance contract (what runs
   forever unattended, what to check if something breaks, the optional history-squash
   escape hatch from §9). **Produces:** a full M1-M6 self-scored metrics sweep.

## 8. M1 checklist self-assessment (8/8 by construction)

1. **TS strict mode** — yes, `tsconfig.json` `strict: true`, 100% of app code is `.ts`/`.tsx`.
2. **Hand-written flexbox/grid, 100% of routed views** — yes, trivially exceeded: no UI
   library at all, every layout AND every leaf widget is project-authored CSS.
3. **Design tokens used by UI code** — yes, but softly: `tokens.css` custom properties are
   consumed via `var()` by convention, documented in the README, **not lint-enforced** (no
   stylelint dependency was added — a deliberate dependency-count tradeoff). Honest gap: a
   future edit could introduce a raw hex value and nothing would catch it automatically.
4. **A11y: landmarks + keyboard-operable** — yes, hand-authored semantic HTML, native
   interactive elements only.
5. **Unit + component tests, data layer ≥80% coverage** — yes, Vitest coverage report scoped
   to `src/data/**`, the boundary that owns all fetch/cache logic.
6. **CI: lint+typecheck+tests+build on every push/PR** — yes, single `ci.yml` job, all 4
   steps, unconditional per M5.
7. **Client data fetching, explicit cache/staleness** — yes, this is the design's center of
   gravity: `data/meta.json` + `src/data/cache.ts` are the entire staleness contract.
8. **Client-side routing, URL-addressable states** — yes, hand-rolled router persists
   selected municipio/state in the URL path (`/m/:idmun`, `/estado/:ides`); the requirement
   is about the capability, which does not require a routing library.

## 9. Honest weakest point

**Unbounded git history growth on the `gh-pages` branch from 3 years of unattended cron
commits.** At 6 data-refresh runs/day, ~2,190 runs/year, ~6,570 runs over 3 years, each
touching up to ~2,463 small files (live weather data changes most fields most runs, so git's
delta compression helps but doesn't eliminate growth). This is a real, quantifiable cost that
is specific to this design's core promise: the more literally "untouched for 3 years" the
pipeline is left, the larger the repository's `.git` history grows, with no natural cap. It
threatens nothing in the M1-M6/kill-criteria scoring (GitHub doesn't bill free public-repo
storage under normal use, and Pages' 1 GB cap in E3 applies to the *published tree*, not
accumulated history) but it is in direct tension with the "zero maintenance" design
philosophy: the honest fix (squashing/resetting the branch's history periodically) is a
maintenance action the design otherwise promises the operator will never have to perform.
This was decided consciously over the alternative (force-pushing a fresh orphan commit every
run, keeping history flat forever) because force-push machinery is itself a sharper
failure mode — a bug in that script could silently wipe the live site, whereas plain
accumulating `git commit`/`push` can only grow, never lose data. Given a genuinely
unattended multi-year horizon, growing-but-safe was judged the better failure mode than
flat-but-riskier, and that judgment call is this design's weakest point.
