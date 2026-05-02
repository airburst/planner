# ACC-T1: Accumulation Phase Engine — Implementation Plan

**Status**: Draft
**Sprint**: 3 (foundation; unlocks Sprints 4–6)
**Author**: 2026-05-02
**Scope**: Engine + IPC wiring + tests. No UI in this task (covered by ACC-T4).

---

## Goal

Make the engine treat each person's life as two phases:

- **Accumulation** (`year < retirementYear`): contributions + growth, no drawdown.
- **Drawdown** (`year >= retirementYear`): existing behaviour unchanged.

Today every year is drawdown. `accounts.annualContribution` is in the DB but never read by the engine.

## Out of scope (deliberate)

- Employer contributions → ACC-T2.
- Onboarding capture of contributions → ACC-T5.
- Salary / employment income shown in chart → ACC-T3.
- Retirement-pot UI metric → ACC-T4.
- Pre-tax salary-sacrifice modelling. Treated as ACC-T3 / future work.

## Pre-flight findings

- `accounts.annualContribution` (real, default 0) **already exists** — no migration required.
- `people.retirementAge` (integer, nullable) exists.
- Engine source: `src/services/engine/index.ts`. Bundled to `public/engine.js` via `bun run vite build --config vite.main.config.ts`. Edit TS — bundle regenerates on build.
- IPC: `public/ipc/projections.js` constructs `enginePeople`, `engineAccounts` from DB rows; currently drops `annualContribution` and `retirementAge` on the floor.
- Income streams during accumulation: today they're computed and added to `totalIncome` already (e.g. a salary stream active at age 45). The bug is only that **drawdown logic also runs**, depleting accounts even though contributions should be growing them.

## Key design decisions

### D1. Retirement year derivation
`retirementYear = birthYear + person.retirementAge`. If `retirementAge` is null, default to `currentYear` (i.e. "already retired" — preserves legacy behaviour for plans pre-G1-T1). Compute in the IPC layer, pass on `PersonContext`.

### D2. Phase per person, not household
A couple where one retires at 60 and the other at 65 needs each person evaluated independently. The phase check lives in `projectPersonYear`, not `runProjection`.

### D3. Accumulation year mechanics
Per person, per account, when `year < retirementYear`:

```
closing = opening + annualContribution + growthOnOpening
```

- **No drawdown loop**: `withdrawalsByAccount` is empty, `totalWithdrawals = 0`.
- **Growth applies to opening only**: contributions are added at year-end. Conservative and matches industry calculators (ProjectionLab, Boldin).
- **Tax**: continue to compute tax on stream income (e.g. DB pension that activates pre-retirement, rental income). Salary streams are taxed normally. No tax applied to contributions in the engine (salary sacrifice / relief at source modelling deferred to ACC-T3).
- **Spending deficit**: no longer drives withdrawals. The user is assumed to be funding spending from external income (salary). If household income < spending target during accumulation, this is informational only — surface via existing `deficitOrSurplus` but `canSustainSpending` should not trigger drawdown.

### D4. `canSustainSpending` semantics during accumulation
During accumulation, set `canSustainSpending = true` regardless of deficit. The metric is only meaningful in drawdown. Alternative considered: leave it as-is (income vs spending). Rejected because it would flag every accumulation plan as "unsustainable" in the recommendation engine, polluting recommendations.

### D5. Pro-rata growth/tax allocation across accounts
Existing logic: `proRataGrowth = (opening / totalOpening) * growthOnBalances`. Same logic during accumulation. Contributions are NOT pro-rated — each account gets its own `annualContribution` directly.

### D6. Backward compatibility
Plans without `annualContribution` set get default `0` (already the schema default). Plans without `retirementAge` set get `retirementYear = currentYear` → behaviour identical to today.

---

## File changes

### 1. `src/services/engine/types.ts`
- `AccountContext`: add `annualContribution: number` (GBP per year, real not pence — match existing `openingBalance` convention).
- `PersonContext`: add `retirementYear: number`.

### 2. `src/services/engine/index.ts`
- `projectPersonYear`: branch on `year < person.retirementYear`.
  - Accumulation branch: skip deficit/withdrawal loop. Apply contributions per account. Run normal stream-income + tax calc.
  - Drawdown branch: existing code path, unchanged.
- Extract a small helper `applyAccumulationGrowth(account, opening, totalOpening, taxDue, growthOnBalances)` if branching makes the function unwieldy. Otherwise inline.
- `runProjection`: no signature change.

### 3. `public/ipc/projections.js`
- `engineAccounts.map(...)`: include `annualContribution: account.annualContribution`.
- `enginePeople.map(...)`: compute `retirementYear`:
  ```js
  const birthYear = new Date(person.dateOfBirth).getFullYear();
  const retirementYear = person.retirementAge != null
    ? birthYear + person.retirementAge
    : startYear;
  ```
  Add to engine person object.
- Apply the same change in **both** `projections:runForPlan` and `projections:runForScenario` handlers.

### 4. `public/engine.js`
Regenerated automatically by `bun run vite build --config vite.main.config.ts`. Do not hand-edit.

### 5. Tests
- `src/services/engine/index.test.ts` — add unit tests for accumulation:
  - Single person, age 45, retires at 65, ISA £100k, contribution £10k/yr, no income streams. After 1 year: opening £100k + contribution £10k + growth on £100k. After 20 years: balance is the FV of an annuity-due-ish series.
  - Asserts `totalWithdrawals === 0` and `withdrawalsByAccount.size === 0` in accumulation years.
  - Asserts `canSustainSpending === true` during accumulation even when stream income < spending.
  - Asserts behaviour at the boundary: year `retirementYear` is the first drawdown year.
- `src/services/engine/golden-projections.test.ts` — add a new golden case "couple-with-accumulation":
  - Primary aged 45 retiring at 65, partner aged 43 retiring at 67.
  - Verify both are in accumulation in early years; primary flips to drawdown at year 20, partner at year 24.
- `src/services/engine/fixtures/` — add fixture `couple-with-accumulation.ts` mirroring existing fixture style.

### 6. Type updates downstream
- `src/types/electron.d.ts` — `Account` type already has `annualContribution`; no change needed. Spot-check during implementation.

---

## Implementation steps (ordered)

1. **Types** — extend `AccountContext` and `PersonContext` in `types.ts`. Run `bun run check-types` to surface every call-site that needs updating.
2. **Engine** — add phase branch in `projectPersonYear`. Keep diff small: drawdown branch is the existing body wrapped in an `else`.
3. **IPC** — wire `annualContribution` and `retirementYear` through both projection handlers.
4. **Engine unit tests** — write the four assertions above. Run `bun run test`.
5. **Golden test** — add couple-with-accumulation fixture + assertions. Update existing golden test snapshots if they depend on retirement year being missing.
6. **Manual verification** — `bun run start`, open an existing plan with a SIPP that has a contribution, confirm accumulation balances grow.
7. **Build artefact** — `bun run build` to regenerate `public/engine.js`. Confirm test still passes against bundled output (the IPC tests, if any, use the bundle).

## Risks / things to watch

- **Existing golden snapshots may shift**. Plans with non-zero `retirementAge` but no contributions should still produce identical drawdown numbers from the retirement year onwards — but the years before retirement will now show no withdrawals where they previously did. Update snapshots deliberately, not blindly.
- **Plans with `retirementAge = null`** (legacy seeded data) will fall through to `retirementYear = startYear` → drawdown from year 0 → behaviour unchanged. Verify this on at least one real plan.
- **Tax on income streams during accumulation**: a DB pension that activates at 55 with retirement at 65 will produce taxable income for 10 accumulation years. Tax is still owed. Engine should compute it. Spot-check this case in a unit test.
- **`growthOnBalances` field in `PersonYearState`** is already populated. During accumulation it should equal growth on opening (no withdrawal subtraction). Trivially handled because `totalWithdrawals = 0`.

## Definition of Done

- [ ] `AccountContext.annualContribution` and `PersonContext.retirementYear` exist in `types.ts`.
- [ ] `projectPersonYear` branches on accumulation vs drawdown.
- [ ] Both IPC handlers pass `annualContribution` and `retirementYear` through.
- [ ] New unit tests pass: accumulation has zero withdrawals, contributions accrue, boundary year flips to drawdown.
- [ ] New golden fixture `couple-with-accumulation` passes.
- [ ] `bun run check-types`, `bun run lint`, `bun run test` all green.
- [ ] `bun run build` succeeds; `public/engine.js` regenerated.
- [ ] Manual smoke: open existing plan in dev, accumulation balance for at least one account is `> opening + 1 year of contributions` (i.e. growth applied).

---

## Unresolved questions

- Confirm convention: contributions added at year-end (no growth in year of contribution) vs mid-year (half-year growth). Going with year-end for ACC-T1; can revisit if user data suggests otherwise.
- Should `incomeSubjectToTax` during accumulation include only stream income, or zero? Going with stream income (preserves correct tax for DB pensions that activate pre-retirement).
- Recommendations engine: do any rules need accumulation-phase awareness now, or wait for ACC-T6? Wait — ACC-T6 explicitly covers `accumulationShortfall`.
