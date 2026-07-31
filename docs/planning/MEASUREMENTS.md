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

| 2026-07-29 | S6 | Wikidata join | 2,377/2,463 municipios (96.5%); 87 sin join (23 ambiguos; incluye las 16 alcaldías CDMX) | `harvest-muni-images.mjs plan` log | — |
| 2026-07-29 | S6 | Cosecha de imágenes | **1,657/1,698 elegibles convertidas** (1,259 P18 + 439 portadas es-wiki − filtros − 41 fallos de descarga) | `harvest ... run` log + `find \| wc` | — |
| 2026-07-29 | S6 | Auditoría visual (14 agentes, TODAS las imágenes) | **1,657/1,657 auditadas: 1,474 ok (89.0%) · 162 bad (9.8%) · 21 suspect (1.3%)**; bad+suspect degradadas (borradas → fallback estado) | workflow `wf_08cc13b0-a04` journal | — |
| 2026-07-29 | S6 | Cobertura final de foto por municipio | **1,474/2,463 (59.8%)** con foto verificada; resto degrada a foto de estado | conteo en disco post-demolición | — |
| 2026-07-29 | S6 | Peso imágenes municipios | 71 MB WebP (640px q75) | `du -sh` | ≪ 1 GB Pages |
| 2026-07-29 | S6 | Test suite + coverage | **50/50 verdes; lib 98.93% líneas / 100% funcs / 87.17% branches** (gate 80 activo — verificado que dispara: exit 1 pre-fix con branches 71.79) | `vitest run --coverage`, exit medido sin pipe | ≥80% |
| 2026-07-29 | S6 | Bundle | 66.66 KB gzip | `vite build` | ≤150 KB (M4) |
| 2026-07-29 | S6 | Runtime (navegador) | Comondú: foto header + crédito "José González Peña · CC BY-SA 4.0" · galería viva 6 ítems del API de Commons con créditos · thumb del CDN verificado eager 330×220 · `/creditos` 31 grupos · consola limpia | dev server + DOM checks | — |

Notes:

- NOT yet run: **Lighthouse (M6)** and the **CI workflow's own first run** — both need
  the deployed Pages URL (pending the operator's push + Pages-enable go). Declared.
- The M4 view-payload number on the DEPLOYED site (with Pages' gzip) is also pending
  deploy; local artifact sizes above are its proxy, labelled as such.
- Gallery lazy-thumbs report 0-loaded under the non-compositing preview pane (lazy
  loading needs a real rendered viewport); the thumb URL itself verified loadable
  eagerly (330×220). Declared, not hidden.
- CDMX: 0 fotos de municipio (las alcaldías quedan fuera de la clase Wikidata del join)
  — degradan a la foto del estado. BC: 4/5.

## Deploy final (2026-07-29, sitio VIVO en https://swately.github.io/project-tw/)

| Metric                                  | Measured LIVE                                                                                                      | Cap       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| CI real (main)                          | checks: success · deploy: success (runs 30493221560+)                                                              | M5 ✓      |
| Data en vivo                            | `meta.json.fetchedAt = 2026-07-29T21:40:19Z` — el workflow de refresh fetch→commit→build→deploy probado end-to-end | M3 ✓      |
| Lighthouse HOME (mobile)                | **Performance 90 · Accessibility 100**                                                                             | ≥90/≥90 ✓ |
| Lighthouse MUNICIPIO (mobile, vía shim) | **Performance 100 · Accessibility 98** (finalUrl = ruta real: shim verificado en vivo)                             | ≥90/≥90 ✓ |
| Fix cazado en producción                | pushes de `GITHUB_TOKEN` no encadenan workflows → data-refresh ahora se auto-despliega (commit `main`)             | —         |
| v0 preservada                           | tag `v0-school` pusheado; cutover ff `103ab02..abee461`                                                            | W5 ✓      |

**M1–M6: TODAS las métricas del objetivo congelado, medidas en el target real. El sweep del §6 "Done means" está completo.**

## Corrección de diseño 2026-07-31 (revisión del operador + barrido de errores)

Reporte de usuario: 404s intermitentes en consola (`data/commons/9/12.json`, ×2).
Diagnóstico verificado de primera mano: **no era externo, era nuestro y determinista** —
(a) `useMuniSidecar` se llamaba en `MunicipioPage` **y** en `MuniHeader` ⇒ dos peticiones
del mismo archivo; (b) 989 de 2,463 municipios no tenían sidecar ⇒ 404 garantizado en el
40% del sitio (Tlalpan = alcaldía CDMX, sin foto). Parecía intermitente porque dependía
del municipio visitado.

| Antes | Después |
| --- | --- |
| 1 archivo sidecar por municipio (2,463) + `credits.json` | **1 índice** `images.json` (2,025 entradas, 59 KB gz) que **solo** carga `/creditos` |
| 2 peticiones extra por vista de municipio (una duplicada) | **0 extra** — el dato viaja dentro del pronóstico como `img` |
| 404 auto-infligido en 989 municipios | imposible por construcción (campo ausente = sin foto) |
| galería solo si había foto | **+551 municipios** ganan galería (tienen categoría Commons sin foto) |
| forecast 3/1 = 344 B gz | 463 B gz (≪ 200 KB, M4) |

Verificado tras el cambio: lint/tsc/prettier limpios · **51/51 tests** (incl. 2 nuevos: el
merge respeta la llave compuesta y no filtra entre estados; sin índice los pronósticos
salen byte-idénticos ⇒ core meteorológico independiente) · cobertura lib 98.92% ·
navegador: Tlalpan **0 peticiones fallidas** cayendo a foto de estado; Comondú con foto,
crédito y galería de 6 ítems, `failedRequests: []`.

Incidencia observada durante el trabajo: **el endpoint del SMN devolvió HTTP 500** en una
corrida (`fetch-smn.mjs` salió sin escribir nada — wall W3 funcionando). Confirma que la
fuente es intermitente y que el guard + watchdog no son decorativos.
