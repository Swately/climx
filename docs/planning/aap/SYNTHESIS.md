# AAP A3 — Convergence: chosen design + selection rationale
Supervisor: session Fable 5, 2026-07-19. Inputs: the frozen `AAP_OBJECTIVE.md` (byte-intact
since freeze), `CANDIDATE_D1/D2/D3.md`, and the three AT2 scorecards
(`SCORECARD_budget-auditor.md`, `SCORECARD_performance-realist.md`,
`SCORECARD_adoption-skeptic.md`). Supervisor first-hand re-verifications on the
load-bearing adversary claims: the `idmun` collision (recomputed against the fresh
2026-07-19 SMN payload: 570 distinct `idmun` vs 2,463 `(ides,idmun)` pairs — confirmed) and
the partition gzip sizes (spot-checked within 2–9% of both auditors' figures).

## Selection (cites scorecards, uses the frozen priority P1 > P2 > P3 > P4)

**Winner: D1 (pedagogy-max), with grafts. Working name of the composed design: CLIMX-A.**

- **P1 (M1 learning) is the frozen top priority and D1 wins it on all three lenses'
  independent re-grades.** performance-realist: "D1 is the only candidate that holds a
  clean 8/8 on M1's literal checklist" (D2 and D3 re-grade to 6 clean + 2 partial);
  adoption-skeptic scores D1's M1 highest of the three (4/5 vs 3/5, 3/5);
  budget-auditor's D1 M1 penalty (3/5) is driven entirely by the `idmun` collision, which
  the grafts below remove.
- **D1's FATAL defect is repairable by a graft the adversaries themselves flagged as
  salvage.** All three scorecards identify D2's state-nested `{ides}/{idmun}` partition +
  nested route as the collision-free construction ("directly salvageable as a pattern" —
  budget-auditor; "the per-state partition path and nested route structure" — listed under
  D2's salvageables by performance-realist and adoption-skeptic). The defect is a
  data-modeling error orthogonal to D1's angle (adoption-skeptic: "it would occur
  identically whether the router were hand-built or react-router-dom").
- **D2 as-submitted does not win under the frozen priority:** behind on P1 (M1 re-grades
  above), carries its own MAJOR addressing bugs (index missing `ides`; no deep-link shim —
  adoption-skeptic F1×2), and the tightest bundle band of the three (98–146 KB gz vs the
  150 KB cap — budget-auditor).
- **D3 as-submitted does not win:** same FATAL as D1 plus the missing shim plus the
  verified 60-day auto-disable contradiction of its own central longevity claim
  (performance-realist F2), and lowest M1 posture (no a11y lint enforcement).

## The composed design CLIMX-A (base = D1, grafts cited to their source scorecard entries)

**Base (D1, intact):** Vite + React + TypeScript strict; hand-rolled router behind
`useParams`/`navigate` hook boundary; layout primitives `Stack/Cluster/Grid/Box/Text` +
design tokens (`tokens.css`); hand-rolled `fetchWithCache` + `meta.json` + `AgeBanner`
staleness stack; `404.html` GH-Pages deep-link shim (unique among the three candidates —
flagged as D1 salvage by both performance-realist and adoption-skeptic); CSS Modules;
Vitest + RTL + coverage-v8 gate (≥80% on `lib/data/` + `lib/geo/`);
ESLint + `jsx-a11y` + hooks plugins; 16-package dependency posture; pipeline
`fetch-smn.mjs` + `partition-data.mjs` on GitHub Actions; haversine nearest-municipio.

**Grafts (each from an adversary-flagged salvageable):**

1. **Composite key everywhere** (from D2): partition `public/data/forecast/{ides}/{idmun}.json`;
   routes become `/` · `/estado/:ides` · `/estado/:ides/municipio/:idmun`; numeric ids only
   (resolves D2's own `:nes`-vs-`{ides}` inconsistency flagged by performance-realist).
   D1's `all-lite.json` index already carries `ides` per row — unlike D2's index — so the
   client can always construct the fetch path. Removes the FATAL for 85.7% of municipios.
2. **Payload schema guard** (from D2, budget-auditor salvage): fetched SMN payload must
   parse as an array, >2,000 records, sampled record carries the expected fields — else
   exit non-zero touching nothing.
3. **Content-hash skip-if-unchanged commit** (from D2, budget-auditor salvage: "directly
   grafts-able onto D1"): hash excludes the fetch timestamp; bounds git-history growth
   (answers budget-auditor's MAJOR F1 on D1's growth exposure) and bounds needless
   CI/deploy cycles (adoption-skeptic MINOR).
4. **Explicit `needs: ci` deploy gating** (from D2, adoption-skeptic salvage: "the one
   candidate that unambiguously satisfies M5 as written") — resolves D1's M5 2/5
   ("or as a dependent job" ambiguity).
5. **Independent staleness watchdog** (from D2's own §9 text, flagged as a salvageable
   "reusable risk-registry item" by budget-auditor): a second tiny scheduled workflow that
   only asserts `meta.json.fetchedAt` < 12 h and fails loudly (GitHub's free
   failed-workflow email — itself a D2 salvage) if not. Closes the
   "pipeline-stuck vs SMN-down" blindness both realists flagged (M3 findings).
6. **4-hour cadence** (from D3, credited by performance-realist as "genuinely the
   best-margined of the three — tolerates one more consecutive failure"): cron every 4 h.
7. **Forced-failure test instrument** (from D3, all three scorecards' salvage lists):
   mock SMN 500 → assert deployed `data/meta.json` byte-identical (plus D1's own
   client-side mocked-fetch degradation test).
8. **Measure-don't-estimate calibration step** (from D3, budget-auditor salvage: "the
   strongest calibration discipline of the three"): every partition/bundle size estimate is
   replaced by a measured number at its first producible milestone, recorded in the repo.

**Supervisor defect-responses (NOT grafts — labeled transparently; each answers a recorded
scorecard defect with a minimal parameter/resolution choice, for the AT4/ATF gate to judge):**

- **Cron minute offset off the top of the hour** (e.g. `23 1,5,9,13,17,21 * * *`): answers
  the shared F1 all three lenses recorded (GitHub's documented top-of-hour high-load
  delay/drop window; all three candidates scheduled exactly on the hour).
- **Resolve D1's declared either/or to "always commit `meta.json`"** (success AND failure
  runs; `ok` flag + `lastAttempt` updated, last-good `fetchedAt` preserved): this selects
  one branch of D1's own §2 text, per performance-realist's finding that this choice
  decides the 60-day auto-disable exposure (bot commits reset the inactivity clock [V2]).
- **Not grafted, with reason:** D3's two-workflow/`gh-pages`-branch full decoupling —
  conflicts with the `actions/deploy-pages` publish path (fresh data must ride a deploy to
  reach Pages anyway) and imports the same-branch git race adoption-skeptic flagged
  (MINOR-to-MAJOR); the skip-if-unchanged graft (#3) bounds the coupling cost instead.

## Post-convergence expected posture (estimates; measured at milestones per graft #8)

- M1: 8/8 by construction (D1's stack intact; collision removed). M2: $0 (≈120–180
  runs/month data + CI/deploy, unlimited public-repo minutes [V2]). M3: 4 h cadence ⇒ two
  consecutive failures to the 12 h boundary + watchdog alarm + always-commit keeps the cron
  alive. M4: bundle 75–95 KB gz (budget-auditor's corrected React 19 anchor), per-view data
  < 1 KB + ~41–46 KB index once. M5: unconditional via `needs: ci`. M6: measured at
  milestones (shim + composite keys make the municipio URL a real, correct Lighthouse
  target).

## Honest weakest point of the chosen design (named, not buried)

**The hand-rolled router remains the single highest execution risk** — D1's own §9,
seconded by performance-realist ("costs real hours and the single highest self-identified
execution risk"). Mitigation stays D1's: pages consume only `useParams`/`navigate`, so a
`react-router-dom` swap is contained; that fallback would cost M1 item 8's "by
construction" purity — the declared price of the pedagogy bet. **Residual, declared:** after
any ≥60-day total-pipeline-failure window the cron needs one manual re-enable (platform
mechanic, no in-envelope automation removes it [V2]); the top-of-hour jitter mitigation is
an offset, not a guarantee — M3's instrument (the watchdog) is what makes a breach visible
instead of silent.

## Scope of the claim (AINV-11)

CLIMX-A is the best of the three candidates generated, against the frozen objective —
nothing more. No absolute-optimality claim is made.

---

# Appendix A — ATF fix pass (2026-07-19; answers the three HOLD items, nothing else changed)

## A.1 Objective integrity record (AINV-1/12)

- **Byte-intactness reference, sealed now:** `AAP_OBJECTIVE.md` as frozen =
  **sha256 `fa656a9c0688b8b6747afc02cdfbc41a876423e651f472769d7f62f7c35b549d`**, 8,645
  bytes, mtime 2026-07-19 13:05:45. Not edited since freeze; any future audit byte-checks
  against this hash.
- **The 4 AT0 point-fixes applied pre-freeze, identified verbatim:** (1) the GitHub-quota
  `[GK]` tag closed to a `[V2]` delegated-verification citation (§Verified input evidence,
  last bullet); (2) M5 declared an unconditional gate, not a ranked metric (§Success
  metrics, the line tagged "(AT0 fix)"); (3) M1 item 2 given its threshold — "layout
  containers of 100% of routed views are project-authored" (§Success metrics, M1);
  (4) M4/M6 measurement pages named — HOME for the initial bundle, MUNICIPALITY FORECAST
  for the data payload, M6 on both (§Success metrics, M4/M6). No other edit occurred
  between draft and freeze. **Declared:** the pre-freeze draft was not snapshotted; the
  mtime chain + this record are the audit trail.
- **mtime chain (full-iso, read first-hand):** objective 13:05:45 < D2 13:08:35 <
  D1 13:12:14 < D3 13:13:52 < scorecards 13:27:57–13:29:01 < synthesis 13:31:48.
- **Durability:** committing `docs/planning/aap/` to the repo's git is the standing
  recommendation so AINV-12 becomes history-checkable — pending operator go (sessions do
  not commit without it, container standing rule).

## A.2 Designer independence (AINV-4/6)

- **Supervisor attestation (first-hand knowledge of the spawn structure):** the three
  DESIGNER agents were launched in ONE parallel message at ~13:05, before any
  `CANDIDATE_*.md` existed; each prompt carried verbatim *"You are mutually ISOLATED from
  the other designers: do NOT read any other CANDIDATE_*.md file"* — D1's prompt included
  it identically to D2/D3's. D1's file postdating D2's (13:12 vs 13:08) reflects
  concurrent agents finishing at different times, not sequential authoring.
- **Transcript check attempted and NOT RUNNABLE:** D1's task output file is 0 bytes
  (transcript not persisted by the harness); the grep instrument had nothing to read —
  declared per CONDUCT §3 (the not-run is stated, not hidden).
- **Circumstantial corroboration (from the ATF audit itself):** D1 independently
  reproduces the exact `idmun` collision D2's structure avoids — inconsistent with D1
  having read D2 before designing.

## A.3 CLIMX-A composed staged milestones (grafts + defect-responses mapped; each stage ends runnable + measurable)

| Stage | Contents (graft/DR mapping) | Est. hours | Produces (the real number) |
|---|---|---|---|
| S0 Scaffold + gates | Vite+TS+React skeleton, tokens stub, hand-rolled router `/` route, `ci.yml` + deploy with `needs: ci` [graft 4], live on Pages | 4–6 | first measured bundle gz; first green CI link |
| S1 Pipeline live | `fetch-smn.mjs` + schema guard [graft 2]; `partition-data.mjs` composite `(ides,idmun)` key [graft 1]; cron `23 1,5,9,13,17,21 * * *` [graft 6 cadence + DR-1 offset]; always-commit `meta.json` [DR-2]; skip-if-unchanged [graft 3] | 8–12 | measured index + per-file gzip replacing estimates [graft 8]; `file count == 2,463` assertion; deployed `meta.json` < 4 h old |
| S2 Watchdog + forced-failure | staleness watchdog workflow [graft 5]; pipeline forced-failure test, byte-identical `meta.json` under mocked 500 [graft 7] | 2–4 | watchdog run link; passing forced-failure test |
| S3 Municipality view | primitives, `ForecastCard`, `AgeBanner`, `/estado/:ides/municipio/:idmun` + 404 shim | 10–14 | measured M4-view data payload; client mocked-fetch degradation test green |
| S4 Search/browse/geo | `all-lite.json` (carries `ides`), `SearchCombobox`, `StatePage`, haversine | 10–12 | named workload end-to-end; **collision spot-check**: two same-`idmun` municipios in different states show distinct correct forecasts (the quality-veto instrument) |
| S5 Hardening | coverage ≥80% measured, a11y pass, bundle tuning | 6–10 | final M1 sweep; M4 numbers; M6 Lighthouse pair |

Total **40–58 h (estimate, not measured)** — deliberately above D1's pre-graft 38–52 h:
the AT3-noted graft-integration risk is priced, not ignored.

## A.4 Itemized M2/M4 arithmetic for the composed design (quota cited per line)

**M2 — $0/month:**
- Data-refresh: 6 runs/day × 30 = 180 runs × ~1.5–2.5 min = **270–450 min/mo**.
- CI+deploy rides on data commits: skip-if-unchanged [graft 3] bounds commits to SMN's
  ~daily publish ⇒ ~30/mo × ~4 min = **~120 min/mo**.
- CI+deploy on dev pushes: ~30/mo × ~4 min = **~120 min/mo** during active build → ~0
  post-handoff.
- Watchdog: 180 runs/mo × ~0.5 min = **~90 min/mo**.
- **Total ≈ 600–780 min/mo** vs quota: Actions standard runners on public repos are
  free/unlimited [V2 — docs.github.com, re-fetched independently by the AT0 and two AT2
  agents, 2026-07-19]. Pages: published site ≈ 1.1–2.5 MB (budget-auditor recomputed
  totals) vs 1 GB site cap [V2] (≥400× margin) and vs 100 GB/mo bandwidth soft cap [V2].
  External services: none. **Recurring cost: $0.**

**M4 — payload:**
- Home bundle: React 19 + ReactDOM ≈ 54.9 KB gz [V2, budget-auditor's cross-checked
  anchor] + hand-rolled router/primitives/app code ≈ 20–40 KB gz ⇒ **75–95 KB gz
  (estimate)** vs 150 KB cap; measured at S0 and re-gated at S5 before any claim.
- Municipality view: forecast file 191–388 B gz (four independent recomputes: 191/266/290 B
  per-lens shapes + 335 B supervisor full-fields) + `meta.json` ~0.2 KB + index 41–46 KB gz
  first visit (cached after) ⇒ **≤ ~47 KB gz first visit** vs 200 KB cap.
