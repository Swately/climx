# AT2 Adversarial Scorecard — lens: performance-realist

Judge: clean-context adversary, foreign to all three designs. Scored strictly against
`AAP_OBJECTIVE.md` (frozen 2026-07-19) and the three candidate files as written — no
proposed fixes, no new design. All arithmetic below was recomputed first-hand (real gzip
runs against the actual `src/libs/DailyForecast_MX.json` snapshot in the repo, real
GitHub-docs fetch for the cron-reliability claims) rather than trusted from candidate text.

## Headline finding (applies to two of three candidates, found first-hand, not claimed by
## any candidate)

`idmun` in the SMN dataset is **NOT a nationally unique municipio key** — it is scoped to
`ides` (state). Verified by parsing the repo's own `src/libs/DailyForecast_MX.json`
(9,852 records): only **570 distinct `idmun` values** exist, while there are **2,463**
actual municipios; the true unique key is the composite `(ides, idmun)` (confirmed: 2,463
distinct `(ides,idmun)` pairs, each with exactly 4 day-records). **217 of the 570 `idmun`
values are shared by more than one state, covering 2,110 of 2,463 municipios (85.7%)** —
e.g. `idmun=1` alone exists in 31 of the 32 states. Both **D1** (`forecast/{idmun}.json`,
route `/municipio/:idmun`) and **D3** (`data/municipios/<idmun>.json`, route `/m/:idmun`)
partition and route on bare `idmun`. As specified, for 85.7% of municipios this is a real
collision: the partition script's file-write step overwrites the same path once per
colliding state (only the last writer survives), and the route can never disambiguate which
of the ≤31 same-`idmun` municipios was intended — a shared/refreshed/searched URL
deterministically serves the wrong forecast for the majority of Mexico's municipios. This
is not a corner case; it trips on `idmun=1`. **D2** avoids this by construction (partition
path `forecast/{ides}/{idmun}.json`, route nested under `/estado/:nes/...`) — though its own
text frames the per-state nesting as done "purely for filesystem tidiness," not as a
correctness fix, so credit goes to the outcome, not to a stated defense. E3's own verified
evidence never surfaces this fact (it states record/municipio counts but not key
uniqueness) — all three designers inherited the same unverified assumption; only D2's
structural choice happened to be robust to it.

This directly trips the objective's **Quality veto**: "the app must show correct forecasts
for the selected municipality... A broken or wrong app fails regardless of every metric
above." Graded FATAL for D1 and D3 below.

---

# Candidate D1 — pedagogy-max

**Gate verdict: SCORED**

## A. Freshness feasibility recompute

Cadence `0 */6 * * *` (6h, 4 runs/day). Peak staleness after N consecutive failures =
(N+1)×6h. N=1 → 12h (boundary, not yet a breach under ≤12h); N=2 → 18h (breach). D1's own
text states this correctly. Two caveats D1 does not model:
- GitHub's own docs (fetched first-hand): *"The `schedule` event can be delayed during
  periods of high loads of GitHub Actions workflow runs... High load times include the
  start of every hour."* D1's cron fires exactly on the hour (`0 */6 * * *`) — precisely the
  documented high-load slot, and docs further state *"some queued jobs may be dropped"*
  under load. A single failure already sits at the 12h boundary; realistic jitter/drop risk
  pushes a **single** failure past the contract, not just two. D1 does not budget for this.
- GitHub auto-disables **scheduled** workflows after 60 days with no repository commit
  activity (verified first-hand against docs.github.com and corroborating community
  threads: bot/Actions-authored commits DO count and reset the clock, only the *presence*
  of a commit matters). D1's pipeline commits `meta.json` every run (explicitly "written
  every run, success or failure" per §2) — if the commit happens even on failed runs, this
  self-resets the clock regardless of SMN's state, so the 60-day risk is low for D1
  specifically (better than D3, see below) **provided that failure branch still writes and
  commits `meta.json`**, which D1 leaves as an implementation-time either/or ("decided at
  implementation: either skip the meta write entirely or write ok:false..." — §2). If the
  "skip the meta write entirely" branch is chosen, D1 inherits D3's exposure.

## B. Scorecard (M1–M6)

| Metric | Score | Basis |
|---|---|---|
| M1 | 5/5 | Recomputed 8/8 delivered-by-construction — the strongest of the three. Item 7 (cache/staleness) and item 8 (routing) are both hand-built with zero library mediation, the cleanest realization of the "by construction" wording. See item-by-item below. |
| M2 | 5/5 | ~900 min/month against unlimited public-repo minutes; arithmetic shown, $0 holds by a wide margin. |
| M3 | 3/5 | 6h cadence tolerates exactly 1 failure at the boundary (12h), breaches at 2; cron-jitter/high-load risk (verified GitHub caveat, unmodeled) erodes even that single-failure margin; no independent staleness watchdog decoupled from the fetch job itself. |
| M4 | 5/5 | Home bundle est. 65–90 KB gz (60–85 KB headroom under 150 KB); data payload ~1 KB per view, ~200–500× under the 200 KB cap. Both estimates plausible against my own recomputed per-file gzip sizes (see D3 section — same shape of data). |
| M5 | 5/5 | `ci.yml` runs lint+typecheck+test+build unconditionally on every push/PR, correctly wired as designed. |
| M6 | 3/5 | Only candidate that explicitly builds the GH-Pages SPA deep-link `404.html` shim, which is a real plus for measuring the municipality-view URL directly (Lighthouse's normal mode of operation). Downgraded from a would-be 4/5 because the `idmun` collision bug (above) means the municipality view Lighthouse would actually measure — for 85.7% of municipio ids — is not the municipio the tester thinks they're auditing; a functionally correct measurement target is not guaranteed. |

### M1 item-by-item (independent re-grade, not the candidate's self-assessment)

1. TS strict — delivered. 2. Hand-written layout, 100% routed views — delivered (only
`Stack/Cluster/Grid/Box`, no library layout). 3. Design tokens — delivered but
convention-only (no stylelint), a gap shared by all three, not a differentiator. 4. A11y —
delivered, `eslint-plugin-jsx-a11y` in CI (mechanically enforced, unlike D3). 5. Coverage
≥80% — delivered, CI-enforced. 6. CI gate — delivered. 7. Explicit cache/staleness —
delivered, hand-rolled, strongest version of this item across all three. 8. URL-addressable
routing — delivered as a mechanism (hand-rolled router + the one 404-shim fix in the field),
but the **quality-veto-breaking `idmun` collision** (headline finding) means the delivered
mechanism routes to wrong data 85.7% of the time as specified. Design-time construction
claim holds; real-world correctness does not.

## C. Attack on the central claim ("hand-rolling maximizes learning")

Survives against P1 better than D2/D3: under skeptical re-grading, D1 is the only candidate
that holds a clean 8/8 on M1's literal checklist (D2 and D3 both drop to 6-clean+2-partial,
see their sections). The bet is explicitly not defended on P4 (speed) — build-hour estimate
(38–52h) is mid-pack, not the slowest — so it doesn't need to be. Honest-competitor check:
the hand-rolled router (vs. `react-router-dom`) costs real hours and the single highest
self-identified execution risk (history/popstate edge cases, 404-shim query-string
mangling); the library alternative would have been cheaper and safer to build but would
have cost exactly the M1-item-8 "by construction" claim the design is explicitly buying. The
hand-rolled cache/staleness layer (vs. TanStack Query) is comparatively cheap and low-risk
by contrast — a good trade. Net: the central bet is not falsified, but its actual execution
(not its intent) is what produces this candidate's worst defect (the collision bug), which
is not a hand-roll-vs-library question at all — it is an unverified-schema-assumption bug
that would have existed under a library router too.

## D. Kill criteria

- **K3** (degrade on SMN-down) — met: `meta.json` not overwritten on failure,
  `localStorage` fallback, explicit test target described. No breach.
- **K4** (fundamentals hidden) — clears by a wide margin (self-assessed correctly).
- **K5** (solo-learner incrementally buildable) — attack on hour estimates: M-1 ("data
  pipeline live," 8–10h) bundles first-time GH Actions YAML authoring + `permissions:
  contents: write` token wrangling + a mocked-fetch test in one 8–10h window; first-time
  Actions debugging (queue latency, YAML syntax iteration) realistically runs longer for a
  genuine learner (E4's "learning TS/React" framing implies non-expert), a gap shared by all
  three, not specific to D1. D1-specific: the collision bug is very likely to surface only
  once two same-`idmun` municipios are both tested (probably during M-3, "search/browse"),
  which is **late** and **not budgeted** — fixing it requires touching the partition script,
  the route param shape, and the data hooks simultaneously, a structural rework the 38–52h
  estimate does not anticipate. This is the honest single-hardest-piece risk this design
  actually carries, not the router (which D1 correctly self-identifies as risky, but for
  execution-quality reasons, not correctness reasons).
- **K6** (unmeasurable) — mostly clear; M6 measurability is weakened by the collision bug's
  interaction with "the municipality forecast view" being an ill-defined target when 85.7%
  of ids are ambiguous.

## E. Constraint smuggling

Clean. No RN-on-web pattern, no Google geocoding, no re-introduced jQuery/alasql/CRA/MUI.
`GITHUB_TOKEN`-only, no external keyed service. No smuggling found (F4: none).

## F. Optimality honesty

No unscoped "best overall" claims; D1 stays inside its declared pedagogy-max lens
throughout and flags most of its own estimates as unverified. No F5 finding.

## Defects

- **F1 (feasibility) — MAJOR**: single-failure freshness margin sits exactly at the 12h
  boundary and is exposed to GitHub's documented top-of-hour cron delay/drop risk, unmodeled
  by the design.
- **[Quality veto / headline finding] — FATAL**: `idmun` is not a national key; 85.7% of
  municipios collide on both the file partition and the route, producing wrong forecasts for
  the selected municipality as specified.
- **F3 (K5) — MINOR**: the collision-bug rework is a real, unbudgeted, late-discovered
  addition to the build-hour estimate; the router is correctly self-flagged already.
- **F1 (M6 measurability) — MINOR** (subsumed by the FATAL finding above; listed separately
  only because it is a distinct instrument, Lighthouse-on-the-municipio-URL, that the
  collision bug also compromises).

## Salvageables (already present in D1, nothing invented)

- The `404.html` GH-Pages deep-link shim — the only one of the three candidates that
  addresses this at all.
- The fully hand-rolled `fetchWithCache.ts` + `meta.json` + `AgeBanner` staleness stack —
  the cleanest, most literal realization of M1 item 7 among the three.
- The explicit unverified/estimate flagging discipline throughout §6 (e.g., per-file gzip
  size flagged "unverified, to be measured at M-2") — good calibration hygiene, worth noting
  as the most self-aware of the three about what is measured vs. guessed.

---

# Candidate D2 — industry-replica

**Gate verdict: SCORED**

## A. Freshness feasibility recompute

Same cadence as D1 (`0 */6 * * *`), same recomputed math: single failure sits at the 12h
boundary, two consecutive failures breach it (D2's own §9 states this correctly and
explicitly owns it as the design's "honest weakest point" — the most candid of the three on
this specific point). Same unmodeled cron-jitter/high-load exposure as D1 (verified GitHub
caveat, top-of-hour scheduling). On the 60-day auto-disable: D2's pipeline explicitly
**skips empty commits when the content hash is unchanged** ("skip empty commits on
unchanged SMN payloads... 3 of 4 runs typically no-op" — §2). Since SMN publishes ~daily
(E3), a real commit still lands roughly once/day if the hash check excludes the timestamp —
but D2's text doesn't specify whether `meta.json`'s `fetchedAtUtc` is included in the
hashed content; if it is, every run's hash differs trivially and a "no-op" is never actually
skipped (fine for auto-disable, mildly wasteful) — if it is excluded correctly, real commits
land ~daily, still far under 60 days. Either reading keeps D2 clear of the auto-disable risk
addressed below for D3. This ambiguity itself is unverified and worth flagging as a MINOR
spec gap, not a real risk.

## B. Scorecard (M1–M6)

| Metric | Score | Basis |
|---|---|---|
| M1 | 3/5 | Recomputed 6 clean + 2 partial (items 7, 8) — see below. Still clears K4's ≥6/8 by-construction threshold on the strict count, but the self-claimed "8/8" does not survive a skeptical re-read on the two library-mediated items, and the design sits exactly at the boundary rather than comfortably above it. |
| M2 | 5/5 | ~293 min/month, cleanest-argued M2 arithmetic of the three (explicitly treats "unlimited" as still owing a number, matching M2's own instrument requirement). |
| M3 | 3/5 | Same cadence/margin as D1; self-flagged honestly (credit for candor), same unmodeled jitter exposure. |
| M4 | 4/5 | Home bundle est. 85–95 KB gz (55–65 KB headroom); arithmetic internally consistent (45+10+13+15–25 ≈ their claimed 85–95). Slightly tighter than D1/D3 due to two extra runtime libraries, still comfortably under budget. |
| M5 | 5/5 | Correctly wired, unconditional gate. |
| M6 | 2/5 | No GH-Pages SPA deep-link `404.html` shim anywhere in the design (verified absent — "404" does not appear in the candidate text). React Router + classic/Actions-based static hosting means a direct hit or refresh on `/estado/:nes/municipio/:idmun` returns GitHub's default 404 page, not the app. M6's own instrument ("Lighthouse... deployed production URL... municipality forecast view") normally navigates directly to that URL — as specified, that measurement would score the 404 page, not the app. This is a concrete, verifiable K6-adjacent measurability gap, unaddressed and unacknowledged in the design. |

### M1 item-by-item (independent re-grade)

1–6: delivered, same standard as D1 (jsx-a11y lint present, unlike D3). 7. Explicit
cache/staleness — **partial**: TanStack Query's `staleTime`/persister config is explicit and
inspectable (a fair point D2 argues well in its own §8/§9), but the actual caching/staleness
*algorithm* is library-internal, not something the learner had to build or fully understand
mechanically to pass — a real, if moderate, dilution of "by construction" relative to D1/D3's
from-scratch version. 8. URL-addressable routing — **partial**: `react-router-dom` delivers
the pattern in principle, but the missing 404-shim (above) means it is not actually
URL-addressable on the real, required hosting target (E2: GitHub Pages) for two of three
routes when hit directly — a first-hand-recomputed downgrade, not the candidate's own
admission. Minor separate nit: the route param is named `:nes` (state name) in
`App.tsx`/route comments but the data partition path uses `{ides}` (numeric state id) — an
internal naming inconsistency to reconcile at implementation; does not itself reproduce D1/
D3's collision bug since the underlying value routed through is still state-scoped.

## C. Attack on the central claim ("industry-mirror maximizes hireability-relevant learning")

Does not cleanly survive against the *frozen* priority ordering. P1 is scored specifically
by **M1** (the 8-item construction checklist), not by a general "hireability" construct —
D2's own framing ("nothing here should surprise a hiring manager," "a real 2026 team...")
argues for a metric that is related to but not identical with what P1 actually measures.
Under my independent M1 re-grade, D2 places behind D1 (6+2partial vs. D1's clean 8) on the
metric that is actually frozen as P1. The claim that TanStack Query "teaches" real
industry-standard cache semantics is defensible as a general employability argument, but it
is a different claim than "delivers M1 item 7 by construction," and the objective scores the
latter. Honest-competitor check: hand-rolling the router/cache-layer (D1/D3's choice) would
have cost D2 real hours but bought back the two M1 partial-credits it is currently missing;
D2's chosen libraries buy convention-fidelity and reduce build risk (well-tested code paths)
at the direct cost of the P1-ranked metric. Given P1 > P2 > P3 > P4 is the frozen order and
P1 is what's diluted, this is a real, not cosmetic, tension with the stated priority.

## D. Kill criteria

- K3 — met (persisted cache fallback + explicit error state for the true-cold-offline case,
  reasonably argued against K3's actual wording).
- K4 — clears comfortably (only one axis, data-fetching, is library-mediated; K4's own text
  requires "layout, styling, data fetching, AND a11y ALL delivered by framework black
  boxes" — plural/all — so a single axis being library-mediated does not trip K4 on its own
  wording, independent of the M1-item-level partial-credit finding above).
- K5 — hour estimate 31–48h is the lowest of the three, plausible for the scope, but the
  design's own self-declared "honest weakest point" (§9, the two-consecutive-failure
  freshness gap) is not actually the most severe risk this design carries — the missing
  404-shim (found independently, not self-disclosed) is a more concrete, more
  functionality-breaking gap than the freshness-cadence edge case D2 chose to name. The
  self-assessment under-attacks its own worst risk.
- K6 — the missing-shim gap is a direct, first-hand-verifiable threat to measuring M6 on the
  real deployed target as specified.

## E. Constraint smuggling

Clean. No component library chosen (so the burden-of-proof clause is moot by design
choice), no RN-on-web pattern, Google geocoding correctly replaced by haversine. Husky/
lint-staged/PR-template are free, no external service. No smuggling found (F4: none).

## F. Optimality honesty

**F5 finding, MINOR-to-MAJOR**: the "nothing here should surprise a hiring manager" /
"mirror what a competent production team would ship" framing implicitly claims superiority
on an axis (general industry hireability) that was never one of the frozen M1–M6 metrics —
M1 is specifically and narrowly the 8-item by-construction checklist. This is the same
underlying gap as the C-finding above, viewed as an unscoped-claim issue rather than a
priority-ordering issue.

## Defects

- **F2 — MAJOR**: central claim (hireability-relevant learning) argued against a metric
  broader than the one actually frozen as P1 (M1's literal 8-item checklist); independent
  re-grade shows D2 scoring behind D1 on that specific metric.
- **F1/K6 — MAJOR**: no GH-Pages SPA deep-link handling; M6's own instrument (Lighthouse on
  the deployed municipio URL) cannot be trusted to measure the real app as specified.
- **F5 — MINOR**: unscoped "hiring manager" framing not defended against the frozen metric
  set.
- **MINOR**: `:nes` vs `{ides}` param/path-key naming inconsistency, an implementation-time
  reconciliation, not a correctness bug.

## Salvageables (already present in D2, nothing invented)

- The per-state (`{ides}/{idmun}`) partition path and nested route structure — this is what
  avoids the FATAL collision bug found in D1/D3, and is directly salvageable as a pattern
  regardless of D2's own (non-correctness) stated rationale for it.
- The explicit "arithmetic owed even though minutes are unlimited" discipline for M2 — the
  cleanest treatment of M2's instrument requirement among the three.
- The honest §9 (freshness-gap self-disclosure) — good candor, even though it is not the
  design's most severe gap.

---

# Candidate D3 — longevity-max

**Gate verdict: SCORED**

## A. Freshness feasibility recompute

Cadence `0 */4 * * *` (4h, 6 runs/day). Peak staleness after N consecutive failures =
(N+1)×4h: N=1→8h, N=2→12h (boundary), N=3→16h (breach). D3's own text states this correctly
and it is genuinely the best-margined of the three — tolerates one more consecutive failure
than D1/D2 before touching the 12h boundary, for 1.5× the Actions runs (still trivial cost).
Same unmodeled top-of-hour cron-jitter/drop exposure as D1/D2 (all three schedule on exact
hour boundaries — verified GitHub docs caveat, unaddressed by any of the three).

**60-day scheduled-workflow auto-disable (verified first-hand against docs.github.com and
corroborating sources — GitHub disables `schedule`-triggered workflows after 60 days with no
repository commit, and per the documented community workaround pattern, an automated/bot
commit does reset that clock):** this is the sharpest finding against D3 specifically,
because D3's own central claim is that the pipeline "keeps the site's forecasts current for
as long as GitHub Actions and the SMN endpoint both exist," explicitly framed as requiring
zero further human action ("untouched... post-handoff, pushes drop toward zero" — §6). D3's
own failure-degradation design (§2) is to **write and commit nothing on a bad run** — which
means a silently-broken pipeline (SMN schema drift trips the sanity check forever, or a
sustained outage) accumulates zero commits. If that state persists 60 days with no other
repo activity (which D3's own "zero maintenance" premise guarantees, since no human is
expected to touch the repo), GitHub auto-disables the very `schedule` trigger meant to let
the pipeline self-heal once SMN recovers — the site freezes on stale data with the cron
itself now off, recoverable only by a human manually re-enabling the workflow. This is a
real, verified contradiction of the specific "still works untouched... for as long as GitHub
Actions and SMN both exist" claim, under precisely the multi-month unattended-failure
scenario that claim is supposed to cover. D3's own "honest weakest point" section names a
different, lower-stakes risk (git-history bloat) instead.

## B. Scorecard (M1–M6)

| Metric | Score | Basis |
|---|---|---|
| M1 | 3/5 | Recomputed 6 clean + 2 partial (items 4, 8) — see below. Same boundary-hugging shape as D2, plus the collision bug (headline finding) additionally undermines item 8 more severely than D2's version of the same item. |
| M2 | 5/5 | ~270–330 min/month during build-out, near-zero after; cleanest cost-decay argument of the three ($0 regardless either way). |
| M3 | 4/5 | Best pure cadence margin of the three (tolerates 2 consecutive failures vs. 1), but the 60-day auto-disable finding is a real, verified threat specifically to this design's own "runs forever untouched" framing, which is why this is not a 5. |
| M4 | 5/5 | Best-grounded numbers of the three — I independently recomputed the per-municipio gzip size against the real `DailyForecast_MX.json` snapshot using D3's exact denormalized shape: **363 B gzip average** (D3 claimed 364 B — essentially exact) and **45,905 B gzip** for the full index (D3 claimed 44,989 B — within 2%). This is the only candidate whose headline data-size claim I could independently reproduce to this precision; the other two's per-file estimates are directionally correct but rougher (D1's estimate undershoots my measured raw size by ~8–20%, though gzip is still trivially under budget either way). |
| M5 | 4/5 | Correctly wired, but the lint step has no `jsx-a11y` (or equivalent) plugin — CI enforces syntax/type/test/build gates but not the a11y regressions M1 item 4 depends on, a real (if narrow) content gap in what "green CI" actually certifies for this candidate specifically. |
| M6 | 2/5 | Same missing GH-Pages deep-link handling as D2 (verified absent from D3's text — no `404.html`/hash-routing mention despite a hand-rolled History-API router with the identical deep-link exposure as D1's router, which D1 does address). Direct-URL Lighthouse measurement on the municipio view is not reliably reachable as specified. |

### M1 item-by-item (independent re-grade)

1, 2, 3 (softly, self-flagged), 5, 6, 7: delivered, same standard as D1 (item 7 hand-rolled,
equally strong). 4. A11y — **partial**: landmarks/native-elements are hand-authored, but
unlike D1/D2, **no `eslint-plugin-jsx-a11y` or equivalent appears anywhere in D3's dependency
list** (verified by reading §5 in full) — zero automated regression enforcement for this
item, only "hand-authored... native elements only" as a design-time claim. D3 self-grades
this a flat "yes"; the missing CI backstop is a real, checkable difference from the other
two's tooling, not a subjective quibble. 8. URL-addressable routing — **partial**, for two
independent, stacking reasons: (a) the headline `idmun`-collision finding applies to D3's
`/m/:idmun` route and `data/municipios/<idmun>.json` partition exactly as it does to D1's,
and (b) D3 additionally lacks D1's 404-shim, so even a *correctly-keyed* deep link would
still 404 on direct navigation. D3 is the only candidate exposed to both failure modes at
once.

## C. Attack on the central claim ("minimal parts maximize longevity")

Internally consistent on its own terms — the styling/lint/formatter omissions (no
stylelint, no Prettier, no react-router, hand-written `git` push instead of a third-party
Action) are deliberately argued trade-offs, and each is defensible against the "fewest
moving parts" lens taken alone. But the claim does not fully survive scrutiny against what
the objective actually asks the design to guarantee: "still works... in 3 years" is falsified
under the verified 60-day auto-disable mechanic in exactly the silent-multi-month-failure
scenario the zero-maintenance premise is supposed to cover (§A above) — a real F2 finding.
Separately, and unlike the styling/lint omissions, the missing 404-shim and the
`idmun`-collision exposure are not argued trade-offs anywhere in the text — they read as
unexamined gaps, not "fewer moving parts" choices, which is a different (weaker) kind of
omission than D3's other, deliberate cuts. Honest-competitor check: the hand-rolled router
(`useSyncExternalStore` + History API, ~50 lines, smaller than D1's) is cheap and low-risk to
build relative to `react-router-dom`, and correctly avoids adding a dependency whose major
versions have historically broken APIs (a fair, defensible longevity argument) — but the
same reasoning that motivated numeric ids over accented names ("sidesteps URL-encoding edge
cases entirely," §4) was not extended to check that the numeric id was actually unique,
which is the root cause of the FATAL finding.

## D. Kill criteria

- K3 — met, same "never overwrite good data with a bad fetch" mechanism as D1, cleanly
  argued and the most explicit forced-failure test instrument of the three ("assert
  `gh-pages:/data/meta.json` is byte-identical to before").
- K4 — clears comfortably in isolation (no library layout/styling/fetching at all), though
  the missing a11y-lint enforcement is a real, if narrow, erosion of the "fundamentals
  verifiable in the repo" spirit K4 is checking for.
- K5 — hour estimate 35–55h, finest-grained milestone breakdown of the three (9 stages vs.
  D1's 5/D2's 6), which is a genuine K5 strength (smaller, more frequently-checkable
  increments lower the risk of a stalled multi-day milestone). But, like D1, the
  collision-bug rework is unbudgeted and would likely surface late (M-4/M-5, once search or
  cross-state testing happens), and D3's own self-declared "honest weakest point" (git-
  history bloat over 3 years) is real but is not the design's most severe or most immediate
  risk — both the collision bug and the missing shim are more consequential and go
  unmentioned.
- K6 — same missing-shim measurability gap as D2.

## E. Constraint smuggling

Clean. Explicitly rejects `axios`/`alasql`/CSS-in-JS/component libraries/state libraries/
`gh-pages` npm package/`method=3`, all correctly against the DROPPED list. No RN-on-web
pattern. `GITHUB_TOKEN`-only. No smuggling found (F4: none).

## F. Optimality honesty

No unscoped superiority claims beyond D3's own declared longevity angle (which is itself one
of the three angles the objective assigned) — the "works untouched in 3 years" language is
in-scope framing, not an unscoped claim; its problem is that it doesn't fully survive
scrutiny (an F2 issue, already counted), not that it reaches outside its assigned lens. No
separate F5 finding beyond what's already captured under C.

## Defects

- **[Quality veto / headline finding] — FATAL**: same `idmun` collision as D1 (85.7% of
  municipios), and D3 additionally lacks D1's 404-shim, so it carries both failure modes on
  the same route.
- **F2 — MAJOR**: the "works untouched in 3 years / as long as GitHub Actions and SMN both
  exist" central claim does not survive the verified 60-day scheduled-workflow auto-disable
  mechanic under a silent, multi-month pipeline failure — exactly the scenario the
  zero-maintenance premise is supposed to cover.
- **F1/K6 — MAJOR**: no GH-Pages SPA deep-link handling (same gap as D2).
- **F3 (K4-adjacent, M1 item 4) — MINOR**: no automated a11y lint enforcement, unlike D1/D2.
- **F3 (K5) — MINOR**: self-declared weakest point (git-history bloat) is real but not the
  design's most severe or most immediate risk; the collision bug and missing shim are more
  consequential and are not self-disclosed.

## Salvageables (already present in D3, nothing invented)

- The explicitly measured (not merely estimated) M4 data-size numbers — independently
  reproduced to within 2% against the real snapshot, the strongest calibration discipline of
  the three.
- The finest-grained milestone ladder (9 stages) — a real K5 strength in isolation from the
  correctness findings above.
- The explicit forced-failure test instrument description (byte-identical `meta.json`
  assertion) — the most concrete, directly-executable version of M3's "forced-failure test"
  requirement among the three.
- The numeric-id-over-accented-name routing rationale (§4) — sound reasoning, undermined
  only by not being carried through to key uniqueness (see FATAL finding), not by the
  reasoning itself.

---

# Cross-candidate comparison — where each design actually stalls

| | D1 pedagogy-max | D2 industry-replica | D3 longevity-max |
|---|---|---|---|
| Single most severe defect | FATAL: `idmun` collision (85.7% of municipios) | MAJOR: no GH-Pages deep-link handling + central-claim metric mismatch | FATAL: `idmun` collision + MAJOR: no deep-link handling + MAJOR: longevity claim fails under verified 60-day auto-disable |
| Where it stalls first, realistically | The hand-rolled router build (self-identified) — but the *costly* stall is the late-discovered, unbudgeted collision-bug rework once two same-`idmun` municipios are tested (likely M-3) | The TanStack Query cache/persister correctness curve (not self-identified as the top risk; the self-declared weakest point is a lower-stakes freshness-cadence edge case) | Same late-discovered collision-bug rework as D1 (likely M-4/M-5), compounding with the missing shim — the self-declared weakest point (git-history bloat) is real but not what actually threatens the build |
| M1 (P1, the frozen top priority) under independent re-grade | 8/8 clean | 6 clean + 2 partial | 6 clean + 2 partial |
| M3 cadence margin (recomputed) | 1 failure to boundary | 1 failure to boundary | 2 failures to boundary (best) |
| M6 measurability as specified | At risk only via the collision bug (deep-link itself is handled) | At risk: no deep-link handling at all | At risk on both counts simultaneously |
| Shared, unaddressed-by-all-three gap | GitHub's documented top-of-hour cron delay/drop risk, unmodeled by any candidate's freshness arithmetic; all three schedule exactly on the hour, the documented highest-load slot. | | |

Net: none of the three candidates' own "honest weakest point" sections names the defect
that this pass found to be most severe for that candidate. D1 correctly flags its highest
*execution*-risk piece (the router) but not its highest *correctness*-risk piece (the
`idmun` collision). D2 flags a real but comparatively minor freshness edge case while its
missing deep-link handling and its M1-item-7/8 dilution go unmentioned. D3 flags a slow,
non-functional git-history-growth concern while a FATAL correctness bug, a functional
deep-link gap, and a verified contradiction of its own headline longevity claim all go
unmentioned.
