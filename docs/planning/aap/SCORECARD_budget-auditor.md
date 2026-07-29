# AT2 Adversarial Scorecard — budget-auditor lens

Judge: clean-context adversary, budget-auditor lens. Scope: `AAP_OBJECTIVE.md` (frozen
2026-07-19) vs `CANDIDATE_D1.md` / `CANDIDATE_D2.md` / `CANDIDATE_D3.md`. All resource
figures below are recomputed first-hand, not trusted from the candidates' own text.

## Recompute method (so the numbers below are checkable)

- Fresh SMN `method=1` payload, fetched 2026-07-19, `smn_fresh.json`: **9,852 records,
  5,006,007 raw bytes** — matches the objective's E3 evidence almost exactly (5.0 MB). Whole
  file re-gzipped (level 9) here = 286,420 B; objective's own cited 335 KB is the same order
  of magnitude (their number is presumably the server's own gzip framing/whitespace, not
  mine) — no red flag, informational only.
- **Critical, independently discovered fact the objective's own evidence glosses over:**
  `idmun` is **not** a globally unique municipio id. It is unique only **within a state**
  (`ides`) — the standard INEGI convention (municipio number resets per state; Oaxaca alone
  has 570 municipios, matching the max `idmun` value observed). Grouping the 9,852 records by
  `idmun` alone yields only **570** distinct values; grouping by the true key `(idmun, ides)`
  yields the expected **2,463**. Of those 2,463 true municipios, **2,110 (85.7%)** share their
  `idmun` value with at least one municipio in a *different* state (verified: `idmun=54` alone
  is reused by 15 different states). Corroborated independently by the v0 app's own code
  (`src/components/elementClime.js`, `src/hooks/location.js`): v0 always filters/routes by
  the pair `(nes, nmun)` (state + municipio name) or `(nes, idmun)` together, never `idmun`
  alone — the original developers already knew this and worked around it.
- I rebuilt each candidate's literal partition schemes against the real payload (D1's
  array-of-arrays fields, D2's object-array fields + `{ides}/{idmun}` nesting, D3's
  denormalized-object fields) and gzip'd them myself (Python `gzip`, level 9) — both the
  buggy (`idmun`-only) and true (`(idmun,ides)`) groupings, to isolate the bug's effect from
  the raw-size arithmetic.
- Package sizes cross-checked via Bundlephobia's API and independent public sources (not
  self-reported by the candidates); GitHub Pages/Actions quota text re-fetched from
  `docs.github.com` and GitHub's Dec-2025 pricing-change changelog, first-hand, today.

---

## Candidate D1 — pedagogy-max

### Gate verdict: **SCORED**

### A. Feasibility recompute (my numbers)

| item | candidate claim | my recompute | verdict |
|---|---|---|---|
| (i) per-view data payload | ~360-400 B raw/file, "under 1 KB" | TRUE per-municipio file (array-of-arrays, correctly keyed `(idmun,ides)`): **383 B raw / 191 B gzip mean** (max 215 B gzip). As literally keyed (`forecast/{idmun}.json`, idmun-only): only 570 distinct files can exist; ~85.7% of real municipios collide into a file that is either overwritten (wrong data served) or concatenated (up to 128 rows, still tiny). | **fits on bytes, FATAL on correctness** — see F2 below |
| (ii) home JS bundle | 65-90 KB gzip (est., "React+ReactDOM ~45 KB combined, unverified") | React18 combined ≈ 43.7 KB gzip is the *right* number for React 18; cross-checked public figure for **React 19 ≈ 54.9 KB gzip** (JLarky measurement, corroborated by a second source) — D1 doesn't pin a version, so the 45 KB anchor undercounts by ~10 KB if Vite's 2026 default (React 19) is used. Corrected total ≈ **75-95 KB gzip**. | fits (55-75 KB headroom under 150 KB) |
| (iii) Actions minutes/month | ≈900 min/month (300+450+150) | Arithmetic re-added: 300+450+150=900, internally consistent. Public repo ⇒ verified free/unlimited (docs.github.com, re-fetched today; also GitHub's Dec-2025 pricing changelog confirms "runner usage in public repositories will remain free," no 2026 change). | fits ($0, huge margin either way) |
| (iv) published-site size vs 1 GB cap | "~1.2 MB raw" | True-keying total (forecast+index+estados+meta) ≈ **1.07 MB raw** — close to their own estimate. Buggy (idmun-only) actual output would be *smaller* (~570 files) but wrong. Either way, ~900× under the 1 GB cap (re-verified: "Published GitHub Pages sites may be no larger than 1 GB," docs.github.com, fetched today). | fits, trivially |
| (v) git-history growth | not discussed | Data commits land directly on `main` (no orphan-branch hedge mentioned), 120 runs/month, no skip-if-unchanged-content step described (unlike D2). Over 3 years, if SMN's per-run diff is anywhere near "most fields change most runs" (plausible for live weather; **unverified** — I only have one snapshot, can't measure real update cadence), object storage could plausibly reach the low-hundreds-of-MB to low-GB range, against GitHub's own "recommended [repo] limit of 1 GB" (soft, unbilled, but real). This is the most exposed of the three designs (main-branch commits, no unchanged-skip). Note: `actions/checkout` defaults to a shallow clone (`fetch-depth: 1`), so CI checkout time is **not** materially affected by this growth — only repo storage/clone-size is. | **tight** over a multi-year horizon (soft cap, not fatal) — under-priced, F1 |

### B. Scorecard (M1-M6, frozen metrics only)

| metric | grade | justification |
|---|---|---|
| M1 Learning coverage | **3/5** | Items 1-6 solid by construction. Items 7-8 sit on top of the `idmun` bug: the router mechanism (History API/`popstate`) is genuinely hand-built, but `all-lite.json` is built by the same idmun-only partition logic implied by the file tree (`forecast/{idmun}.json` — no `ides` nesting anywhere in D1's design) — on the most literal reading of D1's own spec, the search/geolocation index would silently drop or misassign the 85.7% of municipios whose `idmun` collides. Verifiable outcome: ~6-7/8 in practice, not the claimed 8/8. |
| M2 Recurring cost | **5/5** | $0/month holds under first-hand-verified quota text; own arithmetic (900 min/month) adds up correctly and is moot anyway (unlimited). |
| M3 Freshness & degradation | **4/5** | 6 h cadence; dual-layer degrade (pipeline skip-on-fail + client `localStorage`); worst case 12-18 h on two consecutive misses, at the edge of M3's ≤12 h wording, honestly framed. |
| M4 Payload | **4/5** | Data payload trivially under cap (byte-count only — see correctness caveat above). Bundle 75-95 KB gzip (corrected) vs 150 KB cap, ~55-75 KB headroom. |
| M5 Quality gate | **5/5** | `ci.yml` structurally implements the unconditional 4-check gate exactly as required; not yet run (no repo exists), so unverifiable beyond design correctness — same for all three. |
| M6 Lighthouse | **3/5** | No deployed artifact exists to Lighthouse against; unverifiable at design time. Neutral score, same for all three. |

### Defects

- **[FATAL, F2]** Central claim "~2,463 forecast files, one per municipio" and the
  `/municipio/:idmun` routing scheme **do not survive recompute**. `idmun` is state-scoped,
  not global; 2,110 of 2,463 real municipios (85.7%) share their `idmun` with a municipio in
  another state. `forecast/{idmun}.json` can hold at most 570 distinct files, so most
  municipios either get silently overwritten by whichever state's data the partition script
  processes last, or (if concatenated) the file no longer matches the "4-day array" schema
  the client code expects. This also independently breaches the objective's unconditional
  **Quality Veto** ("must show correct forecasts for the selected municipality... a broken or
  wrong app fails regardless of every metric above") — for the majority of the country, not
  an edge case. Note: this is *not* literally a K3 breach (K3's trigger is "when SMN is
  unreachable"; this bug is unconditional, independent of SMN's reachability), but it is
  equally fatal via the Quality Veto, which the objective explicitly ranks above every metric.
- **[MAJOR, F1]** Git-history growth on `main` (data commits interleaved with app commits, no
  orphan-branch hedge, no skip-if-unchanged optimization) is an unpriced, unbounded-but-soft
  cost line — see A(v).
- **[MINOR, F1]** Bundle-size anchor (React+ReactDOM "~45 KB") undercounts by ~10 KB against
  the likely-actual React 19 default; doesn't change the fits verdict.

### Salvageables

- The explicit decision rule "hand-roll only what the M1 checklist asks the learner to
  demonstrate; take a dependency where hand-rolling teaches nothing" is a clean, reusable
  design principle regardless of which candidate is chosen.
- Decoupling pages from the router's internals behind `useParams`/`navigate` so a
  `react-router-dom` swap is a contained fallback, not a page-level rewrite — good defensive
  design.
- `aria-live="polite"` staleness banner; CSS Modules as a zero-dependency native-Vite scoping
  mechanism.

---

## Candidate D2 — industry-replica

### Gate verdict: **SCORED**

### A. Feasibility recompute (my numbers)

| item | candidate claim | my recompute | verdict |
|---|---|---|---|
| (i) per-view data payload | index.json "~180 KB raw, ~35 KB gzip"; forecast file "~300 B gzip"; first visit "≈35 KB gz" | Forecast file, correctly state-nested (`forecast/{ides}/{idmun}.json` — **no collision, verified clean**): **779 B raw / 266 B gzip mean** (max 298 B). Index.json, full 2,463-entry flat array (also collision-free by construction, since it's a list not a keyed map): **227,467 B raw / 44,938 B gzip** — my recompute is **~28% higher** than D2's own ~180 KB/~35 KB figure (not labeled "estimate" in D2's text, unlike its bundle numbers). | fits (44.9 KB vs 200 KB cap, first-visit) — under-priced by ~28%, F1 |
| (ii) home JS bundle | "≈85-95 KB gz" (React19+RD ≈45, RR ≈10, TanStack Query ≈13, app ≈15-25) | React19+RD ≈ 54.9 KB gzip (cross-checked, not D2's ~45). react-router-dom v7 **full package** ≈ 58 KB gzip (Bundlephobia); the "~10 KB" figure assumes near-perfect tree-shaking, which React Router's own team has claimed (<4 KB) but which a still-open upstream issue (`remix-run/react-router#10354`, "tree shaking is not implemented") calls into doubt for v7's data-router APIs. TanStack Query core ≈ 10.4-13 KB gzip for basic hooks (plausible, roughly matches D2's figure) — but D2 lists **three** `@tanstack/*` runtime packages (`react-query`, `query-sync-storage-persister`, `react-query-persist-client`) and budgets bundle cost for only one line item. Recomputed range: **best case ≈ 98 KB** (RR tree-shakes to ~10 KB) to **worst case ≈ 146 KB** (RR doesn't tree-shake, persister packages add their own weight) — a band that reaches the edge of the 150 KB cap, not the "55-65 KB of headroom" D2 claims. | **tight**, not "fits comfortably" — the single riskiest line item across all three candidates' bundle math, and D2 doesn't flag it |
| (iii) Actions minutes/month | ≈293 min/month (180+104+9) | Re-added: 180+104+9=293, internally consistent; cron is `0 */6 * * *` = 120 runs/month (D2's own "4 runs/day × 30" = 120, not "180" — their 180 figure is *minutes*, not runs; check out). Public repo ⇒ verified $0/unlimited. | fits, $0, huge margin |
| (iv) published-site size vs 1 GB cap | not stated as a total | True-keying total (forecast+index+meta) ≈ **2.15 MB raw**. ~465× under the 1 GB cap. | fits, trivially |
| (v) git-history growth | not directly quantified, but D2 explicitly designs a **content-hash skip-if-unchanged** step and offers an orphan-branch escape hatch as a hedge | Best-positioned of the three on this axis: the skip-if-unchanged step ties commit *frequency* to actual SMN content changes rather than cron cadence, which is the single biggest lever against unbounded git growth, and it's the only candidate that names the orphan-branch mitigation at all (even as a hedge, not a firm commitment: "does not change the contract"). | fits, best-argued of the three |

### B. Scorecard (M1-M6)

| metric | grade | justification |
|---|---|---|
| M1 Learning coverage | **4/5** | Cleanest, most defensible 8/8 of the three: no data-correctness landmine (state-scoped paths/routes verified collision-free by my recompute). Item 7 is library-mediated (TanStack Query, not hand-rolled) — D2 carries the objective's own burden-of-proof requirement reasonably, but it's still the one item where "by construction" is weakest of the checklist. |
| M2 Recurring cost | **5/5** | $0/month verified; arithmetic checks out; cron-run count corrected above (120 runs, 180 min) without changing the conclusion. |
| M3 Freshness & degradation | **4/5** | Same 6 h cadence/12-18 h worst-case math as D1. D2 is the only candidate to *name* the two-consecutive-failure gap explicitly as an unmitigated residual risk (§9) — transparency noted, not separately rewarded since the underlying numeric risk is identical to D1's. |
| M4 Payload | **3/5** | Data payload fits with real margin even after the 28% index undercount. JS bundle recompute (98-146 KB) is a genuinely tight band against the 150 KB cap that D2's own text does not surface — downgraded from the claimed "comfortable" fit. |
| M5 Quality gate | **5/5** | Structurally identical unconditional gate to the other two; unverifiable pre-build like the others. |
| M6 Lighthouse | **3/5** | Unverifiable at design time, same as the other two. |

### Defects

- **[MAJOR, F1]** Home JS bundle central claim ("≈85-95 KB gz, 55-65 KB headroom") is
  under-hedged: real-world react-router-dom v7 tree-shaking has an open upstream doubt, and
  three separate `@tanstack/*` runtime packages are budgeted as one line item. Recomputed
  band (98-146 KB) reaches the cap's edge in the worst case. Not fatal — D2's own text labels
  the number "an estimate... to be measured," so it isn't a false-confidence claim, just an
  unflagged risk on the single tightest number in the whole AAP.
- **[MINOR, F1]** `index.json` size (~180 KB raw/~35 KB gzip, stated as fact, not hedged as
  "estimate") undercounts my recompute by ~28% (227 KB raw / 44.9 KB gzip). Doesn't change
  the fits verdict (still <200 KB cap on first visit).
- **[MINOR]** "180 min/month" for `fetch-data.yml` is correct as *minutes* but is momentarily
  confusable with "180 *runs*" in the surrounding prose (actual: 120 runs × 1.5 min). No
  arithmetic error, just an easy misreading; flagged for completeness.

### Salvageables

- The naive schema-guard on the fetched payload (must parse, >2000 records) is a cheap,
  concrete defense against SMN's own documented rot mode (E3: the old endpoint 301→500'd
  once) — neither D1 nor D3 include an equivalent guard.
- Built-in GitHub email failure notification as a free "who watches the watcher" signal —
  overlooked by the other two designs.
- The content-hash skip-if-unchanged commit step is the strongest git-hygiene mechanism of
  the three and is directly grafts-able onto D1 or D3's pipelines without changing their
  architecture.
- Explicit, unprompted self-disclosure of the two-consecutive-failure staleness gap (§9) is
  itself a reusable risk-registry item, independent of which candidate wins.

---

## Candidate D3 — longevity-max

### Gate verdict: **SCORED**

### A. Feasibility recompute (my numbers)

| item | candidate claim | my recompute | verdict |
|---|---|---|---|
| (i) per-view data payload | "measured 364 B gzip" per municipio file; index.json "measured 225,282 B raw / 44,989 B gzip" | TRUE per-municipio file (denormalized object, correctly keyed `(idmun,ides)`): **894 B raw / 335 B gzip mean** (max 388 B) — D3's "364 B" single-sample figure is plausible and close to my distribution (within the observed range, mean 335/max 388). Index.json, full 2,463-entry flat array (**collision-free by construction — this file is unaffected by the `idmun` bug**, confirmed): **256,737 B raw / 45,862 B gzip** — within ~12% raw / ~2% gzip of D3's own claimed number, the best-verified figure of any candidate. BUT the per-municipio **file path** `data/municipios/<idmun>.json` and the **route** `/m/:idmun` are keyed by `idmun` alone, exactly like D1 — same collision: at most 570 distinct files/URLs can exist for 2,463 real municipios; 85.7% collide. | fits on bytes for the index; **FATAL on correctness** for the per-municipio file/route, identical class of bug to D1 (see F2) |
| (ii) home JS bundle | "estimated 55-80 KB gzip... must be confirmed" | No UI/router/query library (zero dependency risk beyond React itself). React19+RD ≈ 54.9 KB gzip (corrected anchor) + hand-rolled ~50-line router (≈1-3 KB) + app code (≈10-20 KB) ≈ **66-78 KB gzip** — closely matches D3's own range and requires the least correction of the three. | fits, largest headroom of the three (~72-84 KB under cap) |
| (iii) Actions minutes/month | "~270-330 min/month" | Re-added: 180+(60-90)+(30-60) = 270-330, internally consistent. Cron `0 */4 * * *` = 6 runs/day = 180 runs/month (matches). Public repo ⇒ verified $0/unlimited. | fits, $0, huge margin |
| (iv) published-site size vs 1 GB cap | not stated as a total | True-keying total (forecast+index+meta) ≈ **2.46 MB raw**. ~400× under the 1 GB cap. | fits, trivially |
| (v) git-history growth | **self-identified as the design's own weakest point**, quantified as "6,570 runs over 3 years, each touching up to ~2,463 files," "no natural cap" | D3's own instinct is right and is the most tightly-cadenced of the three (6 runs/day, the *most* frequent of the three, no skip-if-unchanged step mentioned) — of the three, this is the design most likely to actually hit the multi-hundred-MB range over 3 years, though it is isolated to the `gh-pages` branch (a real, credited mitigation D1 lacks — D1 pollutes `main` itself). Order-of-magnitude estimate stands: soft-cap-relevant, not billing-relevant. | **tight** over a multi-year horizon, same class as D1's finding but architecturally contained to one branch (credit) |
| (side-check) Oaxaca-bundle rejected-alternative figure | "76,492 B gzip" | My recompute of the true 570-municipio Oaxaca bundle (denormalized form): **48,765 B gzip** — 36% lower than D3's stated figure. Doesn't change their decision (they rejected per-estado bundling anyway), but it's a real arithmetic miss on a number they present as measured. | informational, MINOR |

### B. Scorecard (M1-M6)

| metric | grade | justification |
|---|---|---|
| M1 Learning coverage | **3/5** | Same `idmun`-collision class of bug as D1 hits items 7-8 for the majority of municipios. Narrower blast radius than D1: D3's `index.json` is confirmed (measurement-matched) to be a correct, complete, non-deduped flat array, so search/state-browse (part of the named workload) is **not** broken — only the direct per-municipio forecast view and deep-linking are. Still the same severity class of defect, same numeric grade, smaller footprint. |
| M2 Recurring cost | **5/5** | $0/month verified; arithmetic checks out with the largest run-count of the three (180/month) and still trivially $0. |
| M3 Freshness & degradation | **4/5** | Tightest cadence of the three (4 h, 6 runs/day) gives the best nominal margin, but D3's own text notes two consecutive misses land "right at the boundary" of the 12 h contract — zero slack in the worst case, not a clean pass. |
| M4 Payload | **4/5** | Best-verified numbers of the three (index.json and per-file gzip both landed within single-digit-to-low-teens percent of my independent recompute). Zero UI-library bundle risk. Largest headroom under the 150 KB cap. |
| M5 Quality gate | **5/5** | Structurally identical unconditional gate; unverifiable pre-build like the others. |
| M6 Lighthouse | **3/5** | Unverifiable at design time, same as the other two. |

### Defects

- **[FATAL, F2]** Same class of defect as D1: the central "one file per municipio (~2,463
  files)" claim and the `/m/:idmun` route **do not survive recompute** — `idmun` collides
  across 85.7% of true municipios, so `data/municipios/<idmun>.json` can hold at most 570
  distinct files. Independently breaches the unconditional Quality Veto for the majority of
  the country (same reasoning as D1's finding; not literally a K3 breach for the same reason
  given there). Mitigating factor relative to D1: the search/browse index (`index.json`) is
  unaffected, so this is a narrower — still fatal — defect than D1's.
- **[MAJOR, F1]** D3's own self-identified git-growth weak point is correctly instinctive but
  under-quantified in the design text ("no natural cap" with no order-of-magnitude estimate);
  my recompute agrees directionally and this is the most cadence-aggressive of the three
  (180 runs/month, no skip-if-unchanged), partially offset by the branch isolation D3
  correctly built in.
- **[MINOR, F1]** The rejected-alternative Oaxaca-bundle figure (76,492 B gzip) overstates my
  independent recompute (48,765 B gzip) by 36% — doesn't affect the chosen design since the
  alternative was rejected anyway, but is a real precision miss on a number presented as
  measured.

### Salvageables

- Disjoint data/app build paths on separate workflows and separate branch subtrees, so a
  toolchain break in one cannot take down the other — the strongest architectural insight of
  the three for the longevity axis specifically, and independent of the routing bug above.
- Explicit rejection of `method=3` hourly data as unneeded attack surface — disciplined scope
  control the other two also share implicitly but D3 argues explicitly.
- Concrete, literal forced-failure test spec (mock 500 → assert `gh-pages:/data/meta.json`
  byte-identical) is the crispest K3 instrument of the three.
- Avoiding a third-party `gh-pages`-publish Action in favor of hand-written `git` commands,
  removing one more supply-chain/ToS-churn dependency — a genuine longevity-specific win, and
  a clean example of the "boring technology" bet paying off in a way the other two don't
  argue for.
- The insight "use the source schema's own stable ids instead of accented names" is sound in
  principle (avoids URL-encoding edge cases) — it is the *scoping* of that id (state+muni,
  not muni alone) that is missing, not the underlying idea.

---

## Cross-candidate summary — my recomputed numbers

| dimension | D1 | D2 | D3 |
|---|---|---|---|
| True per-municipio forecast file (gzip, mean) | 191 B | 266 B | 335 B |
| Index/search file (gzip, full 2,463 rows) | 40.9 KB (correctly keyed) / not producible as literally spec'd | 44.9 KB (safe, collision-free) | 45.9 KB (safe, collision-free, matches D3's own claim within ~2%) |
| Per-municipio file path collision-safe? | **No** — `forecast/{idmun}.json` | **Yes** — `forecast/{ides}/{idmun}.json` | **No** — `data/municipios/<idmun>.json` |
| Route collision-safe? | **No** — `/municipio/:idmun` | **Yes** — `/estado/:nes/municipio/:idmun` | **No** — `/m/:idmun` |
| % of true municipios affected by the collision | up to 85.7% (index likely also affected) | 0% | 85.7% (index unaffected) |
| Home JS bundle, my corrected estimate | 75-95 KB gz | 98-146 KB gz (wide, unflagged risk) | 66-78 KB gz |
| M4 bundle headroom under 150 KB cap | 55-75 KB | 4-52 KB (worst-to-best case) | 72-84 KB |
| Actions minutes/month (arithmetic re-verified) | 900 | 293 | 270-330 |
| Published site raw footprint (true-keyed) | ~1.07 MB | ~2.15 MB | ~2.46 MB |
| Pages 1 GB cap margin | ~935× | ~465× | ~400× |
| Multi-year git-growth exposure | worst (main branch, no skip-if-unchanged) | best (skip-if-unchanged + orphan-branch hedge) | middle (branch-isolated, but most-frequent cron, no skip-if-unchanged) |
| FATAL defects found | 1 (idmun collision) | 0 | 1 (idmun collision, narrower blast radius) |

**GitHub quotas independently re-verified today** (not trusted from any candidate or the
objective's own citation): Actions on public repos = free/unlimited on standard runners,
reaffirmed by GitHub's Dec-2025 pricing changelog for 2026; GitHub Pages published-site cap =
1 GB exactly; Pages bandwidth soft cap = 100 GB/month; Pages source-repo recommended limit =
1 GB. All match what the objective and all three candidates assert — no smuggled or fabricated
quota found anywhere in this AAP.

**The single largest finding of this pass** is not in any candidate's own "honest weakest
point" section: `idmun` is not a global identifier in the real SMN dataset, and two of the
three candidates (D1, D3) key their per-municipio storage and routing by `idmun` alone,
which silently breaks correctness for 85.7% of Mexican municipios. D2 avoids this by
nesting on `ides` in both its file path and its route — not called out by D2 as a deliberate
defense in its own text, but present in its literal file-tree/route spec regardless.
