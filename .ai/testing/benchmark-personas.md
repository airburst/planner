# Benchmark Personas

Date: 2026-04-29
Purpose: provide stable validation personas for the retirement engine and product behavior.
Usage: these personas are not marketing personas. They are canonical planning fixtures for deterministic projections, scenario comparisons, recommendation logic, and advanced-trigger rules.

## Shared baseline assumptions
Unless a test case overrides them, use these defaults:
- Tax region: England / Wales / Northern Ireland
- Inflation: 2.5%
- Pension nominal growth: 5.0%
- ISA nominal growth: 5.0%
- Salary growth: 2.0%
- Planning horizon: age 95
- State Pension full-rate reference: configurable, but use current official full-rate default only when the persona does not provide a forecast
- Pension access age: use rules-compatible default and explicit access age in fixtures

## Persona P1: Late starter
Primary job:
- Determine whether retirement is still viable after slow early accumulation.

Profile:
- Age: 52
- Planned retirement age: 67
- State Pension age: 67
- Longevity target age: 95
- Current salary: £68,000
- Pension balance: £145,000
- ISA balance: £18,000
- Annual pension contribution: £12,000
- Annual ISA contribution: £3,000
- Essential retirement spend: £26,000
- Discretionary retirement spend: £8,000
- State Pension forecast: £10,800 annual

Why this persona matters:
- Exercises catch-up saving, high recommendation sensitivity, and potential shortfall behavior.

Expected product behavior:
- Action dashboard should likely prioritize more saving, later retirement, or lower target spending.
- Advanced triggers may fire if the deterministic outcome is marginal.

## Persona P2: Steady saver
Primary job:
- Confirm that a conventional long-term saver is on track.

Profile:
- Age: 40
- Planned retirement age: 68
- State Pension age: 68
- Longevity target age: 95
- Current salary: £54,000
- Pension balance: £210,000
- ISA balance: £72,000
- Annual pension contribution: £11,500
- Annual ISA contribution: £6,000
- Essential retirement spend: £22,000
- Discretionary retirement spend: £10,000
- State Pension forecast: £11,500 annual

Why this persona matters:
- Baseline healthy plan for regression testing.

Expected product behavior:
- Deterministic projection should likely remain funded through planning horizon under baseline assumptions.
- Recommendations should be incremental rather than alarmist.

## Persona P3: Early retiree target
Primary job:
- Explore feasibility of retiring materially before State Pension age.

Profile:
- Age: 45
- Planned retirement age: 58
- State Pension age: 68
- Longevity target age: 95
- Current salary: £95,000
- Pension balance: £420,000
- ISA balance: £260,000
- Annual pension contribution: £18,000
- Annual ISA contribution: £10,000
- Essential retirement spend: £28,000
- Discretionary retirement spend: £17,000
- State Pension forecast: £11,000 annual

Why this persona matters:
- Exercises bridge years, mixed wrappers, and early-retirement risk.

Expected product behavior:
- Scenario comparison should be especially important.
- Advanced trigger for mixed wrappers and drawdown complexity should be available.

## Persona P4: Homeowner with low liquid bridge assets
Primary job:
- Understand retirement viability when wealth is concentrated away from accessible bridge assets.

Profile:
- Age: 50
- Planned retirement age: 63
- State Pension age: 67
- Longevity target age: 95
- Current salary: £61,000
- Pension balance: £350,000
- ISA balance: £15,000
- Annual pension contribution: £14,000
- Annual ISA contribution: £2,000
- Essential retirement spend: £24,000
- Discretionary retirement spend: £7,000
- State Pension forecast: £10,900 annual
- Home value: ignored in v1 engine unless modeled separately

Why this persona matters:
- Tests the gap between total wealth and usable retirement liquidity.

Expected product behavior:
- Recommendations should likely highlight bridge savings and timing risk, not just headline net worth.

## Persona P5: Pension bridge case
Primary job:
- Model a retirement path where defined benefit income starts first, State Pension starts later, and SIPP plus ISA withdrawals bridge the remaining gap.

Profile:
- Age: 57
- Planned retirement age: 60
- Defined benefit pension start age: 60
- Defined benefit pension income: £9,500 annual
- State Pension age: 67
- Longevity target age: 95
- Current salary: £58,000
- Pension balance: £290,000
- ISA balance: £140,000
- Annual pension contribution: £9,000
- Annual ISA contribution: £4,000
- Essential retirement spend: £23,000
- Discretionary retirement spend: £9,000
- State Pension forecast: £11,200 annual

Why this persona matters:
- Directly tests bridge-year logic, wrapper-specific withdrawals, defined benefit phasing, and tax-efficient bridge recommendations.

Expected product behavior:
- The engine should show materially different dynamics before and after State Pension starts.
- Recommendation logic should avoid suggesting impossible early pension access.
- Advanced drawdown recommendations should be able to compare use of ISA withdrawals against use of the SIPP 25% tax-free element during the bridge period.

## Persona P6: Near-boundary confidence case
Primary job:
- Determine when the app should prompt stress testing or advanced analysis.

Profile:
- Age: 49
- Planned retirement age: 65
- State Pension age: 67
- Longevity target age: 95
- Current salary: £72,000
- Pension balance: £260,000
- ISA balance: £52,000
- Annual pension contribution: £13,000
- Annual ISA contribution: £5,000
- Essential retirement spend: £27,000
- Discretionary retirement spend: £11,000
- State Pension forecast: £11,300 annual

Why this persona matters:
- Validates advanced-trigger rules when a plan is close to pass/fail under baseline assumptions.

Expected product behavior:
- Stress testing should be suggested even if the deterministic case is technically viable.

## Persona P7: Partner income and separate allowances case
Primary job:
- Validate that household planning preserves separate personal tax allowances and timing.

Profile:
- Primary age: 60
- Partner age: 58
- Planned retirement age primary: 60
- Planned retirement age partner: 60
- State Pension age primary: 67
- State Pension age partner: 67
- Longevity target age primary: 95
- Longevity target age partner: 95
- Primary defined benefit income from age 60: £18,000 annual
- Partner defined benefit income from age 60: £8,500 annual
- Primary State Pension forecast: £11,200 annual
- Partner State Pension forecast: £10,800 annual
- Primary SIPP balance: £240,000
- Partner SIPP balance: £110,000
- Household ISA balance: £90,000
- Essential retirement spend: £30,000
- Discretionary retirement spend: £10,000

Why this persona matters:
- Tests household roll-up while preserving separate tax computations.

Expected product behavior:
- The system should calculate tax separately for the primary user and partner.
- Output should explain household totals without hiding per-person allowances.
- Recommendations should be able to distinguish whether drawdown pressure is better absorbed by one person's SIPP or shared ISA assets.

## Persona coverage map
- Shortfall / catch-up planning: P1
- Healthy baseline regression: P2
- Early retirement and mixed wrappers: P3
- Liquidity mismatch: P4
- Bridge-to-pension years: P5
- Advanced-trigger boundary: P6
- Partner tax-unit handling: P7

## Fixture governance
1. Keep these personas stable once the engine test suite begins using them.
2. If assumptions change, create a new fixture version rather than silently editing prior ones.
3. Treat these personas as contract fixtures for both model validation and product-behavior review.
