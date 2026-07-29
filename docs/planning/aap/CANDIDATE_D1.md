# CANDIDATE D1 — "pedagogy-max"

Angle: maximize industry-fundamental frontend learning per feature built. Hand-roll
everything instructive (layout primitives, design tokens, data-fetch/cache layer, routing);
take a dependency only where hand-rolling would teach nothing the M1 checklist asks for.
Judged strictly against `AAP_OBJECTIVE.md` (read first-hand 2026-07-19); v0 app surveyed
read-only at `G:\phyriad\projects\climx\src` (route map, `libs/data.js`,
`libs/DailyForecast_MX.json` schema, `hooks/location.js`).

## 1. Design summary

D1 treats the SMN CORS wall as the architecture's spine rather than a nuisance: since the
browser can never talk to `smn.conagua.gob.mx` directly (E3, no CORS header), a scheduled
GitHub Actions job becomes the only fetch point, commits a partitioned, size-minimal static
snapshot into the repo, and GitHub Pages serves it — meaning the client only ever reads
last-good local data and staleness is a plain timestamp comparison, not a distributed-systems
problem. On top of that static-JAMstack base, every layer the M1 checklist names explicitly
(layout, tokens, a11y, cache/staleness, routing) is hand-built from browser primitives
(History API, `fetch`, flexbox/grid, ARIA) instead of imported, while layers the checklist
does NOT ask the learner to reinvent (bundler, test runner, assertion/matcher library) stay on
standard tooling (Vite, Vitest, RTL). The result is a ~16-dependency app, most of its logic
owned and testable, whose biggest single execution risk is the one hand-rolled piece with the
most edge cases: the client-side router.

## 2. Axis 1 — Data pipeline

**Source.** SMN `method=1` (`https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1`),
verified E3: HTTP 200, gzip 335 KB → 5.0 MB raw JSON, 9,852 records = 2,463 municipios × 4
days (`ndia` 0–3), no CORS header. `method=3` hourly (7.6 MB gz) is NOT used — out of scope,
daily granularity matches the named workload ("today's + 3-day forecast").

**Fetch mechanism.** `scripts/fetch-smn.mjs`, plain Node ≥18 script using the **global
`fetch`** (no `axios` — the old app's dependency; native fetch is the same API surface,
zero-dependency, and is itself the modern-industry-standard way to do this, so hand-rolling
here costs nothing and teaches the real thing). Runs inside a GitHub Actions job, never in the
browser (CORS forbids that anyway).

**Schedule.** Cron `0 */6 * * *` — every 6 hours, 4 runs/day × 30 = **120 runs/month**. M3
requires ≤12 h staleness "while SMN is reachable": at 6 h cadence, a single failed run still
leaves data ≤12 h old before the next attempt succeeds; two consecutive failures (12–18 h
gap) is the point where the contract can't be met by cadence alone — that's exactly when the
degradation path below takes over, which is the intended behavior per K3, not a bug.

**Partitioning.** The national blob is split into:
- `public/data/index/all-lite.json` — one row per municipio, array-of-arrays format
  `[idmun, nmun, ides, lat, lon]` (denormalized on purpose to avoid repeated JSON keys).
  Estimate (**unverified**, arithmetic shown): ~55 bytes/row × 2,463 ≈ 135 KB raw; gzip on
  repetitive alphanumeric arrays commonly lands 35–45% of raw → **~50–60 KB gzip**, fetched
  once, cached indefinitely (municipio list barely changes) — used by search and by the
  geolocation nearest-municipio calculation.
- `public/data/index/estados.json` — 32-ish entries, `{ides, nes}` — a few hundred bytes.
- `public/data/forecast/{idmun}.json` — ONE file per municipio, the fields the 2023 dataset
  actually carries per day (`ndia, dloc, desciel, cc, tmax, tmin, prec, probprec, dirvienc,
  dirvieng, raf, velvien`), array-of-arrays, 4 days. Estimate: ~90 bytes/day × 4 ≈ **~360–400
  bytes raw per file**; at this size gzip's per-file overhead may not help much (flagged
  **unverified**, to be measured at milestone M-2) — either way it is 2–3 orders of magnitude
  under the M4 200 KB budget for this exact view.
- `public/data/meta.json` — single global `{fetchedAt: ISO8601, ok: bool, source: url}`
  stamp, written every run (success or failure) — this is the one file the client always
  fetches to render the age banner.

Rationale for per-municipio files (not per-state or a single national file): the national
blob alone is 335 KB gzip — already over the 200 KB M4 budget for the municipality-forecast
view, so partitioning down to the view's actual data need is load-bearing for M4, not just
tidiness.

**Where data lives.** Committed straight into the repo (`public/data/`), by the Actions bot,
using the workflow's own `GITHUB_TOKEN` (`permissions: contents: write`) — no database, no
external storage service, satisfying E1/E2 exactly (client fetches same-origin static files
served by Pages, nothing else). Total published data footprint: ~2,463 forecast files × ~400
B ≈ **~1 MB**, + ~135 KB index + negligible metadata ≈ **~1.2 MB raw**, far under the 1 GB
Pages published-site cap (E6-cited evidence).

**Staleness contract.** `meta.json.fetchedAt` is the single source of truth for "how old is
this". The client computes `Date.now() - fetchedAt` on every render of the age banner
(`AgeBanner` component, `aria-live="polite"` so screen readers announce changes) — no
separate per-municipio clock, since one pipeline run refreshes every file together.

**Failure degradation (K3).** Because the client never talks to SMN directly (CORS forces
this), "SMN unreachable" and "client experience" are already decoupled: if a scheduled run's
fetch fails, `fetch-smn.mjs` exits non-zero, the partition/commit step is skipped, and
`meta.json` is NOT overwritten with fresh data (only its `ok` flag flips, still stamped with
the last successful `fetchedAt` — decided at implementation: either skip the meta write
entirely or write `ok:false` while preserving the old `fetchedAt`). Pages continues serving
the last-good committed snapshot. Client-side, `lib/data/fetchWithCache.ts` additionally
keeps a `localStorage` copy per municipio from the visitor's last successful load, so even a
transient client-network failure (not an SMN outage) still renders last-good data with a
visible age instead of blank or erroring — this is the M3 "forced-failure test" target:
mock `fetch` to reject and assert the UI shows cached data + a non-zero, visibly-labeled age
rather than a blank screen.

## 3. Axis 2 — Stack / tooling

- **Build tool:** Vite + `@vitejs/plugin-react` — replaces the deprecated CRA (explicitly
  DROPPED). Not hand-rolled: bundler internals (Rollup/esbuild) teach nothing on the M1
  checklist, so this is the "dependency where hand-rolling teaches nothing relevant" case.
- **Language:** TypeScript, `"strict": true` in `tsconfig.json` (M1 item 1), checked in CI
  via `tsc --noEmit`.
- **Routing — hand-rolled.** M1 item 8 explicitly wants "client-side routing with
  URL-addressable states" demonstrated; using `react-router-dom` would satisfy the feature
  but not demonstrate the mechanism, so D1 hand-rolls a minimal router in
  `src/router/router.tsx`: `window.history.pushState`/`popstate` listener, a small path
  matcher for the 3 route shapes needed (`/`, `/estado/:ides`, `/municipio/:idmun`), a
  `Router`/`Route`/`Link` component set and `useParams`/`navigate` hooks, all built on a
  React Context. Bounded scope (3 route shapes, no nested routing, no data-loader
  abstraction) keeps this a multi-hour build, not a rabbit hole. GitHub Pages does not
  rewrite unknown paths server-side, so deep-links (e.g. a shared `/municipio/54` URL)
  need the standard `404.html`-redirect shim (redirect unknown paths to `index.html` with
  the original path encoded in a query param, restored by the router on boot) — a known,
  documented GH Pages + SPA pattern, included in `public/404.html`.
- **State management:** none as a dependency. Cross-cutting UI state (last search, selected
  municipio) lives in `useReducer` + Context, colocated with the router's own Context
  pattern — no Redux/Zustand, because no M1 item asks for a state library and one would
  hide exactly the reducer/context mechanics that ARE asked for indirectly via the rest of
  the checklist's "by construction" framing.
- **Data fetching — hand-rolled.** `lib/data/fetchWithCache.ts` (native `fetch` + a TTL
  cache backed by `localStorage`, matching `meta.json.fetchedAt` against a staleness
  threshold) and `useForecast(idmun)` / `useMunicipioIndex()` hooks. No `react-query`/SWR:
  those libraries implement caching/staleness FOR you, which is the opposite of M1 item 7
  ("explicit cache/staleness handling", scored by construction).
- **Styling — hand-written CSS + design tokens.** `src/styles/tokens.css`: CSS custom
  properties for a spacing scale (`--space-1..8`, 4/8/12/16/24/32/48/64 px), a color scale
  (semantic roles: `--color-bg`, `--color-text`, `--color-accent`, `--color-warning` for the
  stale-data banner, plus a small ramp), a type scale (`--font-size-100..600`), and two
  breakpoint constants consumed by media queries in the primitives. Component styles use
  **CSS Modules** — a native Vite feature (`*.module.css`), zero added dependency, still
  teaches real class-hashing/scoping mechanics. No Tailwind, no styled-components/emotion:
  a utility framework or CSS-in-JS library would either obscure or runtime-cost exactly the
  cascade/specificity fundamentals item 2/3 are checking for.
- **Layout primitives.** `src/primitives/`: `Stack` (vertical flex + gap token), `Cluster`
  (wrapping horizontal flex + gap token), `Grid` (CSS grid, responsive column count via the
  breakpoint tokens), `Box` (padding/border-radius/background from tokens), `Text` (type
  scale + semantic tag prop). Every page (`HomePage`, `StatePage`, `MunicipioPage`) composes
  ONLY these for structure — no ad-hoc flex/grid CSS in a page file — which is the literal
  wording of M1 item 2's threshold (100% of routed views' layout containers project-authored).
- **Accessibility.** Semantic landmarks (`header`/`nav`/`main`/`footer`) in the root layout,
  a skip-to-content link, `SearchCombobox` built with proper `combobox`/`listbox` ARIA roles
  and full keyboard support (arrow keys, Enter, Escape, typeahead), focus-visible styling
  from tokens. `eslint-plugin-jsx-a11y` runs in CI to catch regressions at lint time.
- **Test tooling.** Vitest (Vite-native, Jest-compatible API — the modern default, and
  hand-rolling a test runner/assertion library is not remotely relevant to M1) +
  `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`
  (RTL is the industry-standard testing convention itself — the thing to learn, not to
  reinvent) + `@vitest/coverage-v8` for the M1 item 5 coverage report, threshold-enforced
  in CI for the data layer (`lib/data/`, `lib/geo/`) at ≥80% lines.
- **Lint/format:** ESLint + `typescript-eslint` + `eslint-plugin-react-hooks` +
  `eslint-plugin-jsx-a11y`; Prettier for formatting (dev-only, not pedagogy-relevant to
  hand-roll).
- **Package manager:** npm — no pnpm/yarn; E6 says free/open npm ecosystem, and adding a
  second package manager teaches nothing on the checklist.
- **CI shape (two workflows, both in `.github/workflows/`):**
  - `ci.yml` — on every push/PR: checkout → `setup-node` (cache: npm) → `npm ci` →
    `npm run lint` → `npm run typecheck` → `npm test -- --coverage` → `npm run build`.
    Satisfies M1 item 6 and IS the M5 gate.
  - `deploy.yml` — on push to `main` (after `ci.yml`'s checks, or as a dependent job):
    `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`. (Exact
    action versions to be pinned at implementation time — not verified first-hand in this
    design pass.)
  - `data-refresh.yml` — cron `0 */6 * * *` (see Axis 1): checkout → `node
    scripts/fetch-smn.mjs` → `node scripts/partition-data.mjs` → commit `public/data/**` as
    the bot → push to `main` (which then triggers `deploy.yml` automatically via its own
    push trigger — no manual dispatch needed).

## 4. Axis 3 — Source structure

```
climx/
├── .github/workflows/
│   ├── ci.yml                 # lint+typecheck+test+build gate (M5)
│   ├── deploy.yml             # build + Pages deploy on main
│   └── data-refresh.yml       # cron fetch+partition+commit
├── public/
│   ├── 404.html                # GH Pages SPA deep-link redirect shim
│   └── data/
│       ├── meta.json           # {fetchedAt, ok, source} — staleness clock
│       ├── index/
│       │   ├── all-lite.json   # [idmun,nmun,ides,lat,lon] × 2463 — search + geo
│       │   └── estados.json    # [ides,nes] — state browse
│       └── forecast/
│           └── {idmun}.json    # 4-day array, one file per municipio (~2463 files)
├── scripts/
│   ├── fetch-smn.mjs           # Node, global fetch, no deps
│   └── partition-data.mjs      # national JSON -> public/data/**
├── src/
│   ├── main.tsx                 # ReactDOM.createRoot entry
│   ├── app.tsx                  # providers (AppState, Router) + <Router/>
│   ├── styles/
│   │   ├── tokens.css           # spacing/color/type scale + breakpoints
│   │   └── reset.css
│   ├── router/
│   │   ├── router.tsx           # hand-rolled: history, matcher, Route/Link/useParams
│   │   └── router.test.ts
│   ├── primitives/               # Stack, Cluster, Grid, Box, Text (+ .module.css each)
│   │   └── primitives.test.tsx
│   ├── lib/
│   │   ├── data/
│   │   │   ├── fetchWithCache.ts # TTL cache over localStorage + fetch
│   │   │   ├── useForecast.ts
│   │   │   ├── useMunicipioIndex.ts
│   │   │   ├── staleness.ts
│   │   │   └── *.test.ts         # coverage target ≥80% lines (M1 item 5)
│   │   └── geo/
│   │       ├── haversine.ts
│   │       ├── nearestMunicipio.ts
│   │       └── geo.test.ts
│   ├── components/
│   │   ├── ForecastCard.tsx (+ .module.css, .test.tsx)
│   │   ├── AgeBanner.tsx          # staleness UI, aria-live
│   │   ├── SearchCombobox.tsx     # ARIA combobox, keyboard nav
│   │   └── MunicipioList.tsx
│   └── pages/
│       ├── HomePage.tsx           # search + geolocation entry + state browse links
│       ├── StatePage.tsx          # /estado/:ides — municipio list
│       └── MunicipioPage.tsx      # /municipio/:idmun — forecast (heaviest data view)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── package.json
```

**Component architecture.** Pages own no layout CSS of their own — they compose primitives
and feature components. Feature components (`ForecastCard`, `SearchCombobox`, `AgeBanner`)
own their own CSS Module + one data hook each at most. **Data-layer boundary:** everything
under `lib/data/` and `lib/geo/` is pure-ish (fetch wrapped, cache/staleness/haversine are
plain functions) and framework-agnostic — no JSX in that folder — which is precisely what
makes the ≥80%-coverage target (M1 item 5) tractable: it's the easiest code in the repo to
unit test. `router/` is the one hand-rolled piece with React coupling baked in by necessity
(Context, hooks); it is kept decoupled from `pages/` behind `useParams`/`navigate` so a page
component doesn't know it isn't `react-router-dom` underneath (see weakest point, §9).
Route→page mapping: `/` → `HomePage`, `/estado/:ides` → `StatePage`, `/municipio/:idmun` →
`MunicipioPage` (replaces v0's `elementClime/:nes/:nmun`, `listComponent`, `munList/:nes`).

## 5. Full dependency list

**Runtime (2):**
| package | role |
|---|---|
| `react` | UI rendering (no viable hand-roll — this IS the framework being learned) |
| `react-dom` | DOM reconciliation target for React |

**Dev (14):**
| package | role |
|---|---|
| `typescript` | strict static typing (M1 item 1) |
| `vite` | dev server + bundler; bundler internals aren't on the M1 checklist |
| `@vitejs/plugin-react` | JSX/Fast Refresh transform for Vite |
| `vitest` | test runner (Vite-native, Jest-API-compatible) |
| `@vitest/coverage-v8` | coverage report for the M1 item 5 threshold |
| `@testing-library/react` | component testing convention (the thing to learn) |
| `@testing-library/jest-dom` | DOM assertion matchers for RTL |
| `@testing-library/user-event` | realistic keyboard/pointer interaction simulation for a11y tests |
| `jsdom` | DOM environment for Vitest component tests |
| `eslint` | lint gate (M1 item 6 / M5) |
| `typescript-eslint` | TS-aware lint rules |
| `eslint-plugin-react-hooks` | catches hook-rule violations |
| `eslint-plugin-jsx-a11y` | catches a11y regressions at lint time (M1 item 4) |
| `prettier` | formatting; not pedagogy-relevant to hand-roll |

No `react-router-dom`, no `axios`, no `alasql`, no MUI/component library, no CSS-in-JS —
all replaced by hand-rolled equivalents (§3). For comparison, v0 (surveyed read-only)
carried CRA + MUI (`@mui/material`, `@mui/icons-material`) + `axios` + `alasql` +
`react-router-dom` + unused `jquery`/`github` — 7+ direct runtime deps, all DROPPED per the
objective's smuggling check.

## 6. Budget arithmetic

**Actions minutes/month** (public repo ⇒ standard runners free/unlimited per E6-cited
evidence, so this is a discipline check, not a cost line):
- `data-refresh.yml`: 120 runs/month × ~2–3 min/run (checkout, cached `npm ci` not even
  needed if the fetch script is dependency-free, 5 MB JSON fetch+parse ~5–10 s, partition
  ~2,463 file writes ~10–20 s, git commit+push) ≈ **~300 min/month** (estimate, unverified).
- `ci.yml`: triggered by data-refresh pushes (120) + estimated human dev pushes during
  active build (~30/month) ≈ 150 runs × ~3 min (cached `npm ci` ~30–40 s, lint+typecheck
  ~20 s, test+coverage ~20–30 s, build ~15–20 s) ≈ **~450 min/month**.
- `deploy.yml`: rides on the same `main` pushes as `ci.yml`'s subset that lands on main,
  ~1 min/run (artifact upload + Pages deploy) ≈ **~150 min/month**.
- **Total ≈ 900 min/month**, against $0 cost on a public repo (unlimited standard-runner
  minutes per the objective's verified evidence) — even measured against the private-repo
  Free-plan allowance (2,000 min/month, cited from general GitHub Actions knowledge, **not
  re-verified first-hand in this pass**) this would fit, though E1 mandates public anyway so
  the comparison is moot; flagged for completeness only.

**Payload vs M4** (home JS bundle ≤150 KB gzip; municipio-view data ≤200 KB gzip):
- JS bundle: React+ReactDOM production gzip is commonly cited around ~45 KB combined
  (**unverified for the exact versions used**); hand-rolled router+primitives+data
  layer+pages is small application TS/React code, route-split so `MunicipioPage`/
  `StatePage` aren't in the home bundle — estimate **~65–90 KB gzip home bundle**, ~60–85 KB
  of headroom under the 150 KB budget (estimate, to be measured at M-0/M-4).
- Data on the municipality view: one `forecast/{idmun}.json` (~360–400 B raw) + `meta.json`
  (~150–200 B) ≈ **under 1 KB**, roughly 200–500× under the 200 KB budget — the data budget
  is not the tight constraint in this design; the bundle budget is.

**Dependency count:** 16 direct (2 runtime + 14 dev), vs v0's 7+ direct runtime deps under
a deprecated toolchain.

**Build-hours per milestone** (solo learner, LLM-assisted, **estimates, not measured**):
| milestone | est. hours |
|---|---|
| M-0 skeleton deploy | 4–6 |
| M-1 data pipeline live | 8–10 |
| M-2 municipality view + primitives | 10–14 |
| M-3 search/browse/geolocation | 10–12 |
| M-4 coverage/a11y/Lighthouse hardening | 6–10 |
| **total** | **38–52 h** |

Against E4 (solo developer, LLM assistance available) this is a multi-week part-time build,
not a weekend one — consistent with P1 (learning) outranking P4 (speed) by design.

## 7. Staged milestones

1. **M-0 — Skeleton deploy.** Vite+TS+React scaffold, tokens.css stub, hand-rolled router
   with a single `/` route, `ci.yml`+`deploy.yml` green, live on Pages. **Produces:** first
   real bundle-size number (should be tiny, sanity-checks the M4 approach) + first Lighthouse
   baseline run.
2. **M-1 — Data pipeline live.** `fetch-smn.mjs` + `partition-data.mjs` +
   `data-refresh.yml` working end to end; `meta.json` staleness stamp; forced-failure test
   (mocked fetch rejection → last-good + visible age). **Produces:** a real deployed data
   snapshot with a measurable age (should read <6 h old); the K3 degradation behavior
   demonstrated by an actual passing test, not just described.
3. **M-2 — Municipality forecast view.** Layout primitives, `ForecastCard`, `AgeBanner`,
   `/municipio/:idmun` route, `fetchWithCache`/`useForecast` wired to a real municipio id,
   a11y landmarks. **Produces:** the first real M4 measurement on the actual heaviest-data
   view + a first per-view Lighthouse run.
4. **M-3 — Search, browse, geolocation.** `all-lite.json` index load+cache,
   `SearchCombobox`, `/estado/:ides` browse, haversine nearest-municipio on
   geolocation grant/deny. **Produces:** the full named workload clickable end to end;
   second Lighthouse run (home page, the other M6 target).
5. **M-4 — Coverage/a11y/perf hardening.** Push data-layer coverage to ≥80% (measured, not
   estimated), fix a11y findings, tune bundle/code-splitting to hold the M4 line, confirm
   M6 ≥90/≥90 on both pages. **Produces:** the M1 8/8 self-assessment backed by repo
   evidence (§8) and the final M4/M5/M6 numbers on the deployed site.

Each stage ends deployed and runnable on the real GitHub Pages URL — no stage depends on a
future stage to be demoable, satisfying K5.

## 8. M1 checklist self-assessment (target 8/8, by construction)

1. **TS strict** — `tsconfig.json` `"strict": true`, `tsc --noEmit` in `ci.yml`. Binary,
   trivially verifiable.
2. **Hand-written flexbox/grid, 100% of routed-view layout containers** — `HomePage`,
   `StatePage`, `MunicipioPage` compose only `Stack`/`Cluster`/`Grid`/`Box` (§3/§4), all
   hand-written CSS Modules; zero layout from a library. Verifiable by grep: no non-primitive
   flex/grid class usage in `pages/`.
3. **Design tokens used by UI code** — `tokens.css` custom properties consumed by every
   primitive and component stylesheet (§3). Verified by inspection; no automated enforcement
   beyond convention in this design (a stylelint rule was considered and cut to keep the
   dependency count down — noted as a gap, not a blocker).
4. **A11y: landmarks + keyboard-operable** — semantic landmarks, skip link,
   `SearchCombobox` with full ARIA + keyboard support, `eslint-plugin-jsx-a11y` in CI.
5. **Tests, data layer ≥80% coverage** — Vitest+RTL, `@vitest/coverage-v8` threshold on
   `lib/data/` + `lib/geo/`, enforced in `ci.yml`.
6. **CI: lint+typecheck+test+build on every push/PR** — `ci.yml` (§3), also serves as the
   unconditional M5 gate.
7. **Explicit cache/staleness handling** — `fetchWithCache.ts` + `meta.json` + `AgeBanner`
   (§2/§3) is the centerpiece of this whole design, by construction rather than via
   react-query/SWR.
8. **URL-addressable client routing** — hand-rolled router (§3), 3 distinct route shapes,
   deep-link-capable via the `404.html` shim.

K4 (fundamentals-hidden kill criterion) is cleared by a wide margin — this design is the
opposite failure mode if anything (see §9).

## 9. Honest weakest point

The hand-rolled router is the single highest-risk piece in this design, and it is a risk to
**this design specifically**, not a generic frontend risk. It is the one place where "hand-roll
because it's on the M1 checklist" collides hardest with K5 (incrementally buildable) and P4
(delivery speed last-but-not-absent): correct History-API + `popstate` handling, dynamic
segment matching for two parameterized routes, AND the GitHub Pages `404.html` deep-link
shim are three interacting pieces of browser/hosting trivia that are individually
well-documented but easy to get subtly wrong (e.g. back-button state desync, a stale
`popstate` listener closure, or the 404 shim mangling a query string) — and a bug here does
not fail gracefully, it breaks navigation for the entire app, directly threatening M1 item 8
and the whole named workload, not just one feature. Mitigation designed in: pages consume
routing only through `useParams`/`navigate` (§4), never the router's internals directly, so
if the hand-rolled router stalls a milestone, swapping in `react-router-dom` behind that same
hook interface is a contained, scoped fallback rather than a page-level rewrite — but that
fallback would itself cost one M1 item 8 "by construction" point of pedagogical honesty, which
is exactly the trade this design is choosing to risk in exchange for the learning it targets.
