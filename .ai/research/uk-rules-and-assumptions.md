# UK Rules and Modeling Assumptions Pass

Date: 2026-04-29
Purpose: Harden the default inputs and rule boundaries for a UK retirement-modeling MVP.

## 1. State Pension assumptions
1. The full new State Pension is £241.30 per week for the 2026 to 2027 tax year.
2. Users need at least 10 qualifying National Insurance years to receive any new State Pension.
3. Users typically need 35 qualifying years for the full rate if their National Insurance record started after April 2016.
4. Users with pre-2016 records may have contracted-out adjustments or protected payments, so actual entitlements can differ.
5. State Pension should be modeled using a user-entered or imported forecast amount, not only a generic default.
6. Annual State Pension increases should be modeled as policy-linked and configurable rather than hard-coded permanently.

Implementation recommendation:
- Default to an editable weekly or annual State Pension forecast.
- Provide a shortcut for the full-rate default, but warn that actual entitlement depends on NI record.
- Store State Pension start age as a policy-derived or user-confirmed field, not a fixed constant.

## 2. State Pension age
1. State Pension age should not be hard-coded as a universal constant.
2. The official government guidance states that State Pension age is regularly reviewed and can change.
3. The model should therefore use a date-of-birth-driven policy table or a user-confirmed pension age input.

Implementation recommendation:
- In v1, allow the user to confirm their State Pension age after entering date of birth.
- In the assumptions layer, separate personal retirement age from State Pension age.

## 3. Income tax assumptions
Source basis: GOV.UK rates for tax year 6 April 2026 to 5 April 2027.

1. Personal Allowance: £12,570
2. Basic rate: 20% on £12,571 to £50,270
3. Higher rate: 40% on £50,271 to £125,140
4. Additional rate: 45% above £125,140
5. Personal Allowance tapers away by £1 for every £2 of adjusted net income above £100,000 and reaches zero at £125,140.
6. Scottish tax treatment differs and should be modeled separately later.

Implementation recommendation:
- v1 should explicitly support England, Wales, and Northern Ireland tax bands.
- Add a region selector and mark Scotland as deferred if not implemented at launch.

## 4. Pension access and drawdown assumptions
1. Government guidance says pension access is usually after age 55, subject to scheme rules and exceptions.
2. Users can usually take up to 25% of pension benefits as a tax-free lump sum, subject to current allowances.
3. The published cap for tax-free lump sums is £268,275 unless the user has protected allowances.
4. Taxable pension withdrawals count toward annual taxable income.
5. Large lump-sum withdrawals can create temporary over-withholding or higher-rate tax outcomes.

Implementation recommendation:
- v1 should support a simplified drawdown model:
  - tax-free portion assumption,
  - taxable drawdown income,
  - annual tax estimate,
  - configurable withdrawal start age.
- Advanced optimization of withdrawal sequencing should be deferred.

## 5. Account wrappers for v1
1. Pension / SIPP: tax-advantaged accumulation, taxable drawdown apart from tax-free entitlement.
2. ISA: tax-advantaged accumulation and tax-free withdrawals.
3. General investment account: optional later, but useful if the user already has non-wrapper assets.

Implementation recommendation:
- Minimum viable wrapper set for v1: SIPP / pension and ISA.
- Add taxable brokerage / GIA as a simple optional account if you want more realism in bridge years before pension access.

## 6. Inflation and longevity assumptions
1. Inflation should be explicit and editable.
2. Longevity should be treated as a planning horizon assumption, not a certainty.
3. The model should separate real-spending goals from nominal cash-flow calculations.

Implementation recommendation:
- v1 default: one inflation assumption plus one longevity horizon.
- v1.1: separate price inflation and nominal return assumptions by asset bucket.

## 7. Recommended default assumption strategy
1. Use a small editable assumptions panel rather than many up-front fields.
2. Default to realistic but conservative assumptions.
3. Track every assumption version so model outputs remain explainable and reproducible.

## 8. Key design implication
For credibility, the app should prefer user-specific forecast inputs for State Pension and simple, auditable tax logic over pretending to know exact future entitlements. The first release should be honest, configurable, and transparent rather than over-optimized.

## Official sources consulted
- GOV.UK: New State Pension eligibility and amount
- GOV.UK: State Pension age tool and guidance
- GOV.UK: Income Tax rates and Personal Allowances
- GOV.UK: Tax when you get a pension and tax-free pension guidance
