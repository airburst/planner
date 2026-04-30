# App Gaps — 2026-04-30

Fresh audit of current implementation vs planned scope. Grouped by area, prioritised within each group. Flesh out individual items as needed.

---

## 1. Onboarding — Data Capture

- **Date of birth not captured** — retirement age is collected but DOB is never stored; age-based logic relies on client-side calculations with no persisted birth year
- **State Pension forecast not asked** — hardcoded to £11,502 (2024/25 full new SP); user should provide their SP forecast letter figure
- **Single account only** — user cannot specify a SIPP + ISA split; everything goes into one wrapper; `annualContribution` is always set to 0
- **Partner income streams not created** — onboarding captures partner name and retirement age but never creates income streams for the partner
- **Essential/discretionary spending not saved** — the split is visible in the spending step summary text but not captured or persisted to `expense_profiles`
- **No review & confirm step** — onboarding goes straight from spending to "Complete"; no summary screen before committing records
- **Planning horizon not asked** — longevity target hardcoded to age 95 in engine

---

## 2. Plan Detail — Editing

- **No way to edit a plan after onboarding** — plan detail page is entirely read-only; no UI to add/edit people, accounts, income streams, or spending
- **No way to add income streams post-creation** — there is no "Add income stream" action anywhere; the only path is re-running onboarding
- **No way to adjust assumptions** — growth rate, inflation rate, State Pension annual amount are all locked after plan creation; no settings panel

---

## 3. Scenarios

- **No scenario creation UI** — the schema (`scenarios`, `scenarioOverrides`) is fully built but there is no way to create a scenario from the UI
- **No scenario editing UI** — cannot change retirement age, spending, contributions in a scenario
- **No scenario comparison view** — cannot see two scenarios side by side
- **Engine does not apply overrides** — the projection engine ignores `scenarioOverrides` entirely; the override merging logic has not been implemented

---

## 4. Projection Engine — Integration Gaps

- **Bridge-year optimisation not integrated** — `withdrawal-strategy.ts` contains `analyzeBridgeYear()` and `generateBridgeYearPlan()` but these are never called from the main engine
- **SIPP 25% tax-free lump sum not modelled** — `sippTaxFreePercentage` is in the assumption set but the engine does not track remaining entitlement or apply it to withdrawals
- **Safe spending estimate not shown** — the engine could calculate the sustainable annual spend but this is not surfaced anywhere in the UI
- **Scenario override merging missing** — engine always runs against raw plan data; overrides table is never read

---

## 5. Recommendations

- **No quantified impact** — recommendations lack a "this saves you £X/year" figure; `impactScore` field exists in schema but is never populated
- **No actionable next step** — recommendations tell the user what to do but not by how much (e.g. "reduce spending by £3k/yr to reach full funding")
- **Missing recommendation types** — no suggestions for: increase SIPP contribution, defer retirement by N years, use ISA bridge strategy, claim Marriage Allowance
- **No link to scenarios** — there is no "Apply this recommendation" action that creates a scenario to model the impact

---

## 6. Tax & UK Rules

- **Rules are hardcoded** — tax bands, personal allowance, savings allowance are hardcoded in `runtime.ts`; violates the stated design principle of table-driven rules
- **Scotland not supported** — no region selector; Scottish income tax rates not implemented; architecture would need refactoring to add region support cleanly
- **Savings allowance not applied** — `personalSavingsAllowance: 1000` is defined in assumption set but never used in tax calculation
- **Marriage Allowance not modelled** — unused personal allowance cannot be transferred between spouses/partners
- **Tax rule versioning absent** — no way to track when rules changed or audit which rules were used for a historical projection

---

## 7. Account Modelling

- **Multi-account input missing** — no UI to add a second account (e.g. ISA alongside a SIPP); accounts are created one-per-person during onboarding only
- **Employer contributions not captured** — no field in onboarding or anywhere else for employer pension contributions
- **No account-level growth assumptions** — all accounts use the same plan-level nominal growth rate; equity vs cash distinction not possible
- **SIPP access age not enforced** — minimum pension access age (currently 57 from 2028) not checked; withdrawals can be modelled before legal access

---

## 8. Income Streams

- **Employment income not captured** — no way to add a salary or employment income stream; engine supports it but onboarding and UI do not expose it
- **Income end dates not captured** — `end_age` field exists in schema but there is no UI to set it (e.g. DB pension ending at death of spouse)
- **Multiple DB pension sources** — a user with more than one DB pension can only enter one during onboarding; no "add another" flow
- **Partner income streams** — partner's State Pension and any DB pension are never created

---

## 9. Stress Testing & Advanced Features

- **No stress testing UI** — no presets (market crash, high inflation, early death) and no way to run a modified projection
- **No assumptions panel** — users cannot see or change the growth rate, inflation rate, or tax assumptions after plan creation
- **Monte Carlo not started** — architecture supports it (engine is deterministic; Monte Carlo would wrap it) but not implemented
- **Progressive disclosure triggers not built** — plan was to show advanced features contextually (e.g. "you're near the £100k taper, consider SIPP contributions") but this trigger engine does not exist

---

## 10. Infrastructure & Polish

- **No plan editing route** — there is no `/plan/:id/edit` or equivalent; the only way to change plan data is directly in the DB
- **No export/print** — no way to save or share a projection summary
- **Error handling thin** — `handleComplete` in onboarding silently catches errors and logs to console; user sees no feedback if a record fails to save
- **No loading states on plan detail** — projections loading shows a pulse animation but individual data sections (people, accounts) show no load indicators
- **Accessibility gaps** — charts have no ARIA descriptions; table has no screen-reader summary; keyboard navigation not tested
