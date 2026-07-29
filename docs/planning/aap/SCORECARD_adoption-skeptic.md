# AT2 Adversarial Scorecard — lens: adoption-skeptic

Judge: clean-context adversary, foreign to all three designs. Scope: `AAP_OBJECTIVE.md`
(frozen 2026-07-19) vs `CANDIDATE_D1.md` / `CANDIDATE_D2.md` / `CANDIDATE_D3.md`. Consumers
scored against: (1) the operator, solo student, no reviewer pool (E4); (2) a hiring-manager
CV-reader; (3) the future, unattended deploy running for years.

**Verification performed first-hand for this gate** (not trusted from candidate prose):
- Re-derived GitHub Actions' scheduled-workflow (`cron:`) auto-disable behavior via web search
  against GitHub's own docs/community threads: **in a public repo, a `schedule:`-triggered
  workflow is automatically disabled after 60 days with no new commits to the repo; only
  commits reset the timer (not issues/PRs/releases); once disabled it does not silently
  re-enable itself** — confirmed against GitHub Docs ("Disabling and enabling a workflow"),
  a GitHub `orgs/community` discussion (#184653) reporting the same lived behavior, and a
  third-party writeup independently describing the identical 60-day rule. [V2, platform
  mechanic, not candidate-specific]
- Re-derived GitHub Pages' branch-vs-Actions publishing distinction via web search against
  GitHub Docs and `actions/deploy-pages`'s own repo: **the two modes differ only in whether a
  build step runs before publish; neither mode adds server-side URL rewriting** — GH Pages
  serves whatever static tree it's given, so any nested clean-path SPA route 404s on a hard
  reload/shared link unless mitigated client-side (`404.html` redirect shim or `HashRouter`).
  [V2, platform mechanic]
- Recomputed the SMN dataset's real shape first-hand, in Node, against the actual file at
  `G:\phyriad\projects\climx\src\libs\DailyForecast_MX.json` (3,506,966 bytes raw, 9,852
  records — matches the objective's E3 record count exactly): grouped by `(ides, idmun)` →
  **2,463 unique municipios, confirmed**; grouped by `idmun` alone → **only 570 unique
  values** — `idmun` (the INEGI municipal code) is scoped per state, not global. 217 `idmun`
  values are shared by 2+ municipios in different states; **2,110 of 2,463 municipios
  (85.7%) share their `idmun` with at least one municipio in a different state** (e.g.
  `idmun=54` alone resolves to 15 different municipios across 15 different states — Oaxaca,
  Tlaxcala, Estado de México, Chiapas, Puebla, San Luis Potosí, Sonora, Veracruz, Yucatán,
  Zacatecas, Chihuahua, Guerrero, Hidalgo, Jalisco, Michoacán). Also cross-verified: Oaxaca
  alone has 570 municipios (a well-known, independently-confirmable fact about Mexican
  administrative geography), which is exactly the ceiling on distinct `idmun` values found —
  consistent, high-confidence result.
- Recomputed real gzip/raw payload sizes for each candidate's proposed per-municipio JSON
  shape and index shape, by actually serializing and gzipping (Node `zlib`, level 9) records
  pulled from the real dataset above (see per-candidate M4 notes for the numbers).

---

## Candidate D1 — pedagogy-max

**Gate verdict: SCORED**

### Scorecard (1–5, fact-based)

| Metric | Score | Fact |
|---|---|---|
| M1 Learning coverage | **4/5** | 8/8 self-claimed and the most rigorously by-construction of the three (hand-rolled router, cache, primitives, all testable). But item 8 ("URL-addressable states") is undermined by a routing/partition-key bug (see F1 below) that makes most municipality URLs resolve to the wrong data as specified. |
| M2 Recurring cost | **5/5** | $0 arithmetic recomputed and internally consistent: 120 data-refresh runs/mo × ~2–3 min + ~150 CI runs/mo × ~3 min + ~150 deploy runs/mo × ~1 min ≈ 900 min/mo, unlimited/free on a public repo (per the objective's own verified E1/E3 quota). |
| M3 Freshness & degradation | **3/5** | 6 h cadence gives a full run of slack against one missed run (credible). Unaddressed: GitHub's 60-day scheduled-workflow auto-disable (verified above) — under a long SMN outage plus zero human commits, `data-refresh.yml` silently stops firing and does not resume on its own even once SMN recovers. Not modeled anywhere in D1. |
| M4 Payload | **4/5** | Per-municipio forecast payload recomputed first-hand against the real dataset for D1's exact shape (no embedded identity fields): avg **829 B raw / 290 B gzip** per file — ~2× larger than D1's own "~360–400 B raw" guess, but still ~690× under the 200 KB cap, so the conclusion is unaffected. Home-bundle estimate (65–90 KB gz) is unmeasured, self-flagged as such. |
| M5 Quality gate | **2/5** | `deploy.yml` is described as running "after ci.yml's checks, **or as** a dependent job" — the design explicitly leaves undecided whether deploy is actually gated on CI passing, which is exactly what M5 forbids being optional ("unconditional gate... not a ranked, tradeable metric"). |
| M6 Lighthouse | **3/5** | Unmeasured for all three candidates; D1 states route-level code-splitting as a lever without further detail. |

### Defects

- **F1 (Operability), FATAL as specified.** `/municipio/:idmun` route + `public/data/forecast/{idmun}.json` partition key. `idmun` is not globally unique (recomputed first-hand: only 570 distinct values across 2,463 municipios). As literally specified, `partition-data.mjs` writing one file per `idmun` will overwrite 2,110/2,463 municipios' forecast data with another state's data during partitioning — this directly breaches the Quality Veto ("must show correct forecasts for the selected municipality... a broken or wrong app fails regardless of every metric"). D1's own §6 claim of "~2,463 forecast files × ~400 B" is arithmetically false as specified — at most 570 files are producible by this key scheme. Mitigating note: the bug is self-revealing (D1's own milestone M-1 expects "file count == [implicitly] 2,463," a natural tripwire a diligent implementer would likely catch early) — but the design *as written* is broken.
- **F1 (Operability), MAJOR.** M5 gate not committed to being unconditional — see M5 scorecard row.
- **F1 (Operability), MAJOR — shared across all three candidates.** GitHub's 60-day scheduled-workflow auto-disable is unaddressed. See M3 row and cross-candidate summary.
- **F1 (Operability), MINOR.** No skip-if-unchanged logic on the data-commit step (unlike D2), so every successful 6-hourly run commits and triggers a full CI+build+deploy cycle even when SMN's payload is identical to the last run — wasteful (though still $0, so M2 is unaffected) and generates more deploy-history churn than needed.
- **F4 (Constraint smuggling):** none found. DROPPED/FORBIDDEN drivers correctly avoided; Google geocoding correctly replaced with haversine over the dataset's own lat/lon.
- **F5 (Novelty/honesty):** none found. §9's self-identified weakest point (the hand-rolled router: History API, dynamic-segment matching, the 404 shim interacting) is honestly argued and well-reasoned — it is simply not the actual worst defect in the design (the partition-key bug above is worse and wasn't found).

### Salvageable ideas (present in D1 as written)

- The layout-primitives set (`Stack`/`Cluster`/`Grid`/`Box`/`Text`) making M1 item 2's "100% project-authored layout containers" threshold mechanically true rather than aspirational.
- The `useParams`/`navigate` hook boundary that decouples page components from the router's concrete implementation — a genuine, stated fallback path (swap router without touching pages) if the hand-rolled router stalls a milestone.
- The `lib/data/` + `lib/geo/` "no JSX in this folder" boundary, which is what makes the ≥80%-coverage target for M1 item 5 tractable rather than fuzzy.
- The `404.html` GH-Pages SPA redirect shim is the *correct* mechanism for the deep-link problem (verified above as a real, necessary step on GH Pages) — D1 is the only one of the three that names it at all; it simply needs to be paired with a collision-free route key to actually work end to end.

---

## Candidate D2 — industry-replica

**Gate verdict: SCORED**

### Scorecard (1–5, fact-based)

| Metric | Score | Fact |
|---|---|---|
| M1 Learning coverage | **3/5** | 8/8 self-claimed; items 1–6 solid and library-free where it matters (no component library, so K4 is trivially cleared). Item 7 is honestly argued but library-mediated (TanStack Query *is* the mechanism). Item 8 fails twice as specified (see F1 below): the client-side index never carries the field needed to build the forecast fetch path, and there is no GH-Pages deep-link mitigation. |
| M2 Recurring cost | **5/5** | $0 arithmetic recomputed and consistent: ~180 (fetch) + ~104 (CI) + ~9 (deploy) ≈ 293 min/mo, free/unlimited on a public repo — the most minute-efficient of the three by a wide margin. |
| M3 Freshness & degradation | **3/5** | 6 h cadence with an honestly self-flagged "two-consecutive-failure gap" (the most transparent of the three about this failure class) — credit for honesty, but it doesn't close the gap. Also unaddressed: the 60-day scheduled-workflow auto-disable (shared finding, see M3 row for D1). |
| M4 Payload | **4/5** | Per-municipio shape (no embedded identity, matching D2's `{ides}/{idmun}.json` storage) recomputed at avg 829 B raw / 290 B gzip — D2's own "~600 B raw / ~300 B gzip" guess is close to this, the best-calibrated estimate of the three. Comfortably (~650×) under the 200 KB cap. |
| M5 Quality gate | **5/5** | The only candidate that explicitly wires `deploy` as `needs: ci`, `if: github.ref == 'refs/heads/main'` — unambiguously satisfies M5's "unconditional gate" framing as written. |
| M6 Lighthouse | **3/5** | Unmeasured; per-route code-splitting mentioned at Stage 5 without further detail, comparable a-priori plausibility to the other two. |

### Defects

- **F1 (Operability), MAJOR.** `public/data/index.json` ships `{idmun, nmun, nes, lat, lon}` — no `ides`. Forecast storage is keyed `forecast/{ides}/{idmun}.json`, and the route is `/estado/:nes/municipio/:idmun`. As specified, the client has no stated way to derive the numeric `ides` it needs to build the correct fetch URL from the one thing it navigated with (`nes`, a name) — confirmed by close reading of D2's own §2/§4/§5; no lookup table or second field is declared anywhere. This is not the same failure mode as D1/D3's data-loss bug (D2's storage layer is internally consistent and collision-free, since it correctly nests by `ides`) but it produces the same visible symptom: the heaviest-data, most-important view (M4's own words) cannot be reached as designed.
- **F1 (Operability), MAJOR.** No `404.html`/`HashRouter` mitigation for `react-router-dom`'s clean nested paths on GitHub Pages static hosting (verified above: neither GH Pages publishing mode adds server-side rewrites). A shared or bookmarked `/estado/.../municipio/54` URL 404s on a hard reload.
- **F1 (Operability), MINOR.** Internal inconsistency: §1 says data is "regenerated twice daily," §2/§6 specify a 4×/day cron; §3 references "the scheduled data branch" while §4's file tree shows `public/data/` living inside the ordinary `main`-branch app tree with no separate branch declared. The actual publish path for fresh data (lands on `main` and gets rebuilt, vs. a side branch needing a merge step) is not resolved.
- **F1 (Operability), MAJOR — shared.** 60-day scheduled-workflow auto-disable, unaddressed (see D1 entry).
- **F2 (Central-claim attack):** D2's bet is "nothing here should surprise a hiring manager who has shipped React in industry." The two F1 addressing/routing bugs above are exactly the class of GH-Pages-specific, route/storage-key-consistency gotcha a genuinely competent production-team PR review would catch — the claim is measurably undercut by D2's own evidence, more so than for D1/D3 since production-realism is D2's specific, declared bet.
- **F4 (Constraint smuggling):** none found.
- **F5 (Novelty/honesty), MINOR.** The CODEOWNERS-style PR template plus Husky/lint-staged "process realism" on a declared solo repo with no reviewer pool (E4) sits in tension with D2's own stated filter elsewhere ("monorepo tooling would be resume-padding, not realism") — a small inconsistency in how strictly that filter was applied to itself.

### Salvageable ideas (present in D2 as written)

- The explicit `needs: ci` deploy gate — the one candidate that unambiguously satisfies M5 as written.
- The `lib/` typed-hooks boundary (`useMunicipioForecast`, `useMunicipioIndex`) keeping all fetch/cache logic in one coverage-targetable place.
- The fixture-based data-layer test approach (`__fixtures__/sample-forecast.json`, a trimmed real-shape slice) as a concrete, checkable ≥80%-coverage mechanism.
- The explicit distinction argued in §8 item 7 between TanStack Query's own fetch-time cache state and the source data's `fetchedAtUtc` — a real, useful staleness-semantics point, argued rather than merely asserted.
- The honestly self-reported "two-consecutive-failure" weakest point — the most transparent of the three designers about this general risk class, even though it doesn't close the gap.

---

## Candidate D3 — longevity-max

**Gate verdict: SCORED**

### Scorecard (1–5, fact-based)

| Metric | Score | Fact |
|---|---|---|
| M1 Learning coverage | **3/5** | 8/8 self-claimed, most hand-rolled of the three (zero fetch/cache/router/UI library). But item 8 fails the same two ways as D2 (no GH-Pages deep-link mitigation) plus D1's collision bug (see F1), so the "URL-addressable states" claim doesn't hold for most of the map as specified. |
| M2 Recurring cost | **5/5** | $0 arithmetic recomputed and consistent: ~270–330 min/mo total, free/unlimited on a public repo, trending toward zero post-handoff since data-refresh and app-CI are on fully decoupled triggers. |
| M3 Freshness & degradation | **3/5** | 4 h cadence, most slack of the three against isolated failures. Unaddressed: the 60-day scheduled-workflow auto-disable (shared finding) — particularly consequential here since D3's entire angle is multi-year unattended operation. |
| M4 Payload | **4/5** | D3 is the only candidate that *measured* (not estimated) its per-municipio and index sizes against the real repo file. Recomputed independently here: D3's denormalized shape (embeds `idmun/nmun/ides/nes/lat/lon` per file) averages **944 B raw / 363 B gzip** — D3's own claimed "1,268 B raw / 364 B gzip" is close on gzip (essentially exact) and D3's index claim ("225,282 B raw / 44,989 B gzip") is close to the recomputed 256,005 B raw / 45,905 B gzip for the same field set — the best-verified numbers of the three, genuinely. (Minor unrelated slip: D3 cites Oaxaca at "569" municipios; the real count, confirmed here, is 570 — trivial, not load-bearing.) |
| M5 Quality gate | **2/5** | `ci.yml` and `deploy-app.yml` are two independently push-triggered workflows on `main` with no stated dependency between them — same unwired-gate gap as D1. |
| M6 Lighthouse | **3/5** | Unmeasured; zero-dependency stance gives the best a-priori odds of the three on Performance specifically, but this is a lean, not a number. |

### Defects

- **F1 (Operability), FATAL as specified.** `/m/:idmun` route + `data/municipios/<idmun>.json` partition key — the identical `idmun`-collision bug as D1 (see D1's F1 entry for the full recomputed numbers: 2,110/2,463 municipios, 85.7%, collide across state boundaries). Notable specifically for D3 because the design explicitly reasons about municipio-id stability and encoding ("using the source schema's own stable numeric ids... sidesteps URL-encoding edge cases entirely... a direct, low-cost fix over the v0 app's name-based routes") without ever checking whether `idmun` alone is actually unique — precisely the "recompute feasibility first-hand" step this whole gate exists to enforce, missed by the designer.
- **F1 (Operability), MAJOR.** No `404.html`/`HashRouter` mitigation for the hand-rolled clean-path router (`/`, `/m/:idmun`, `/estado/:ides`) — same GH-Pages deep-link gap as D2, despite D3 otherwise being the most platform-mechanics-literate candidate of the three (explicit project-page `base` reasoning, a deliberate classic-branch-mode choice with stated rationale).
- **F1 (Operability), MAJOR — shared.** 60-day scheduled-workflow auto-disable, unaddressed — see central-claim attack below for why this lands hardest on D3 specifically.
- **F1 (Operability), MINOR-to-MAJOR.** The two-workflow-same-`gh-pages`-branch git race (`git pull --rebase`, retried ≤3×) is nontrivial git plumbing for a solo learner with no reviewer (E4) to get right; a bug in the retry/rebase logic has a larger blast radius than D1/D2's approach, because it operates directly on the branch GitHub Pages is actively serving, not a side artifact.
- **F2 (Central-claim attack), the most damaging of the three.** D3's bet is "the deployed site still works untouched in 3 years... for as long as GitHub Actions and the SMN endpoint both exist." This is contradicted by the FATAL data-partition bug (breaks on day one for 85.7% of municipios, no outage or elapsed time required) and by the shared 60-day cron gap (breaks specifically in exactly the multi-year, low-activity scenario D3's whole angle is betting on). D3's own §9 "honest weakest point" — git-history growth from years of cron commits — is real but low-consequence by D3's own words ("threatens nothing in the M1–M6/kill-criteria scoring... GitHub doesn't bill free public-repo storage under normal use"). The self-audit the objective explicitly asked every designer to produce identified a cosmetic risk while missing a data-correctness bug and a platform-cron gap that both threaten the actual promise being sold.
- **F4 (Constraint smuggling):** none found — the most disciplined dependency list of the three (13 total, 2 runtime); correctly drops `axios`/`alasql`/CSS-in-JS/any component library/`react-router-dom`/any state library/`method=3`, with reasons given for each.
- **F5 (Novelty/honesty), MAJOR.** Consequence of F2: the weakest-point self-assessment (§9), though well-argued on its own narrow terms (force-push risk vs. accumulating-history is a real, reasonable trade-off to have weighed), is materially incomplete relative to what first-hand recomputation surfaces — not fabrication, but a genuine self-assessment gap on the exact axis (longevity) that is this candidate's entire reason to exist.

### Salvageable ideas (present in D3 as written)

- The two-independent-workflow / disjoint-path architecture (data pipeline and app build never touch each other's files) is a real, verifiable structural difference from D1's coupled design, where every data refresh rides through the full app CI+build+deploy pipeline regardless of whether the data changed.
- The per-municipio and index gzip figures were the only ones in any candidate actually measured against the real on-disk dataset rather than purely estimated, and independently reconfirmed here as close to accurate.
- The numeric-id-over-accented-name routing rationale is sound in principle (avoids real URL-encoding fragility) — it is simply not correctly *scoped* (see F1).
- The deliberate rejection of a third-party `gh-pages`-publish Action in favor of only GitHub-maintained actions (`checkout`, `setup-node`) is a reasonable, explicitly-argued longevity-consistent choice, and the "growing-but-safe over flat-but-riskier" reasoning about force-push risk in §9 is a genuine, well-reasoned trade-off on its own terms.

---

## Cross-candidate summary — three consumer seats

**Operator (solo student, E4, no reviewer pool).** All three designs hand the operator at
least one bug-class that a real code reviewer would normally catch before merge: D1 stacks
its self-identified router risk on top of an undiscovered partition-key bug; D2 stacks an
undiscovered index/routing-key mismatch on top of an undiscovered GH-Pages deep-link gap; D3
stacks the same partition-key bug as D1 on top of the same deep-link gap as D2, plus a
same-branch git race. None is meaningfully safer to *build correctly* than the others once
the `idmun`-scoping bug is accounted for, because that bug is a data-modeling error, not a
hand-rolled-vs-library error — it would occur identically whether the router were hand-built
or `react-router-dom`. D3's finer-grained milestone ladder (9 stages vs. D1's 5 and D2's 6)
is a genuine, real structural plus for staged risk-reduction (K5) independent of the defects
above. D2's reliance on mainstream libraries lowers *incidental* risk (more prior art per
line of code) but bought it zero protection against either of its two real bugs.

**Hiring-manager / CV reader.** None of the four routing/addressing defects found here are
visible from a quick repo skim or a home-page screenshot — they only surface once someone
actually clicks into multiple municipalities or reloads a deep link, which a fast CV review
plausibly never does. So the *presentation* risk (M4/M6, and the general "does this read as
competent" question) is lower-stakes than the *operational* risk for all three at this
horizon. Where the seat differs: D1 risks reading as either "strong fundamentals" or
"NIH/over-engineered for a portfolio piece," unresolved either way by the design itself; D2
is the one whose entire bet ("nothing should surprise an industry hiring manager") is
specifically punctured by its own bugs, since those bugs are exactly the kind that
production-realism is supposed to prevent; D3 reads as competently boring, which survives
contact with its bugs better than D2's bet does, precisely because D3 never claimed
production-polish as its selling point.

**Future, unattended (years, zero maintenance).** This is where the review converges hardest:
GitHub's 60-day scheduled-workflow auto-disable (verified above, first-hand) is a real,
documented platform behavior that none of the three designs defends against, and it targets
exactly the multi-year unattended scenario the objective's own use-case section asks to be
judged against. Layered on that shared gap, D1 and D3 carry an additional FATAL defect that
needs no elapsed time or outage at all — it manifests the first time any of 2,110 municipios
is opened, day one. D2 avoids that specific failure mode at the storage layer but reproduces
an equivalent one at the client-addressing layer, so it is not meaningfully safer in
practice, just differently broken.

**The killer question — would a boring commodity alternative simply beat each candidate for
P1>P2>P3>P4?** Not obviously, and not for the reason a first pass might suggest. The four
routing/addressing/platform defects found in this review are not hand-rolled-vs-library
problems: `idmun`'s per-state scoping is a property of the *dataset*, not the router: a
commodity `react-router-dom` config partitioned the same broken way (D1's/D3's flat
`{idmun}.json` key) would collide identically. The GH-Pages deep-link 404 is a property of
*static hosting*, not the router library: `react-router-dom`'s default `BrowserRouter` on GH
Pages has exactly the same problem D1's hand-rolled router does unless paired with the same
`404.html`/`HashRouter` mitigation — D2 proves this directly, since it already uses the
"boring commodity" router and still has the gap. The 60-day cron disable is a property of
*GitHub Actions*, unrelated to any of the three stacks. So "just use libraries" does not
purchase safety here for any candidate; what each candidate actually needed and lacked was
closer first-hand verification of its own data model and of GitHub-Pages-specific platform
behavior — a gap in rigor, not in tooling choice, and it is shared close to equally across
all three angles.
