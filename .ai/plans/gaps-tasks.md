# Gap Tasks — 2026-04-30

Prioritised engineering backlog derived from `gaps.md`. Tasks are ordered by impact on
usability. Each task is self-contained: it states what to build, why it matters, what
files to touch, and the definition of done.

Task ID format: G<priority>-T<seq>
Priority tiers: P1 = critical path, P2 = high value, P3 = medium, P4 = low/deferred

---

## Priority 1 — Critical path (app is not usable without these)

### G1-T1: Capture date of birth in onboarding
**Why**: `PersonContext.dateOfBirth` is required by the engine. Currently absent from
onboarding; the engine will fail or produce wrong ages for any plan created through
the UI. Retirement age is collected but cannot substitute for DOB in multi-year
projections.

**Files**:
- `src/pages/onboarding/types.ts` — add `dateOfBirth: string` (ISO date)
- `src/pages/onboarding/steps/household.tsx` — add date-of-birth input (date picker or
  three-field day/month/year)
- `src/pages/onboarding/steps/retirement-timing.tsx` — derive and display current age
  as a read-only hint once DOB is known
- `src/pages/onboarding/index.tsx` — pass `dateOfBirth` to `createPerson.mutateAsync`
- `public/ipc/projections.js` — ensure `dateOfBirth` from DB row is parsed to `Date`
  before being passed to engine

**DoD**: A plan created through onboarding has a persisted `date_of_birth` on the
person row. The engine receives a valid `Date` object. Tests that previously relied on
DOB being present pass without mocking.

---

### G1-T2: Surface onboarding errors to the user
**Why**: `handleComplete` in `onboarding/index.tsx` catches all errors and only logs
to console. If any IPC call fails (e.g. person creation fails) the user is silently
navigated to a blank plan or left on the last step with no feedback.

**Files**:
- `src/pages/onboarding/index.tsx` — add `error` state; display an inline error
  banner when `handleComplete` throws; keep user on current step

**DoD**: If any mutation inside `handleComplete` rejects, the user sees a readable
error message and the button re-enables. No silent swallowing.

---

### G1-T3: Plan editing — people, accounts, income streams
**Why**: The plan detail page is entirely read-only. There is no way to correct or
extend data after onboarding. This is the most critical missing piece for making the
app usable day-to-day.

**Scope** (can be split into sub-tasks per entity type):

**G1-T3a: Edit people**
- Route or modal: edit primary person name, DOB, retirement age, State Pension age
- Mutation: `useUpdatePerson` already exists
- DoD: User can fix their name or change retirement age and projection re-runs

**G1-T3b: Add / edit / delete accounts**
- Panel on plan detail: list accounts with edit inline or modal
- Mutations: `useCreateAccount`, `useUpdateAccount`, `useDeleteAccount` (delete hook
  needs adding)
- Fields: name, wrapper type, current balance, annual contribution
- DoD: User can add a second account (e.g. ISA alongside SIPP) and see it in the
  projection

**G1-T3c: Add / edit / delete income streams**
- Panel on plan detail: list income streams with add / edit / delete
- Mutations: `useCreateIncomeStream`, `useUpdateIncomeStream`, `useDeleteIncomeStream`
  (delete hook needs adding)
- Fields: name, stream type, person assignment, start age, end age, annual amount,
  inflation-linked toggle, taxable toggle
- DoD: User can add a DB pension that was missed during onboarding; projection updates

**G1-T3d: Edit spending target**
- Simple inline edit on plan detail for annual spending, essential/discretionary split
- Requires creating/updating an `expense_profiles` row per plan
- IPC: `expense-profiles` handlers need creating if not present
- DoD: Spending target editable; both essential and discretionary values persisted

---

### G1-T4: Persist essential/discretionary spending split
**Why**: The spending step in onboarding shows an essential/discretionary concept but
only saves a single `annualSpendingTarget` to the plan name. The `expense_profiles`
table exists but is never written to.

**Files**:
- `src/pages/onboarding/steps/spending-target.tsx` — add essential/discretionary
  sliders (or a split ratio slider); the two values should sum to the total target
- `src/pages/onboarding/types.ts` — add `essentialAnnual`, `discretionaryAnnual`
- `src/pages/onboarding/index.tsx` — call `createExpenseProfile.mutateAsync` after
  person and accounts are created
- `public/ipc/expense-profiles.js` — add if missing: `expense-profiles:create`,
  `expense-profiles:getByPlan`, `expense-profiles:update`
- `src/hooks/use-expense-profiles.ts` — new hook file
- Engine: `SpendingAssumption` currently uses `annualSpendingTarget`; extend to carry
  `essentialAnnual` and `discretionaryAnnual` so the engine can protect essential
  spending in shortfall scenarios

**DoD**: Expense profile row created during onboarding. Engine uses essential amount
as the floor in sustainability calculation.

---

## Priority 2 — High value (core product features)

### G2-T1: UK tax threshold management
**Why**: Tax bands change every April. Currently all thresholds (personal allowance
£12,570, basic rate band £50,270, higher rate £125,140) are hardcoded in
`projections.js`. Users have no way to update them without editing source code.

**Approach**: Store thresholds in `assumption_sets` table (fields already defined in
schema). Add a settings screen to view and edit the active tax year's thresholds.

**Files**:
- `public/ipc/projections.js` — instead of hardcoding, read `personalAllowance`,
  `basicRateBand`, `higherRateBand`, `basicRate`, `higherRate`, `additionalRate` from
  the plan's assumption set row; fall back to 2026 UK defaults if no row exists
- `public/ipc/assumption-sets.js` — CRUD handlers for assumption sets (likely already
  present; verify and add `assumption-sets:getByPlan` if missing)
- `src/hooks/use-assumption-sets.ts` — new hook file
- `src/pages/plan/[id]/AssumptionsPanel.tsx` — new component: collapsible panel on
  plan detail showing current tax year values with inline edit
  - Fields: tax year label, personal allowance, basic rate threshold, higher rate
    threshold, basic/higher/additional rates, inflation rate, nominal growth rate,
    SIPP minimum access age
  - Show "using defaults" badge when no custom assumption set exists for this plan
- `src/pages/plan/[id]/index.tsx` — render `<AssumptionsPanel>` below the projection
  table

**Global defaults**: Add a separate "Tax settings" page (or section on home page)
that holds the app-wide default thresholds for the current tax year. New plans inherit
these; individual plans can override.

**DoD**: Changing the personal allowance field causes the projection to re-run with
the new value. A plan created in 2027 uses 2027 thresholds without code changes.
Unit test: `calculatePersonalTax()` parametrised with an assumption set read from DB.

---

### G2-T2: State Pension forecast input
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

### G2-T3: Multi-account input in onboarding
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

### G2-T4: Partner income streams in onboarding
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

### G2-T5: Scenario creation and comparison
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

### G2-T6: Wire up bridge-year optimisation
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

### G3-T1: Onboarding review & confirm step
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

### G3-T2: Planning horizon / longevity setting
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

### G3-T3: Quantify and improve recommendations
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

### G3-T4: Employment income stream
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

### G3-T5: Add delete hooks for accounts and income streams
**Why**: `useDeleteAccount` and `useDeleteIncomeStream` do not exist. The G1-T3 edit
panels cannot offer a delete action without them.

**Files**:
- `src/hooks/use-accounts.ts` — add `useDeleteAccount`
- `src/hooks/use-income-streams.ts` — add `useDeleteIncomeStream`
- IPC handlers `accounts:delete` and `income-streams:delete` already exist

**DoD**: Both hooks exported; delete buttons in edit panels are functional; query
cache invalidated on success.

---

### G3-T6: Stress testing presets
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

### G3-T7: Safe spending estimate
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

### G3-T8: Income stream end dates
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

### G4-T4: One-off expenses / life events
**Why**: Large one-off withdrawals (home purchase, gift, care costs) break the
assumption of constant annual spending.

**Approach**: Add `one_off_expenses` table: `planId`, `year`, `amount`,
`description`. Engine adds these to spending in the relevant year.

**DoD**: A user can enter "New car, 2031, £25,000" and the projection shows a spike
in that year's drawdown.

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

### Sprint 1 — Make existing plans usable
G1-T1, G1-T2, G1-T3a, G1-T3b, G1-T3c, G1-T3d, G3-T5

### Sprint 2 — Tax and assumption management
G2-T1, G1-T4 (expense profiles), G2-T2 (SP forecast)

### Sprint 3 — Richer onboarding data
G2-T3 (multi-account), G2-T4 (partner income), G3-T8 (end dates), G3-T4 (employment income)

### Sprint 4 — Scenarios
G2-T5a, G2-T5b, G2-T5c, G2-T6 (bridge-year wiring)

### Sprint 5 — Planning depth
G3-T1 (review step), G3-T2 (longevity), G3-T3 (quantified recs), G3-T7 (safe spend)

### Sprint 6 — Stress testing
G3-T6, G4-T3 (Marriage Allowance), G4-T4 (one-off expenses)

### Deferred (v1.1+)
G4-T1, G4-T2, G4-T5, G4-T6, G4-T7
