# CLIMX_MASTER_PLAN — the CLIMX-A rebuild, planned
Tier: **T1 — Substantial** (PLAN_TIER §1: multi-step, architecture-touching; no §1.1
qualifying risk — static site, no crash/concurrency/security/data-loss/dogma surface; the
pipeline's failure mode is "touch nothing", and the one credential in v0 is being removed,
not handled). Status: `designed` 2026-07-19, awaiting operator go per stage.
Siblings: [`CLIMX_IMPLEMENTATION_STRATEGIES.md`](CLIMX_IMPLEMENTATION_STRATEGIES.md) (the
per-stage edit sites + validation) · design identity: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
(CLIMX-A, AAP-selected — this plan implements it, it does not re-decide it) · search
record: [`aap/`](aap/). Registered in [`../REGISTER.md`](../REGISTER.md).

## §1 Why (one paragraph, the rest is links)

Rebuild the 2023 school app (tag `v0-school`) into the CLIMX-A design: a living,
$0-recurring, CV-grade municipal weather site whose construction itself teaches the
frozen objective's M1 checklist. The objective, metrics, and priority are FROZEN in
[`aap/AAP_OBJECTIVE.md`](aap/AAP_OBJECTIVE.md) — this plan inherits them and adds only
execution order, gates, and discipline.

## §2 The walls (constraints every stage obeys; violating one = stop and report)

- **W1 — Composite key everywhere.** `idmun` is state-scoped (570 values / 2,463
  municipios, verified 2026-07-19). Any path, route, map key, or lookup keyed by `idmun`
  alone is a defect on sight.
- **W2 — The browser never talks to SMN** (no CORS); only the Actions pipeline fetches.
- **W3 — Never overwrite good data.** A failed/invalid fetch touches nothing except
  `meta.json`'s `ok`/`lastAttempt` fields (last-good `fetchedAt` preserved).
- **W4 — $0 and GitHub-only.** No external service, no key, no free-tier third party.
- **W5 — v0 is never deleted.** The rebuild lives on branch `rebuild`; `main` keeps v0
  intact until the S5 cutover; tag `v0-school` and history are permanent.
- **W6 — Measured before claimed.** Every "estimate" in ARCHITECTURE.md is replaced by a
  measured number at the stage that first produces it; no metric claim without its
  instrument run (CONDUCT §2/§3).
- **W7 — No-regression gate per stage** (operator standing rule): before a stage is
  declared done, the previous stages' checks re-run green; "Not Run" is never reported as
  passing.

## §3 Execution discipline (the operator's step-by-step contract)

1. Work happens on branch **`rebuild`** of the climx repo.
2. **Each stage ends with:** (a) its named number measured, (b) the no-regression sweep
   (W7), (c) a report to the operator, (d) **commit only on operator go** — one commit per
   verified stage, message citing the stage id. Nothing is pushed without the same go.
3. Authorship signature (`Made with my soul - Swately <3`) on every code file, per
   container rule.
4. Discoveries that contradict the design (e.g. a measured number breaking an M4 cap) are
   reported before proceeding — the design identity is frozen; deviations are operator
   decisions, not silent adjustments.

## §4 Phases and gates (the S-ladder; details per stage in IMPLEMENTATION_STRATEGIES)

| Stage | Scope (one line) | Exit gate (all must hold) |
|---|---|---|
| **S0** Scaffold + gates | Vite+React+TS-strict skeleton, tokens stub, router `/` route, `ci.yml` + `deploy.yml` (`needs: ci`), live on Pages | CI green link · site loads on the Pages URL · **measured** first bundle gz · Lighthouse baseline run |
| **S1** Pipeline live | `fetch-smn.mjs` (schema guard) + `partition-data.mjs` (composite key) + `data-refresh.yml` (4 h off-hour cron, always-commit meta, skip-if-unchanged) | deployed `meta.json` < 4 h old · **file count == 2,463** asserted · measured partition sizes recorded (replacing estimates) |
| **S2** Watchdog + forced-failure | `data-watchdog.yml` + pipeline forced-failure test | watchdog run link · forced-failure test green (meta byte-identical under mocked 500) |
| **S3** Municipality view | primitives, `ForecastCard`, `AgeBanner`, `/estado/:ides/municipio/:idmun`, `404.html` shim | view renders real data for a chosen municipio · **measured** M4 view payload · client degradation test green · deep-link hard-reload works |
| **S4** Search / browse / geo | `all-lite.json` index, `SearchCombobox` (ARIA), `StatePage`, haversine nearest | named workload end-to-end · **quality-veto spot-check: two same-`idmun` municipios in different states show distinct, correct forecasts** (checked against the SMN source) |
| **S5** Hardening + cutover | coverage ≥80 % measured, a11y pass, bundle tuning, README, merge `rebuild`→`main` | full M1–M6 sweep with real numbers · M6 ≥90/≥90 both pages · operator go for the cutover merge |

Estimated total 40–58 h (estimate, not measured; integration risk priced — see
`aap/SYNTHESIS.md` A.3).

**Resequencing history:** 2026-07-19 the operator first ordered a primitives-first
interactive ladder; later the same day superseded it — **full autonomous build, no
per-stage review stops** ("no tengo tiempo para hacer el proyecto lentamente
aprendiendo... desarrollarlo por completo... sin que me pare a revisarlo"). The ladder
reverts to S0→S5 in order; per-stage local commits proceed without per-stage gos; the
single remaining operator stop is at the END: push + enable Pages (+ the S5 cutover
merge rides on that same go). Lighthouse and the live CI run are deploy-dependent and
stay declared-not-run until then.

## §5 What this plan does NOT cover (explicit non-scope)

GitHub repo rename (`project-tw`→`climx`) — operator action; when done, `homepage` +
Pages URL move together (touchpoint pair). Old Google key revocation — operator action.
`method=3` hourly data, dark mode, PWA/service worker — out of scope (candidates
considered and the design rejected them; reopening is an operator decision). Lifting the
primitives to a `catalog/typescript` substrate — blocked until a second consumer project
exists (no-speculative-layers rule).

## §6 Done means

All six §4 exit gates green, the M1–M6 sweep recorded in the repo with measured numbers,
v0 preserved under its tag, and the deployed site serving fresh SMN data on the named
workload. Anything less is reported as exactly what it is.
