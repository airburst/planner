# Gap Tasks — updated 2026-05-02

Prioritised engineering backlog derived from `gaps.md`. Tasks are ordered by impact on
usability. Each task is self-contained: it states what to build, why it matters, what
files to touch, and the definition of done.

Task ID format: G<priority>-T<seq>
Priority tiers: P1 = critical path, P2 = high value, P3 = medium, P4 = low/deferred

## Status Checkpoint — 2026-05-02

Recent landed work:
- ACC-T1 Accumulation engine (year < retirementYear branch, contributions applied)
- ACC-T2 Employer pension contributions (column + UI for SIPP)
- ACC-T5 Onboarding contribution capture (annual + employer)
- ACC-T4 Retirement-pot metric in ProjectionSummary (partial)
- G2-T6 Household-level drawdown + SIPP TFLS + per-person tax (major fix — was 2× over-drawing)
- Cash-flow chart redesign — stacked sources, gradients, rounded tops, toggleable spending target
- DOB pro-rata fixes:
  - Income stream activation year (whole months after birthday)
  - Retirement year contributions (months before birthday)
  - Retirement year drawdown (months after birthday)

**Next suggested task**: ACC-T6 (gap-to-target recommendation).

Sprint sequence below has been re-ordered to reflect actual remaining work.

---

## Priority 1 — Critical path (app is not usable without these)

### ~~G1-T1: Capture date of birth in onboarding~~ ✅ DONE
Added `primaryDateOfBirth` / `partnerDateOfBirth` to `OnboardingState`. Date inputs
added to `steps/household.tsx`. `retirement-timing.tsx` shows "Currently X — retiring
in Y years" hint. `onboarding/index.tsx` passes DOB to `createPerson.mutateAsync`.

---

### ~~G1-T2: Surface onboarding errors to the user~~ ✅ DONE
`handleComplete` now has a `submitError` state. Inline error banner displayed below
the step card on any mutation failure; button re-enables.

---

### ~~G1-T3: Plan editing — people, accounts, income streams~~ ✅ DONE
All four sub-tasks complete:

- **G1-T3a** — `PeoplePanel.tsx`: inline edit for name, DOB, retirement age, SP age.
- **G1-T3b** — `AccountsPanel.tsx`: add/edit/delete with name, type, balance,
  contribution, owner. `useDeleteAccount` added to `use-accounts.ts`.
- **G1-T3c** — `IncomeStreamsPanel.tsx`: add/edit/delete with all fields including
  inflation-linked and taxable toggles. `useDeleteIncomeStream` added.
- **G1-T3d** — `SpendingPanel.tsx`: create/edit expense profile with essential and
  discretionary sliders.

All four panels rendered in a "Setup" grid section in `plan/[id]/index.tsx`. All
mutations invalidate `projection.forPlan(planId)`.

---

### ~~G1-T4: Persist essential/discretionary spending split~~ ✅ DONE
`spending-target.tsx` rewritten with total + essential sliders; discretionary is
derived. `onboarding/index.tsx` calls `createExpenseProfile.mutateAsync`. IPC handlers
in `public/ipc/expense-profiles.js` created. `src/hooks/use-expense-profiles.ts`
created with `useExpenseProfileByPlan`, `useCreateExpenseProfile`,
`useUpdateExpenseProfile`.

---

## Priority 2 — High value (core product features)

### ~~G2-T1: UK tax threshold management~~ ✅ DONE
**Why**: Tax bands change every April. Currently all thresholds (personal allowance
£12,570, basic rate band £50,270, higher rate £125,140) are hardcoded in
`projections.js`. Users have no way to update them without editing source code.

`public/ipc/assumption-sets.js` — CRUD handlers: `getByPlan`, `create`, `update`,
`delete`. Registered in `public/electron.js` and exposed via `public/preload.js`.
`src/types/electron.d.ts` — `AssumptionSet` / `NewAssumptionSet` types and Window API
methods. `src/hooks/query-keys.ts` — `assumptionSets.byPlan`. `src/hooks/use-assumption-sets.ts`
— `useAssumptionSetByPlan`, `useCreateAssumptionSet`, `useUpdateAssumptionSet`,
`useDeleteAssumptionSet`; mutations invalidate projection. `src/pages/plan/[id]/AssumptionsPanel.tsx`
— collapsible panel showing tax year label, thresholds, rates, inflation, growth; shows
"using defaults" badge when no custom row exists. Engine (`projections.js`) already reads
from `assumptionSets` table and falls back to hardcoded 2026 UK defaults — no changes needed.

---

### ~~G2-T7: One-off income / windfalls~~ ✅ DONE
`one_off_incomes` table (migration 0002). Engine accepts an optional
`oneOffIncomes` array; in the matching year, non-taxable amounts reduce the
household deficit, taxable amounts also reduce deficit AND flow into the owner's
tax base (folded into investmentIncome bucket). `findGapToTarget` threads them
through the binary search. Full IPC + hooks + `OneOffIncomesPanel` rendered in
plan-detail Setup grid. Optional `personId` for tax attribution; `null` =
household-level non-taxable cash.

### G2-T7 (legacy spec):
**Why**: Users may receive a lump-sum inheritance, property sale proceeds, or bonus at
a specific age/year. There is currently no way to model this. Without it, plans that
depend on a windfall to bridge a gap are significantly under-projected.

**Approach**: New `one_off_incomes` table: `planId`, `personId` (optional), `name`,
`year` (calendar year), `amount`, `taxable` (boolean).

**Files**:
- Schema: add `oneOffIncomes` table with migration
- `public/ipc/one-off-incomes.js` — CRUD handlers: `getByPlan`, `create`, `update`,
  `delete`
- `public/electron.js` + `public/preload.js` — register handlers and expose to
  renderer
- `src/types/electron.d.ts` — add `OneOffIncome` type and IPC method signatures
- `src/hooks/use-one-off-incomes.ts` — `useOneOffIncomesByPlan`, `useCreateOneOffIncome`,
  `useUpdateOneOffIncome`, `useDeleteOneOffIncome`; all mutations invalidate projection
- `src/pages/plan/[id]/OneOffIncomesPanel.tsx` — list + add/edit/delete inline form;
  fields: name, year (number input), amount (£), taxable toggle
- `src/pages/plan/[id]/index.tsx` — render in Setup section
- Engine `public/ipc/projections.js` — in each projection year, add any `oneOffIncomes`
  where `income.year === currentYear` to household income before tax; if `taxable`,
  include in taxable income; if not, add directly to spendable cash

**DoD**: User can enter "Inheritance, 2031, £80,000, non-taxable"; projection shows
a cash injection in that year reducing drawdown from savings.

---

### ~~G2-T8: One-off expenditures at specific dates~~ ✅ DONE
`one_off_expenses` table. Engine adds matched-year expense to that year's
adjusted spending → flows through the deficit calc. Full IPC + hooks +
`OneOffExpensesPanel` rendered alongside the income panel. Optional notes
field for human context.

### G2-T8 (legacy spec):
**Why**: Large one-off withdrawals (new car, home renovation, care costs, gifting)
break the assumption of constant annual spending. Without them, plans that include
known future costs are over-optimistic.

*Supersedes G4-T4 (promoted from deferred to high priority).*

**Approach**: New `one_off_expenses` table: `planId`, `name`, `year`, `amount`,
`description` (optional).

**Files**:
- Schema: add `oneOffExpenses` table with migration
- `public/ipc/one-off-expenses.js` — CRUD handlers: `getByPlan`, `create`, `update`,
  `delete`
- `public/electron.js` + `public/preload.js` — register and expose
- `src/types/electron.d.ts` — add `OneOffExpense` type and IPC method signatures
- `src/hooks/use-one-off-expenses.ts` — `useOneOffExpensesByPlan`, `useCreateOneOffExpense`,
  `useUpdateOneOffExpense`, `useDeleteOneOffExpense`; all mutations invalidate projection
- `src/pages/plan/[id]/OneOffExpensesPanel.tsx` — list + add/edit/delete inline form;
  fields: name, year, amount (£), optional description
- `src/pages/plan/[id]/index.tsx` — render in Setup section
- Engine `public/ipc/projections.js` — in each projection year, add any `oneOffExpenses`
  where `expense.year === currentYear` to total spending before drawdown calculation
- `ProjectionTable.tsx` — consider surfacing one-off events as row annotations

**DoD**: User can enter "New car, 2028, £25,000"; projection shows a spike in that
year's drawdown with remaining years unaffected.

---
**Why**: State Pension is hardcoded to £11,502 (2024/25 full new SP). Most people
have a different forecast. The error compounds every year of projection.

**Files**:
- `src/pages/onboarding/steps/income-phases.tsx` — add `statePensionAnnualAmount`
  slider (range £0–£12,000, default £11,502, step £100) alongside the existing age
  slider
- `src/pages/onboarding/types.ts` — add `statePensionAnnualAmount?: number`
- `src/pages/onboarding/index.tsx` — pass `annualAmount: state.statePensionAnnualAmount ?? 11502`
  to the state pension income stream (currently hardcoded in the same file)
- `src/pages/plan/[id]/` — expose in income stream edit panel (covered by G1-T3c)

**DoD**: State pension amount is user-entered during onboarding; the hardcoded 11502
constant is removed from `handleComplete`.

---

### ~~G2-T3: Multi-account input in onboarding~~ ✅ DONE
Replaced the single `accountType` radio with a multi-row builder. Each row gets
type (SIPP/ISA/GIA/Cash), balance, annual contribution, and employer contribution
(only shown for SIPP). "+ Add another account" button. Submit handler loops over
the accounts array calling `createAccount.mutateAsync` per row. Review step
shows each row with its values. The `mixed` placeholder type is gone — users
add specific accounts now.

### G2-T3 (legacy spec):
**Why**: The current onboarding forces a single account type. A user with £150k SIPP
and £50k ISA must either pick one or create a misleading "SIPP" account. The engine
supports multiple accounts correctly.

**Files**:
- `src/pages/onboarding/steps/assets.tsx` — replace single account type selector with
  a multi-account builder: start with one row, allow "Add another account" button; each
  row has: wrapper type, balance, annual contribution
- `src/pages/onboarding/types.ts` — replace `currentSavings` + `accountType` with
  `accounts: Array<{ wrapperType, balance, annualContribution }>`
- `src/pages/onboarding/index.tsx` — loop and call `createAccount.mutateAsync` for
  each item in `state.accounts`

**DoD**: A user can specify SIPP £150k + ISA £50k and both rows appear in the
accounts list on the plan detail page.

---

### ~~G2-T4: Partner income streams in onboarding~~ ✅ DONE
**Why**: When a partner is added, their income streams (State Pension, DB pension) are
never created. A two-person household has a single person's income, making partner
plans wrong.

**Files**:
- `src/pages/onboarding/steps/income-phases.tsx` — when `state.hasPartner`, show a
  second income block for the partner with the same DB / State Pension toggles
- `src/pages/onboarding/types.ts` — add partner income fields:
  `partnerHasDbPension`, `partnerDbPensionAge`, `partnerDbPensionAnnualAmount`,
  `partnerHasStatePension`, `partnerStatePensionAge`, `partnerStatePensionAnnualAmount`
- `src/pages/onboarding/index.tsx` — after creating the partner person, loop over
  partner income toggles and call `createIncomeStream.mutateAsync` with
  `personId: partnerPerson.id`

**DoD**: A couple plan has income streams for both people. The projection shows
household income from two sources.

---

### ~~G2-T5: Scenario creation and comparison~~ ✅ DONE
**Why**: The schema and engine fully support scenarios. Without a UI, users cannot
explore "what if I retire at 63?" which is the primary use case for a planning tool.

**G2-T5a: Create a scenario**
- "New scenario" button on plan detail header
- Modal: name, note, select which assumptions to override (retirement age, spending,
  growth rate)
- Writes a row to `scenarios` + rows to `scenario_overrides`
- `src/hooks/use-scenarios.ts` — new hook

**G2-T5b: Engine applies overrides**
- `public/ipc/projections.js` — add `projections:runForScenario(scenarioId)` handler
  that reads override rows and merges them over the base plan data before calling the
  engine
- Currently the engine always runs against raw plan data; overrides table is never read

**G2-T5c: Scenario list and comparison view**
- Scenario selector on plan detail (tab strip or dropdown)
- Side-by-side summary view: base vs scenario for key metrics (total assets at end,
  total tax, sustainability, drawdown)
- `src/pages/plan/[id]/ScenarioComparison.tsx` — new component

**DoD**: User can clone their base plan into a scenario, change retirement age by 2
years, and see the delta in end assets and total tax. Projection runs for both.

---

### ~~G2-T6: Wire up bridge-year optimisation~~ ✅ DONE
Withdrawal logic refactored to household level. `runProjection` now: sums per-person
stream income → computes single household deficit → walks accounts in strategy order
(cash → ISA → SIPP → other), drawing from people in drawdown only. SIPP withdrawals
split 25% tax-free (UFPLS) + 75% taxable. SIPP draws blocked before
`sippMinimumAgeAccess`. Each person's tax computed against their own personal
allowance independently. ProjectionTable shows per-source breakdown
(cash · ISA · SIPP TFLS · SIPP taxed).

Major bug fix: previously each partner independently tried to fund full household
spending → 2× over-drawing. Golden fixture values updated for `couple-db-plus-state`
and `sipp-heavy-drawdown`.

### G2-T6 (legacy spec):
**Why**: `withdrawal-strategy.ts` has `analyzeBridgeYear()` and
`generateBridgeYearPlan()` fully implemented and tested but they are never called from
the engine. The projection currently uses a fixed cash→ISA→SIPP ordering with no
tax-free lump sum logic.

**Files**:
- `public/ipc/projections.js` — call `analyzeBridgeYear()` per year and
  `calculateWithdrawal()` using account tax treatment (currently only the basic
  `executeWithdrawalSequence` is used)
- Engine types: ensure `WithdrawalDetail.taxFreeComponent` is populated for SIPP
  withdrawals using the 25% rule from `AssumptionSet.sippTaxFreePercentage`
- Add a "Bridge strategy" row to `ProjectionTable` (or tooltip on withdrawal column)
  explaining the source and split

**DoD**: In a plan where retirement is at 60 and State Pension at 67, the bridge years
show ISA drawdown before SIPP, reducing taxable income in those years. Golden test
updated to verify SIPP tax-free component is non-zero.

---

## Priority 3 — Medium (depth and polish)

### ~~G3-T1: Onboarding review & confirm step~~ ✅ DONE
New "review" step appended to the onboarding flow (last step before submit).
Shows household, retirement timing, accounts, income streams (salary, DB,
state pension), and spending in read-only sections. Each section has an
"Edit" button that jumps back to the relevant step.

### G3-T1 (legacy spec):
**Why**: Users go from spending straight to "Complete & Create Plan" with no summary.
A mistake in any earlier step (wrong retirement age, wrong savings) is only discovered
on the plan page.

**Files**:
- `src/pages/onboarding/constants.ts` — add `"review"` to `STEPS`
- `src/pages/onboarding/steps/review.tsx` — new component showing a read-only summary
  of all collected values with "Go back" links per section
- `src/pages/onboarding/index.tsx` — render `<OnboardingReviewStep>` on the review step

**DoD**: Final onboarding step shows all collected values. User can click back to any
previous step, correct it, and return to review before committing.

---

### ~~G3-T2: Planning horizon / longevity setting~~ ✅ DONE
`people.longevity_target_age` column (migration 0003). IPC computes `endYear`
as max(birthYear + longevityTargetAge), default 95. Onboarding retirement-timing
step adds a slider (80–105, default 95). PeoplePanel exposes the field for
post-onboarding edits. ProjectionSummary shows "Funded to age X" instead of
"All years funded".

### G3-T2 (legacy spec):
**Why**: The engine hardcodes end age at 95. Some users will want 90 or 100. This also
affects sustainability labelling ("all years funded" vs "funded to age 95").

**Files**:
- `src/pages/onboarding/steps/household.tsx` — add longevity target slider (80–105,
  default 95)
- `src/pages/onboarding/types.ts` — add `longevityTargetAge: number`
- Schema: add `longevity_target_age` to `people` table (migration required)
- `public/ipc/projections.js` — use person's `longevityTargetAge` instead of
  hardcoded 95 when computing projection end year
- `src/pages/plan/[id]/ProjectionSummary.tsx` — display "funded to age X" instead of
  static "all years funded"

**DoD**: A user can set 100 and the projection runs to 100 and labels correctly.

---

### ~~G3-T3: Quantify and improve recommendations~~ ✅ PARTIAL
`Recommendation` type gains optional `impactScore` and `impactLabel`. The
spending-shortfall rule now computes the £/yr reduction needed (target − safe
annual spend) and surfaces it in both the rationale and a red badge in the
panel. RecommendationPanel renders the impact figure prominently.

NOT shipped: depletion-year quantification (years of runway from a 10% cut),
"Defer retirement by N years" rule. Both require additional engine helpers and
are deferred until users ask for them.

### G3-T3 (legacy spec):
**Why**: Recommendations currently say "reduce spending" but not "reduce by £4,200/yr
to achieve sustainability". Without a number, users cannot act.

**Files**:
- `src/services/engine/recommendations.ts` — for the spending shortfall rule, compute
  the minimum reduction needed to make the first deficit year sustainable; include the
  figure in `rationale`; populate `impactScore` with the annual saving
- Similarly for depletion rule: estimate years of additional runway from a 10%
  spending cut
- Add new recommendation rule: "Defer retirement by N years" — find the retirement age
  that achieves full sustainability and state it explicitly
- `src/pages/plan/[id]/RecommendationPanel.tsx` — display `impactScore` as a
  formatted currency badge when present

**DoD**: At least the top shortfall recommendation includes an estimated annual saving
amount. `impactScore` is non-zero and displayed in the UI.

---

### ~~G3-T4: Employment income stream~~ ✅ DONE
Onboarding income-phases step gains a "Salary / employment income (until retirement)"
toggle per person with annual amount slider (£0–£200k). Submit creates an `employment`
stream with `startAge=18` and `endAge` set to that person's retirement age.
Engine respects `endAge` (stream deactivates after that age). End-year pro-rata uses
`birthMonth/12` (months strictly before birth) — symmetric with the activation factor.
IncomeStreamsPanel already exposed `employment` as a type option for post-onboarding
edits.

### G3-T4 (legacy spec):
**Why**: Many users have salary or part-time work income before retirement. Currently
there is no way to enter employment income; only DB pension and State Pension are
captured in onboarding.

**Files**:
- `src/pages/onboarding/steps/income-phases.tsx` — add an optional "Employment /
  salary" section: toggle, annual amount, end age (defaults to retirement age)
- `src/pages/onboarding/types.ts` — add `hasSalary`, `salaryAnnual`, `salaryEndAge`
- `src/pages/onboarding/index.tsx` — create income stream with `streamType: "employment"`
- G1-T3c (income stream edit) must also expose `employment` as a stream type option

**DoD**: A user with a salary can enter it and see it in the income phase chart as a
distinct band until their retirement age.

---

### ~~G3-T5: Add delete hooks for accounts and income streams~~ ✅ DONE
`useDeleteAccount` and `useDeleteIncomeStream` added to their respective hook files.
Both accept `{ id, planId }` and invalidate the projection query on success.

---

### ~~G3-T6: Stress testing presets~~ ✅ DONE
New IPC `projections:runStressTest(planId, preset)` that loads the plan's data,
applies a preset modifier in-memory (no DB writes), and runs the engine.

Four presets:
- **High inflation** — `inflationRate += 0.02`
- **Lower returns** — `investmentReturn -= 0.02`
- **Early death** — `longevityTargetAge -= 10` per person, `endYear` recomputed
- **Market crash** — opening balances × 0.7 (one-time 30% hit)

`StressTestPanel` rendered between Recommendations and ProjectionTable. Four
preset buttons; clicking one runs the IPC and shows assets-at-end / total tax /
total drawdown / safe annual spend / sustainability vs the base plan, with
green/red deltas.

### G3-T6 (legacy spec):
**Why**: Deterministic projections show one path. Users need to know: "what if returns
are 2% lower?" or "what if inflation hits 5%?".

**Files**:
- `src/pages/plan/[id]/StressTestPanel.tsx` — new component with preset buttons:
  - "High inflation" (inflation +2%)
  - "Lower returns" (growth rate −2%)
  - "Early death" (longevity −10 years)
  - "Market crash" (one-time 30% balance reduction in year 1)
- Each preset creates a temporary scenario (not persisted) and runs the projection;
  results displayed inline as a delta vs base
- Requires G2-T5b (scenario engine override merging)

**DoD**: User clicks "High inflation" and sees updated summary figures side-by-side
with base. No permanent scenario is created.

---

### ~~G3-T7: Safe spending estimate~~ ✅ DONE
Engine helper `findSafeAnnualSpend` binary-searches the highest annual
spending target where every year remains sustainable. Result rounded down
to the nearest £100 (guaranteed-safe). IPC envelope adds `safeAnnualSpend`.
ProjectionSummary shows it as a fifth metric.

### G3-T7 (legacy spec):
**Why**: The projection can answer "what is the maximum I can spend each year and
still be funded to my longevity age?" This is a high-value output that is simple to
derive once the engine runs.

**Files**:
- `public/ipc/projections.js` — after running the main projection, binary search for
  the highest `annualSpendingTarget` where all years are sustainable; include as
  `safeAnnualSpend` in the returned `ProjectionResult`
- `src/pages/plan/[id]/ProjectionSummary.tsx` — display `safeAnnualSpend` as a
  highlight metric alongside "Assets at end"

**DoD**: Summary shows "Safe annual spend: £X" and it is lower than the target in an
unsustainable plan, higher in a well-funded one.

---

### ~~G3-T8: Income stream end dates~~ ✅ DONE
Engine respects `IncomeStreamContext.endAge`. IPC maps `stream.endAge` from DB.
End-year pro-rata = months strictly before birth. Salary streams created via G3-T4
already use this (endAge = retirement age). Income stream edit panel surfaces
endAge as an optional field.

### G3-T8 (legacy spec):
**Why**: `end_age` exists in the schema but there is no UI to set it. DB pensions
that end (e.g. on death of spouse) or employment income that ends at retirement cannot
be modelled correctly.

**Files**:
- `src/pages/onboarding/steps/income-phases.tsx` — add optional end age field for DB
  pension (below start age)
- `src/pages/onboarding/types.ts` — add `dbPensionEndAge?: number`
- G1-T3c edit panel — expose `endAge` as an optional field for all stream types
- Engine `isIncomeStreamActive()` — add upper bound check using `endAge` when present

**DoD**: A DB pension with `endAge: 80` stops contributing income after age 80 and
this is visible in the income phase chart.

---

## Priority 4 — Lower / deferred

### G4-T1: Scotland income tax support
**Why**: Scottish income tax has different bands and rates. Currently hardcoded to
England/Wales/Northern Ireland only.

**Approach**: Requires rearchitecting tax rules from hardcoded constants to
table-driven `TaxRuleSet` per region. Add `region` field to `people` table.
The `AssumptionSet` becomes a reference to the right rule set.

**DoD**: A person with `region: "scotland"` is taxed at Scottish rates. An explicit
test verifies the difference from the England/Wales baseline.

---

### G4-T2: Tax rule versioning
**Why**: Rules change each April. Without versioning there is no audit trail showing
which thresholds produced a given projection.

**Approach**: Add a `taxRuleSetId` FK on `assumption_sets`. Each tax year gets a
sealed row. Projections store which rule set was active.

**DoD**: A projection run record references the tax rule set used. Old projections are
reproducible from stored rules.

---

### G4-T3: Marriage Allowance
**Why**: A non-taxpaying partner can transfer £1,260 of personal allowance to a basic
rate taxpayer spouse. For many couples with unequal income in retirement this is a
material saving.

**Files**: Engine `calculatePersonalTax()` — add opt-in transfer of allowance between
partner pair when one person's `taxableIncome < personalAllowance`.

**DoD**: Couples where one partner has low income receive the correct net-of-tax
household figure. Unit test verifies the transfer mechanism.

---

### G4-T4: ~~One-off expenses / life events~~ → promoted to G2-T8
*See G2-T8 above.*

---

### G4-T5: Monte Carlo simulation (v1.1)
**Why**: Deterministic projections show one path. Monte Carlo quantifies probability
of success under return volatility.

**Approach**: Wrap the deterministic engine in N iterations (default 1,000) with
returns drawn from a normal distribution (mean = nominal growth rate, std dev =
user-configured or default 8%). Report median, 10th and 90th percentile outcomes.

**DoD**: Plan detail shows a confidence band chart (p10/p50/p90 wealth over time).
Processing is off the main thread (Worker or background IPC).

---

### G4-T6: Export / print projection report
**Why**: Users want to share or archive their projection.

**Files**:
- "Export PDF" button on plan detail
- Electron `shell` or `dialog` module to write a PDF using Chromium's print-to-PDF
- Include: summary metrics, income phase chart, year-by-year table, recommendations

**DoD**: Clicking "Export PDF" produces a readable multi-page document with the
projection data.

---

### G4-T7: Accessibility hardening
**Why**: Charts and tables have no ARIA descriptions; keyboard navigation is untested.

**Files**:
- `IncomePhaseChart.tsx` — add `aria-label` with a text summary of the income phases
- `ProjectionTable.tsx` — add `<caption>` and `scope` attributes to table headers
- Keyboard test pass: tab through all interactive controls on plan detail
- Screen reader test: NVDA/VoiceOver reads the sustainability status correctly

**DoD**: Lighthouse accessibility score ≥ 90 on plan detail page.

---

## Implementation order (suggested sprints)

### Sprint 1 — Make existing plans usable ✅ COMPLETE
~~G1-T1~~, ~~G1-T2~~, ~~G1-T3a~~, ~~G1-T3b~~, ~~G1-T3c~~, ~~G1-T3d~~, ~~G3-T5~~

### Sprint 2 — Independent accuracy improvements ✅ COMPLETE
~~G2-T1~~ (tax thresholds), ~~G2-T4~~ (partner income), ~~G2-T5~~ (scenarios)
~~G2-T2~~ (SP forecast) ✅ DONE — slider added to income-phases step (£0–£15k, default £11,502)

### Sprint 3 — Accumulation engine foundation ✅ COMPLETE
~~ACC-T1~~ (engine phase split), ~~ACC-T2~~ (employer contributions), ~~ACC-T5~~ (onboarding contributions capture)

### Sprint 3.5 — Drawdown correctness ✅ COMPLETE
~~G2-T6~~ (household-level drawdown + SIPP TFLS + per-person tax)
DOB pro-rata for activation, retirement contributions, retirement drawdown
Cash-flow chart redesign

---

### Sprint 4 — Pre-retiree insight (next up)
- **ACC-T6** (gap-to-target recommendation) — first
  - Highest ROI follow-up to ACC-T4. Engine binary-searches the sustainable opening
    pot, surfaces "Save £X/yr more for N years to close the gap" recommendation.
- **G3-T4 + ACC-T3 together** (employment income + salary band in chart)
  - The chart already has a colour slot for `salary` streams. Adding the onboarding
    capture and threading through is one PR.
- **ACC-T4 polish** — vertical retirement-year marker on the chart, "Pot at start"
  vs "Pot at retirement" naming when scenarios cross the boundary.

### Sprint 5 — Onboarding & input depth ✅ COMPLETE
~~G2-T2~~ (SP forecast slider), ~~G3-T1~~ (review step), ~~G2-T3~~ (multi-account
onboarding), ~~G3-T8~~ (already shipped with G3-T4)

### Sprint 6 — One-off events ✅ COMPLETE
~~G2-T7~~ (windfalls), ~~G2-T8~~ (one-off expenses)

### Sprint 7 — Planning depth ✅ COMPLETE
~~G3-T2~~ (longevity setting), ~~G3-T7~~ (safe spending estimate),
~~G3-T3~~ partial (spending-shortfall quantified; depletion + defer-retirement deferred)

### Sprint 8 — Stress testing
~~G3-T6~~ (presets), G4-T3 (Marriage Allowance)

### Sprint 9 — End-to-end tests (final sprint)
**Why**: Unit + integration tests cover engine and IPC. There is no test that
exercises the actual Electron app: onboarding flow → DB persistence → projection
render → editing post-onboarding. The browser smoke this session proved that
checks-types-and-tests-pass does NOT catch Electron-preload-only regressions.

**Scope**:
- E2E-T1: Pick framework. Playwright supports Electron via `_electron.launch()`
  with `npm test` integration. Spawn the built app from `out/`, drive UI, assert.
- E2E-T2: Onboarding happy path. Couple, two accounts (SIPP + ISA), salary,
  state pension. Submit → land on plan detail with non-zero projection.
- E2E-T3: Persistence round-trip. Restart app, plan loads with same values.
- E2E-T4: Edit flow. Change account balance via AccountsPanel → projection
  re-runs and assets-at-end shifts.
- E2E-T5: Scenario comparison. Create scenario, override retirement age,
  comparison view shows different end-assets.
- E2E-T6: CI integration. Runs on PRs alongside unit tests. Use a temp
  `--user-data-dir` so the test DB is isolated.

**DoD**: `bun run test:e2e` spawns Electron, walks the onboarding, asserts the
plan detail page renders projection rows and the recommendation panel. Test
DB cleaned up. CI passes.

### Known DOB-related limitations (defer until they hit)
- SIPP minimum-access age uses calendar-year age — can over-allow SIPP draws
  in the year someone turns 55 if they retired before 55. Edge case.
- Income stream `endAge` in schema is never read by engine (G3-T8 covers).

### Deferred (v1.1+)
G4-T1, G4-T2, G4-T5, G4-T6, G4-T7

---

## Accumulation Phase — Pre-retirement wealth building

**Background**: The engine's `startYear` is always today and it runs in drawdown mode
from the first year. `annualContribution` exists on the `accounts` table but is never
read or applied by the engine. There is no concept of a retirement year as a phase
boundary. For someone 10 years from retirement, the app cannot answer "what will my
pot be on retirement day?" or "am I saving enough to hit my target?" — the two most
important questions for a pre-retiree.

The competitor research (ProjectionLab, Boldin, Empower) all model accumulation as a
first-class phase. The product requirements doc section 2.2 explicitly requires
"contributions before retirement and withdrawals after retirement."

---

### ~~ACC-T1: Engine — accumulation phase (core, blocking)~~ ✅ DONE
Engine now branches on `year < person.retirementYear`. Accumulation skips drawdown,
applies `annualContribution` per account, computes tax on stream income normally.
`PersonContext.retirementYear` and `AccountContext.annualContribution` added to types;
both IPC handlers wired through. New unit tests + `couple-with-accumulation` golden
fixture. See `.ai/plans/acc-t1-accumulation-engine.md`.

**Why**: The engine has no retirement year boundary. Every year is treated as
drawdown. Contributions are stored in the DB but the engine ignores them.

**Approach**: Introduce `retirementYear` as a computed engine input (derived from
`person.dateOfBirth` and `person.retirementAge`). Add a phase check per year:
- **Accumulation year** (`year < retirementYear`): add `annualContribution` to each
  account closing balance; apply investment growth; no spending drawdown; income
  streams (salary, employment) offset contributions but no net-spending withdrawal
- **Retirement year onwards**: existing drawdown logic unchanged

**Files**:
- `src/services/engine/index.ts` — in `projectPersonYear`, add pre/post retirement
  phase branch; accumulation: `closing = opening + annualContribution + growth`;
  skip withdrawal logic entirely
- `src/services/engine/types.ts` — add `annualContribution: number` to
  `AccountContext`; add `retirementYear: number` to `PersonContext`
- `public/ipc/projections.js` — pass `annualContribution` from DB account row to
  engine `AccountContext`; compute `retirementYear` from `person.dateOfBirth +
  person.retirementAge` and pass to `PersonContext`

**DoD**: A person aged 45 retiring at 65 shows a 20-year accumulation chart where
account balances grow via contributions + investment return, then switches to drawdown
from retirement year. The retirement pot at year 20 is the drawdown opening balance.

---

### ~~ACC-T2: Employer pension contributions~~ ✅ DONE
`accounts.employer_contribution` column added (migration 0001). Engine combines
`annualContribution + employerContribution` during accumulation. AccountsPanel
shows "Employer Contribution (£)" input only when `wrapperType === "sipp"`; on
save the field is forced to 0 if type isn't SIPP. List summary line surfaces
employer £/yr alongside personal.

**Why**: For most UK employees, employer matching is the largest annual pension
contribution. Without it, accumulation projections are systematically under-stated.

**Approach**: Add `employerContribution` field to `accounts` table (real, default 0).
The IPC projections handler passes it alongside `annualContribution`. Engine adds
both during accumulation years.

**Files**:
- Schema: add `employer_contribution real not null default 0` to `accounts` table
  (migration required)
- `src/types/electron.d.ts` — add field to `Account` type
- `src/pages/plan/[id]/AccountsPanel.tsx` — add "Employer contribution (£/yr)" field
  to the account edit form, shown only when `wrapperType === "sipp"`
- `public/ipc/projections.js` — map `account.employerContribution` to engine

**DoD**: A SIPP with employee contribution £5,000/yr and employer £3,000/yr shows
£8,000/yr accumulating before retirement. Employer field hidden for ISA/cash accounts.

---

### ~~ACC-T3: Pre-retirement salary / employment income~~ ✅ PARTIAL
Captured via G3-T4 (onboarding salary capture, engine `employment` streams, end-age
pro-rata). Salary income now flows through the cash-flow chart automatically as a
distinct band during accumulation years (no special chart code — uses the existing
stream-colour assignment).

NOT shipped: dedicated chart styling for salary band (it gets the next available
palette colour), recommendation flagging if salary < contribution rate.

### ACC-T3 (legacy spec):
**Why**: For users currently employed, their salary funds their contributions. The
app currently has no way to model this or show gross income → contributions →
remaining cash flow during accumulation years.

**Note**: The `employment` stream type already exists in the schema. The gap is that
the engine currently ignores stream income during accumulation years and the
onboarding has no path to capture it (G3-T4 covers adding it).

**What this task adds beyond G3-T4**:
- During accumulation years, employment income should be shown in the chart as a
  distinct band (salary) and surplus after contributions should be trackable
- The recommendation engine should flag if salary is insufficient to cover
  contributions at the specified rate

**Files**:
- `src/services/engine/index.ts` — during accumulation years, include `employment`
  and `other` streams in `totalIncome`; show them in `incomeByStream`; do not trigger
  drawdown from savings to cover spending
- `src/pages/plan/[id]/IncomePhaseChart.tsx` — extend to show salary band in
  accumulation years

**DoD**: A user with £60k salary and 15 years to retirement sees their employment
income in the chart during those 15 years.

---

### ~~ACC-T4: Accumulation projection view and "retirement pot" insight~~ ✅ PARTIAL
Headline metric only. IPC adds `retirementPotByPerson: Record<personId, { pot, year, alreadyRetired }>`
to the projection envelope. Computed as the household's opening balances at the
start of each person's `retirementYear`. For already-retired people, uses the
plan's startYear (today's pot). ProjectionSummary shows household total + per-person
breakdown for couples; label switches to "Pot at start" if all retired.

NOT yet shipped: vertical retirement-year marker on the cash-flow chart, separate
AccumulationSummary card, target-pot computation. ACC-T6 (gap-to-target) still
queued — needs target derived from drawdown phase.

### ACC-T4 (legacy spec):
**Why**: Pre-retirees need to see (a) projected pot size at retirement date, (b)
whether they're on track, (c) how changes to contributions or retirement age affect
the pot. Without a dedicated accumulation output, the plan detail page conveys nothing
useful to someone 10 years out.

**Files**:
- `src/pages/plan/[id]/ProjectionSummary.tsx` — add "Projected pot at retirement:
  £X" metric, computed as total account balance at the retirement year boundary
- `src/pages/plan/[id]/IncomePhaseChart.tsx` — add vertical line or visual marker at
  retirement year, label accumulation vs drawdown regions
- `src/pages/plan/[id]/` — consider a separate `AccumulationSummary.tsx` card that
  shows: current savings, annual contributions, projected pot at retirement, target
  pot needed (derived from spending plan + drawdown engine)
- `public/ipc/projections.js` — add `retirementPot` to the returned
  `ProjectionResult`: the sum of all account balances at the retirement year

**DoD**: Plan detail shows "Projected pot at retirement: £X". If pot is less than
what the drawdown phase needs, a recommendation fires: "Increase contributions by
£Y/yr to close the gap."

---

### ~~ACC-T5: Accumulation onboarding — contributions and salary capture~~ ✅ PARTIAL
Contributions captured. Salary deferred to G3-T4.

`OnboardingState.annualContribution` and `employerContribution` added (default 0).
Assets step shows Annual Contribution slider (£0–£60k). Employer Contribution
slider (£0–£30k) only renders for `accountType === "sipp" | "mixed"`. Index
handler passes both to `createAccount`; employer is forced to 0 unless wrapper
is SIPP. Summary line: "Adding £X/yr (incl. £Y employer)".

NOT VERIFIED IN BROWSER — dev server start was denied. Ship with caveat or open
tester for manual smoke before merging.

**Why**: The current onboarding only captures current balance and account type. It
does not ask about annual contributions, employer contributions, or salary. Plans
created through onboarding will always show flat or zero accumulation.

**Files**:
- `src/pages/onboarding/steps/assets.tsx` — after the account type selector, add:
  - "Annual contribution (£/yr)" number input or slider
  - "Employer contribution (£/yr)" input (shown when type is SIPP)
- `src/pages/onboarding/types.ts` — add `annualContribution`, `employerContribution`
  to onboarding state (or add per-account if multi-account is implemented first)
- `src/pages/onboarding/index.tsx` — pass both values to `createAccount.mutateAsync`
- (Optional) Add a salary capture to household step or assets step: "Annual salary
  (£)" → creates an `employment` income stream with `endAge = retirementAge`

**DoD**: A plan created via onboarding with contributions shows growing account
balances from today to retirement date, then drawdown. "Projected pot at retirement"
is non-zero.

---

### ~~ACC-T6: Gap-to-target recommendation~~ ✅ DONE
Engine adds `findGapToTarget` helper that binary-searches the £/yr extra contribution
needed to make an unsustainable plan sustainable. Adds to the primary person's
preferred account (SIPP > ISA > first available). IPC envelope adds
`accumulationShortfall: { isSustainable, additionalAnnualContribution, yearsToRetirement }`.
RecommendationPanel renders a top-level "SAVE MORE" card with the £/yr figure.
Result rounded up to nearest £100 so the recommendation is a clean number that's
guaranteed to still be sustainable. Returns 0 contribution if everyone is already
retired (no years left to save).

### ACC-T6 (legacy spec):
**Why**: The highest-value insight for a pre-retiree is: "Are you saving enough?" The
engine already runs the full projection; the retirement pot is computed. The target pot
is derivable from running the drawdown phase backwards.

**Approach**: After running the projection, compute the minimum retirement opening
balance that produces a sustainable drawdown (binary search or analytical estimate).
Compare with projected pot. If gap exists, compute the additional annual contribution
needed to close it.

**Files**:
- `src/services/engine/recommendations.ts` — add `accumulationShortfall` rule: if
  projected pot at retirement < minimum sustainable pot, emit recommendation with
  `additionalContributionNeeded` and `yearsToRetirement`
- `src/pages/plan/[id]/RecommendationPanel.tsx` — display "Increase contributions by
  £X/yr" as a top-level action card

**DoD**: A user with £50k savings, no contributions, and 10 years to retirement on a
£30k/yr spending target sees a recommendation with a specific annual contribution figure.


---

### User acceptance testing phase

TODO: Generate scenarios with steps for manual, and then automated e2e tests.  Ensure that data is persisted.