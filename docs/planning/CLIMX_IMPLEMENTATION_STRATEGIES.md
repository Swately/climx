# CLIMX_IMPLEMENTATION_STRATEGIES — per-stage edit sites, contracts, validation
Tier: T1 companion to [`CLIMX_MASTER_PLAN.md`](CLIMX_MASTER_PLAN.md) (the why/walls/gates
live there; this doc is the concrete how). Status: `designed` 2026-07-19. Design identity:
[`../ARCHITECTURE.md`](../ARCHITECTURE.md). Registered in [`../REGISTER.md`](../REGISTER.md).
Convention: package versions are "latest stable at install time", pinned by
`package-lock.json` — no version numbers are asserted here that an install hasn't produced.

## S0 — Scaffold + gates

**Create** (on branch `rebuild`, repo root):
- Vite scaffold: `npm create vite@latest . -- --template react-ts` (adapted to the
  existing repo; v0's `src/` is REPLACED on this branch only — W5 keeps it on `main`).
- `tsconfig.json`: `"strict": true` plus `noUncheckedIndexedAccess: true`.
- `src/styles/tokens.css` (stub, grown at S3): CSS custom properties —
  `--space-1..8` (4/8/12/16/24/32/48/64 px), semantic colors (`--color-bg/-surface/-text/
  -accent/-warning`), type scale (`--font-size-100..600`), 2 breakpoint documentation
  comments (media queries can't read custom properties; the values are documented here
  and repeated literally in the primitives' CSS).
- `src/router/router.tsx` — the hand-rolled router, minimal at S0 (`/` only). **Public
  contract (frozen now so pages never depend on internals):**
  ```ts
  export function Router(props: { routes: Route[] }): JSX.Element;
  export function Link(props: { to: string } & AnchorAttrs): JSX.Element;
  export function useParams<T extends Record<string, string>>(): T;
  export function navigate(to: string, opts?: { replace?: boolean }): void;
  type Route = { path: string; page: React.ComponentType }; // literal + :param segments only
  ```
- `.github/workflows/ci.yml`: on push/PR → checkout → setup-node (npm cache) → `npm ci`
  → `npm run lint` → `npm run typecheck` (`tsc --noEmit`) → `npm test -- --coverage` →
  `npm run build`.
- `.github/workflows/deploy.yml`: job `deploy`, **`needs: ci`**, `if: github.ref ==
  'refs/heads/main'` (fires only after cutover; during S0–S4 verification deploys run from
  `rebuild` via a temporary `workflow_dispatch` trigger, removed at S5), using
  `actions/upload-pages-artifact` + `actions/deploy-pages`.
- `vite.config.ts`: `base` set for project-page hosting (repo has no CNAME — verified in
  the AAP survey).
- ESLint flat config with `typescript-eslint`, `react-hooks`, `jsx-a11y`; Prettier.

**Validate:** CI run green (link recorded) · Pages URL loads the skeleton ·
`npm run build` + `gzip -9` on the emitted JS = the S0 bundle number, recorded in
`docs/planning/MEASUREMENTS.md` (created now; every W6 number lands there with date +
command).

## S1 — Pipeline live

**Create:**
- `scripts/fetch-smn.mjs` (plain Node ≥18, zero deps): GET
  `https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1` → gunzip (`node:zlib`) →
  **schema guard**: `Array.isArray(d) && d.length > 2000` and a sampled record has
  `ides, idmun, nes, nmun, lat, lon, ndia, dloc, tmax, tmin, desciel` — on ANY failure:
  exit 1 having written nothing (W3).
- `scripts/partition-data.mjs`: reads the validated payload →
  - `public/data/forecast/{ides}/{idmun}.json` — key = **`${ides}/${idmun}`** (W1; the
    composite is the only key that appears anywhere in this file's code),
  - `public/data/index/all-lite.json` — per-municipio row `[ides, idmun, nmun, nes, lat,
    lon]` (array-of-arrays; `ides` FIRST, so no consumer can forget it),
  - `public/data/index/estados.json` — `[ides, nes]` pairs,
  - `public/data/meta.json` — `{ fetchedAt, ok, lastAttempt, recordCount,
    municipioCount }`; on failed runs only `ok:false` + `lastAttempt` change (W3).
  - Asserts `municipioCount === new Set(records.map(r => r.ides+'/'+r.idmun)).size` and
    that the forecast file count equals it (the S1 gate's 2,463 assertion — the number is
    read from the data, not hardcoded, in case SMN adds municipios).
- `.github/workflows/data-refresh.yml`: `on: schedule: cron: '23 1,5,9,13,17,21 * * *'`
  + `workflow_dispatch`; `permissions: contents: write`; steps: checkout → run both
  scripts → **content-hash skip-if-unchanged** (hash of `public/data/**` EXCLUDING
  `meta.json`; commit data only when it changed; `meta.json` commits every run — the
  always-commit keeps the 60-day inactivity clock reset) → `git commit` + `git push`.

**Validate:** manual `workflow_dispatch` run green → deployed `meta.json.fetchedAt` < 4 h
· the 2,463 assertion in the run log · measured raw/gzip of `all-lite.json` + a sampled
forecast file → `MEASUREMENTS.md` · a second dispatch within the hour exercises the
skip-if-unchanged path (log shows the skip).

## S2 — Watchdog + forced-failure

**Create:**
- `.github/workflows/data-watchdog.yml`: same off-hour cron; single step fetches the
  deployed `meta.json` and exits 1 if `now - fetchedAt > 12h` — GitHub's failure e-mail
  is the alarm (zero extra services, W4).
- `scripts/fetch-smn.test.mjs` (`node:test`): mocks the SMN endpoint returning 500 /
  non-array / short array → asserts the script exits non-zero and `public/data/**` is
  untouched (byte-compare before/after — the AAP's forced-failure instrument).

**Validate:** watchdog run link (green while data is fresh) · forced-failure test green in
CI (added to `ci.yml`'s test step).

## S3 — Municipality view

**Create:**
- `src/primitives/` — `Stack`, `Cluster`, `Grid`, `Box`, `Text` (+ one `.module.css`
  each, consuming only `tokens.css` vars; `Text` takes a semantic `as` prop:
  `h1|h2|p|span|...`). Props extend the native element's props
  (`React.ComponentProps<'div'>` etc.) and forward `ref` — the tap-tap lessons (dead
  props, no ref, div-only) are the anti-checklist here; a primitive prop that the
  implementation does not consume is a defect.
- `src/lib/data/`: `fetchWithCache.ts` (native fetch + `localStorage` last-good copy +
  TTL from `meta.json`), `useForecast.ts` (`(ides, idmun)` — composite, W1),
  `useMeta.ts`, `staleness.ts`; co-located `*.test.ts` against fixtures cut from the real
  payload (incl. two same-`idmun` municipios from different states — the W1 regression
  fixture).
- `src/components/`: `ForecastCard` (4-day render), `AgeBanner` (`aria-live="polite"`,
  warning tokens when stale), `ErrorState`.
- `src/pages/MunicipioPage.tsx` on route `/estado/:ides/municipio/:idmun`.
- `public/404.html` — the GH-Pages SPA shim (redirect to `index.html` with the original
  path in a query param; router restores it on boot, preserving query strings — the
  known shim pitfall named in the AAP is the test case).

**Validate:** view renders a real municipio · DevTools network: measured view payload →
`MEASUREMENTS.md` vs the 200 KB cap · client degradation test (mocked fetch rejection ⇒
last-good + visible age) green · hard reload on the deep URL lands on the view (shim
works) · W7 sweep.

## S4 — Search / browse / geolocation

**Create:**
- `src/lib/data/useMunicipioIndex.ts` (loads `all-lite.json` once, long TTL).
- `src/lib/geo/haversine.ts` + `nearestMunicipio.ts` (+ tests with known-answer pairs).
- `src/components/SearchCombobox.tsx` — ARIA combobox/listbox roles, full keyboard
  support (arrows/Enter/Escape), diacritic-insensitive match (`normalize('NFD')`).
- `src/pages/HomePage.tsx` (search + geolocation prompt + state browse) and
  `StatePage.tsx` (`/estado/:ides` — filters the index client-side).

**Validate:** the named workload clicked end-to-end (geolocation grant AND deny paths) ·
**quality-veto spot-check (W1):** pick two municipios sharing `idmun` across states
(e.g. the `idmun=54` pair Oaxaca/Jalisco from the verified collision set), open both,
confirm distinct forecasts matching the SMN payload · keyboard-only pass over the
combobox · W7 sweep.

## S5 — Hardening + cutover

**Do:** coverage report on `lib/**` ≥ 80 % (raise tests, not the threshold) · `jsx-a11y`
clean · route-level code-splitting if (and only if) the measured bundle needs it for M4 ·
README rewrite (what it is, screenshot, live URL, how it works, how to run) · remove the
temporary `workflow_dispatch` deploy trigger · **operator go → merge `rebuild` → `main`**
(v0 remains reachable at `v0-school`) · post-merge: full M1–M6 sweep with real numbers
into `MEASUREMENTS.md`, Lighthouse pair recorded.

**Validate:** every §4 exit gate of the MASTER_PLAN green, W7 full sweep, sweep table in
`MEASUREMENTS.md` cited by the README.
