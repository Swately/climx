# climx — measured numbers (W6 log)

Every estimate in ARCHITECTURE.md is replaced here by a real number, with date +
instrument. No entry, no claim.

| Date       | Stage | Metric                | Measured                     | Instrument / command                                    | Cap                           |
| ---------- | ----- | --------------------- | ---------------------------- | ------------------------------------------------------- | ----------------------------- |
| 2026-07-19 | S0    | Home JS bundle (gzip) | **61.00 KB** (193.07 KB raw) | `vite build` output (`dist/assets/index-CwRqvnpK.js`)   | ≤150 KB (M4) — 89 KB headroom |
| 2026-07-19 | S0    | CSS (gzip)            | 0.45 KB                      | `vite build` output                                     | —                             |
| 2026-07-19 | S0    | Test suite            | 9/9 green                    | `vitest run` (router: matcher/params/popstate/fallback) | —                             |
| 2026-07-19 | S0    | Lint / typecheck      | clean / clean                | `eslint .` / `tsc --noEmit` (TS 6.0.3 strict)           | —                             |
| 2026-07-19 | S0    | Runtime navigation    | works (real browser)         | dev server + click `/`→`/lab`→back, console clean       | —                             |

| 2026-07-28 | S1 | Pipeline vs live SMN | 9,852 records → **2,463 files** (32 estados) | `fetch-smn.mjs` + `partition-data.mjs` run log | == municipio count (W1 gate) |
| 2026-07-28 | S1 | `all-lite.json` (gzip) | 44,266 B | `gzip -9 \| wc -c` | ≤200 KB view budget (M4) |
| 2026-07-28 | S1 | Per-municipio file 20/54 (gzip) | 344 B | `gzip -9 \| wc -c` | — |
| 2026-07-28 | S3/S4 | Test suite | **41/41 green** | `vitest run` (router 9, pipeline 9, data 10, geo 4, hooks 5, primitives 4) | — |
| 2026-07-28 | S3/S4 | Home JS bundle (gzip) | **65.15 KB** (206.13 KB raw) | `vite build` | ≤150 KB (M4) — 85 KB headroom |
| 2026-07-28 | S5 | Coverage on `src/lib/**` | **98.46 % lines / 100 % funcs / 90.69 % branches** | `vitest run --coverage` (threshold gate 80 % wired in vite.config.ts) | ≥80 % (M1 item 5) |
| 2026-07-28 | S4 | Estado images | 32/32 converted, **1.12 MB total** (from 123 MB v0 originals) | `build-state-images.mjs` run log | — |
| 2026-07-28 | S4 | Quality-veto spot-check (W1) | PASS: `/estado/20/municipio/54` = Zahuatlán 22.7° vs `/estado/14/municipio/54` = El Limón 29.2° — distinct, both match source JSON | live browser + `python` against `public/data` | unconditional veto |
| 2026-07-28 | S4 | Runtime workload | Home (32 estados + banner "hace menos de 1 h") · combobox ARIA (expanded/activedescendant correct, diacritic-insensitive) · Enter→composite route · console clean | dev server, DOM-event-level interaction (browser pane not composited — synthetic pointer unavailable; declared) | — |

Notes:

- NOT yet run: **Lighthouse (M6)** and the **CI workflow's own first run** — both need
  the deployed Pages URL (pending the operator's push + Pages-enable go). Declared.
- The M4 view-payload number on the DEPLOYED site (with Pages' gzip) is also pending
  deploy; local artifact sizes above are its proxy, labelled as such.
