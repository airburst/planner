# Golden Test Cases

Date: 2026-04-29
Purpose: define the initial golden test suite for deterministic engine behavior, scenario comparison, recommendation logic, and progressive-disclosure triggers.

## How to use this file
1. Convert each case into a machine-readable fixture once the stack is chosen.
2. Record exact numeric outputs after the first validated engine implementation.
3. Freeze those outputs as golden references and update only through deliberate model-version changes.

## Output categories to freeze
For each golden case, persist these outputs:
- yearly projection rows
- depletion year if any
- end-of-horizon balance
- first year with shortfall if any
- estimated safe spending
- earliest sustainable retirement age
- top 3 recommendations
- advanced-feature triggers fired

## Golden Case G1: Late starter baseline
Persona:
- P1 Late starter
Scenario:
- Base case with shared baseline assumptions
Assertions:
- Projection runs from current age through age 95 without validation errors.
- Recommendation list includes at least one of: save more, retire later, spend less.
- If a shortfall exists, the first shortfall year is persisted as a golden value.
- If no shortfall exists, end balance and safe-spending outputs are persisted as golden values.
Purpose:
- Baseline regression for high-need planning logic.

## Golden Case G2: Steady saver baseline
Persona:
- P2 Steady saver
Scenario:
- Base case with shared baseline assumptions
Assertions:
- Plan remains funded through planning horizon under baseline assumptions.
- Recommendation tone remains optimization-oriented rather than rescue-oriented.
- No inappropriate advanced trigger fires solely due to normal healthy plan behavior.
Purpose:
- Regression for stable successful planning outcomes.

## Golden Case G3: Early-retirement comparison
Persona:
- P3 Early retiree target
Scenario A:
- Planned retirement age 58
Scenario B:
- Planned retirement age 60
Assertions:
- Scenario comparison metrics are reproducible.
- Later-retirement scenario should not produce a worse deterministic funding result than earlier-retirement scenario under otherwise identical assumptions.
- Mixed-wrapper complexity trigger should be available.
Purpose:
- Validates scenario comparison and early-retirement sensitivity.

## Golden Case G4: Bridge-year liquidity case
Persona:
- P5 Pension bridge case
Scenario:
- Base case with shared baseline assumptions
Assertions:
- Defined benefit income begins at its configured start age and before State Pension starts.
- Pre-State-Pension years show materially different income composition than post-State-Pension years.
- ISA withdrawals can occur without increasing taxable income.
- Pension access rules are respected in every year.
Purpose:
- Validates wrapper behavior and bridge-to-pension logic.

## Golden Case G4a: Tax-efficient bridge recommendation case
Persona:
- P5 Pension bridge case
Scenario:
- Base case plus advanced drawdown recommendation mode
Assertions:
- The system can compare at least two bridge strategies: ISA-heavier bridge and SIPP-tax-free-cash-assisted bridge.
- Recommendation output explicitly states the estimated tax difference between strategies.
- Recommendation output does not treat ISA withdrawals as taxable income.
- Recommendation output accounts for remaining SIPP tax-free cash capacity.
Purpose:
- Validates tax-efficient bridge recommendation behavior.

## Golden Case G5: High-inflation stress preset
Persona:
- P2 Steady saver
Scenario:
- Base case plus high-inflation preset
Assertions:
- Stress preset changes only declared assumptions.
- High inflation should not improve a plan result relative to the base case unless another explicit offsetting assumption exists.
- Comparison output clearly records delta from base case.
Purpose:
- Regression for preset stress testing.

## Golden Case G6: Weak first-decade returns preset
Persona:
- P3 Early retiree target
Scenario:
- Base case plus weak early returns preset
Assertions:
- Early-retirement scenario should show deterioration relative to the base case under weak early returns.
- Recommendation or trigger output should reflect increased risk.
Purpose:
- Regression for early-retirement sensitivity under stress.

## Golden Case G7: Near-boundary advanced-trigger case
Persona:
- P6 Near-boundary confidence case
Scenario:
- Base case with shared baseline assumptions
Assertions:
- At least one advanced or stress-testing trigger should fire.
- The trigger explanation should be understandable and specific.
Purpose:
- Verifies progressive-disclosure logic.

## Golden Case G8: Retirement-age monotonicity check
Persona:
- P1 Late starter
Scenario set:
- Retirement at 67
- Retirement at 68
- Retirement at 69
Assertions:
- Under fixed assumptions, later retirement should not reduce pre-retirement contribution years.
- The engine should produce a non-worsening funding position when retirement is delayed, unless an explicit rule or changed input explains otherwise.
Purpose:
- Guards against timeline and contribution-order bugs.

## Golden Case G9: Tax treatment separation
Persona:
- Custom tax micro-case
Scenario:
- One year with State Pension income, taxable pension withdrawals, and ISA withdrawals
Assertions:
- State Pension and taxable pension withdrawals contribute to taxable income.
- ISA withdrawals do not contribute to taxable income.
- Estimated tax matches the applicable tax bands for the chosen region and year.
Purpose:
- Guards tax aggregation logic.

## Golden Case G10: No-negative-balance invariant case
Persona:
- Any persona under an intentionally stressed scenario
Assertions:
- Account balances do not become silently negative.
- If funding fails, the engine records shortfall explicitly instead of hiding it in balances.
Purpose:
- Guards against one of the most important engine integrity failures.

## Golden Case G11: Partner separate-tax-allowance case
Persona:
- P7 Partner income and separate allowances case
Scenario:
- Base case with shared baseline assumptions
Assertions:
- The engine computes taxable income separately for the primary user and partner.
- Estimated tax is derived from per-person allowances and tax bands, not from a single household taxable-income figure.
- Household output equals the sum of the two person-level tax computations.
- Recommendation output can reference which person's tax position is driving inefficiency.
Purpose:
- Guards the main partner-mode tax modeling rule.

## Engine invariants to enforce in all tests
1. Annual closing balance equals opening balance plus contributions plus growth plus inflows minus withdrawals where applicable.
2. State Pension does not begin before its modeled start age.
3. Defined benefit income starts only at or after its configured start age.
4. Pension withdrawals do not begin before accessible age unless an explicitly modeled exception exists.
5. Use of pension tax-free cash cannot exceed configured remaining entitlement.
6. ISA withdrawals never feed taxable income.
7. A scenario override affects only the changed fields and derived outputs.
8. Stress presets remain transparent override bundles rather than hidden rule changes.
9. Projection output must be reproducible for identical inputs and assumptions.
10. In partner mode, household estimated tax equals the sum of per-person tax computations.

## Goldenization workflow
1. Implement the deterministic engine.
2. Run the cases above and review outputs manually once.
3. Freeze approved outputs into fixture snapshots.
4. Require explicit review to change a golden output.

## Suggested machine-readable fixture layout later
- `fixtures/personas/*.json`
- `fixtures/scenarios/*.json`
- `fixtures/golden/*.json`
- `fixtures/presets/*.json`
