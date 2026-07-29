# climx — measured numbers (W6 log)
Every estimate in ARCHITECTURE.md is replaced here by a real number, with date +
instrument. No entry, no claim.

| Date | Stage | Metric | Measured | Instrument / command | Cap |
|---|---|---|---|---|---|
| 2026-07-19 | S0 | Home JS bundle (gzip) | **61.00 KB** (193.07 KB raw) | `vite build` output (`dist/assets/index-CwRqvnpK.js`) | ≤150 KB (M4) — 89 KB headroom |
| 2026-07-19 | S0 | CSS (gzip) | 0.45 KB | `vite build` output | — |
| 2026-07-19 | S0 | Test suite | 9/9 green | `vitest run` (router: matcher/params/popstate/fallback) | — |
| 2026-07-19 | S0 | Lint / typecheck | clean / clean | `eslint .` / `tsc --noEmit` (TS 6.0.3 strict) | — |
| 2026-07-19 | S0 | Runtime navigation | works (real browser) | dev server + click `/`→`/lab`→back, console clean | — |

Notes:
- Coverage reports 0/0: `coverage.include` targets `src/lib/**`, which is born at S3 —
  the ≥80 % threshold gate activates then.
- Bundle is pre-primitives/pre-data; re-measured at every stage (W7 sweep).
- NOT yet run: Lighthouse (needs the deployed Pages URL — pending push/Pages-enable go)
  and the CI workflow itself (same reason). Declared, not omitted.
