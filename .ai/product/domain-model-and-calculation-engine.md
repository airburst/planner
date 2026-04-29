# Domain Model and Calculation Engine Design

Date: 2026-04-29
Scope: stack-agnostic design for a UK consumer retirement-planning engine.
Goal: define the core financial model separately from interface and infrastructure choices.

## 1. Design principles
1. The calculation engine should be a pure, deterministic core for v1.
2. Product rules, policy tables, and assumptions should live outside UI code.
3. Inputs, assumptions, and outputs should be auditable and versionable.
4. Scenario comparison should reuse a common base-plan structure with overrides.
5. Advanced features should extend the same domain model rather than create parallel engines.

## 2. Core bounded areas

### A. User and household profile
Represents who the plan is for.
Key responsibilities:
- personal details needed for retirement timing,
- region and tax treatment selection,
- household composition,
- planning horizon metadata.

### B. Financial position
Represents current balances, contributions, income sources, and spending needs.
Key responsibilities:
- account wrappers,
- contributions,
- income streams,
- expense targets.

### C. Assumptions and policy
Represents model settings and external rules.
Key responsibilities:
- inflation and growth assumptions,
- tax rules,
- pension rules,
- State Pension rules,
- longevity assumptions.

### D. Projection engine
Transforms plan inputs into year-by-year outcomes.
Key responsibilities:
- pre-retirement accumulation,
- retirement drawdown,
- tax application,
- shortfall/surplus calculation,
- derived summary metrics.

### E. Scenario and insight layer
Represents scenario overrides, comparison logic, stress presets, and recommendations.
Key responsibilities:
- plan variants,
- side-by-side comparison,
- trigger evaluation,
- recommendation generation.

## 3. Domain entities

### 3.1 HouseholdPlan
The top-level planning aggregate.
Fields:
- planId
- planName
- ownerProfile
- partnerProfile optional
- baseFinancialProfile
- baseAssumptions
- scenarios
- metadata

Notes:
- This should be the aggregate root for persistence and comparison.

### 3.2 PersonProfile
Represents a person in the household.
Fields:
- personId
- dateOfBirth
- currentAge derived or stored
- plannedRetirementAge
- statePensionAge
- regionTaxProfile
- taxUnitId
- niQualifyingYears optional
- statePensionForecastAmount optional
- longevityTargetAge

Notes:
- Keep retirement age separate from State Pension age.
- State Pension forecast should be explicit rather than inferred when possible.
- A HouseholdPlan may contain a primary person only or a primary plus partner person while remaining a single user-centric plan.
- Each person remains a separate tax unit unless a future jurisdiction-specific rule explicitly says otherwise.

### 3.3 FinancialProfile
Represents the editable financial position.
Fields:
- accounts
- incomeStreams
- expenses
- contributions
- oneOffEvents optional

Notes:
- FinancialProfile should support both person-owned and household-level financial items.

### 3.4 Account
Base abstraction for asset containers.
Common fields:
- accountId
- accountType
- ownerRef
- currentBalance
- annualContribution
- nominalGrowthAssumptionRef optional
- withdrawalRulesRef optional

Subtypes for v1:
- PensionAccount
- IsaAccount
- Optional TaxableInvestmentAccount later

#### PensionAccount
Additional fields:
- accessibleFromAge
- taxFreeLumpSumEligible boolean
- taxFreeLumpSumUsedAmount optional
- taxFreeLumpSumRemainingAmount optional
- annualEmployerContribution optional

#### IsaAccount
Additional fields:
- withdrawalTaxTreatment = tax_free

### 3.5 IncomeStream
Represents recurring income.
Fields:
- incomeId
- type
- ownerRef or householdScope
- annualAmount or payment schedule
- startAge or startYear
- endAge or endYear optional
- taxableFlag
- inflationLinkedFlag

Subtypes:
- EmploymentIncome
- StatePensionIncome
- DefinedBenefitIncome
- OtherRecurringIncome

Notes:
- Income streams must be independently time-based so a defined benefit pension can start before State Pension.
- The engine should support overlapping income phases, not assume a single retirement-income start date.
- Income streams must support primary-person ownership, partner ownership, or household scope so the system can remain single user-centric while modeling partner income correctly.

### 3.6 ExpenseProfile
Represents retirement spending targets.
Fields:
- essentialAnnualSpend
- discretionaryAnnualSpend
- inflationLinkedFlag
- retirementSpendingStartAge
- oneOffExpenses optional
- scope optional

Notes:
- This structure supports future needs / wants / wishes without redesign.
- `scope` allows spending to be modeled at household level or, if later required, person level.

### 3.7 AssumptionSet
Represents all assumptions for a model run.
Fields:
- assumptionSetId
- versionLabel
- inflationRate
- defaultNominalReturnByAccountType
- salaryGrowth optional
- statePensionIndexationRule
- taxRuleSetRef
- pensionRuleSetRef
- simulationSettings optional for v1.1

### 3.8 TaxRuleSet
Represents jurisdiction-specific tax logic.
Fields:
- taxYearLabel
- region
- personalAllowance
- allowanceTaperRules
- bandDefinitions
- dividendRules optional
- savingsRules optional

Notes:
- v1 can keep this narrow and only include what the planner actually uses.
- In partner mode, TaxRuleSet is applied separately to each person's taxable income rather than to a pooled household income figure.

### 3.8.1 PersonTaxComputation
Represents one person's tax position for a single simulation year.
Fields:
- personRef
- taxYearLabel
- grossTaxableIncome
- allowanceApplied
- adjustedNetIncome optional
- bandAllocations
- estimatedIncomeTax

Notes:
- Household totals should be formed by aggregating per-person tax computations, not by taxing household income as a single pot.

### 3.9 PensionRuleSet
Represents pension-access and withdrawal rules.
Fields:
- minimumAccessAge
- defaultTaxFreeLumpSumPercent
- taxFreeLumpSumCap
- drawdownRulesSummary

### 3.9.1 WithdrawalStrategy
Represents a configurable drawdown approach.
Fields:
- strategyId
- strategyName
- accountPriorityOrder
- taxFreeCashUsageRule
- preserveIsaPreference optional
- targetTaxBand optional

Notes:
- This is optional in v1 but becomes central for advanced drawdown recommendation features.

### 3.10 Scenario
Represents a variant of the base plan.
Fields:
- scenarioId
- scenarioName
- basePlanRef
- overrideSet
- tags optional

Notes:
- OverrideSet should contain only changed values, not a full duplicated plan.

### 3.11 OverrideSet
Represents scenario-specific changes.
Fields:
- changedRetirementAge optional
- changedSpending optional
- changedContribution values optional
- changedAssumptions optional
- changedIncome timings optional

### 3.12 ProjectionRun
Represents one execution of the engine.
Fields:
- runId
- inputSnapshotHash
- assumptionsVersion
- scenarioId
- generatedAt
- outputSummary
- annualRows
- warnings

### 3.13 ProjectionYearRow
Represents one simulation year.
Fields:
- calendarYear or modelYearIndex
- agePrimary
- agePartner optional
- openingBalances by account
- contributions
- investmentGrowth
- grossIncome
- taxableIncome
- estimatedTax
- personTaxComputations optional
- netSpendRequirement
- withdrawals by account
- closingBalances by account
- annualSurplusOrShortfall

Notes:
- In single-person mode, `personTaxComputations` may contain one item or be collapsed into summary fields.
- In partner mode, `taxableIncome` and `estimatedTax` should be treated as household summary fields derived from the per-person tax computations.

### 3.14 Recommendation
Represents one actionable insight.
Fields:
- recommendationId
- type
- triggerReason
- estimatedImpactText
- rankingScore
- suggestedChange

### 3.15 AdvancedFeatureTrigger
Represents a rule that reveals deeper tooling.
Fields:
- triggerId
- triggerGroup
- conditionDefinition
- targetFeature
- explanationText

## 4. Core relationships
1. A HouseholdPlan owns one base FinancialProfile and one base AssumptionSet.
2. A HouseholdPlan can have many Scenarios.
3. Each Scenario references the base plan and an OverrideSet.
4. A ProjectionRun is created for exactly one Scenario under one assumptions snapshot.
5. A ProjectionRun contains many ProjectionYearRow records.
6. Recommendations are derived from ProjectionRun outputs.
7. AdvancedFeatureTriggers evaluate against plan state, scenario state, and user behavior state.

## 5. Calculation engine responsibilities

### Inputs to the engine
- normalized household plan
- effective scenario override set
- effective assumption set
- applicable policy tables

### Outputs from the engine
- annual projection rows
- summary metrics
- warnings and validation issues
- recommendation inputs
- advanced-trigger inputs

## 6. Proposed engine pipeline

### Stage 1: Normalize input
Tasks:
- merge base plan with scenario overrides,
- resolve missing defaults,
- validate domain constraints,
- select policy tables for tax year and region.

### Stage 2: Build simulation timeline
Tasks:
- determine start year,
- determine end year from longevity horizon,
- map ages by year for each household member,
- mark retirement and State Pension eligibility years.

Household note:
- In partner mode, the timeline must track primary and partner ages separately so income streams can activate at different times.
- In partner mode, the engine must also track per-person taxable income separately because Personal Allowances and tax bands apply to individuals, not to the household as a single tax unit.

### Stage 3: Simulate each year
For each simulation year:
1. Load opening balances.
2. Apply contributions if before retirement or if post-retirement contribution rules allow them.
3. Apply investment growth assumptions.
4. Add recurring income streams active in that year.
5. Compute target spending for that year after inflation.
6. Allocate taxable income to the correct person tax units and estimate tax separately for each person.
7. Calculate net funding need.
8. Withdraw from accounts using v1 withdrawal rules.
9. Record surplus or shortfall.
10. Store closing balances and warnings.

Important bridge-year behavior:
- The engine must correctly handle retirement periods where defined benefit income starts at one age, State Pension starts later, and remaining spending needs are funded from SIPP and ISA assets in the intervening years.
- The engine must be able to evaluate whether use of the SIPP 25% tax-free element improves bridge-year tax efficiency.
- In partner mode, the engine must aggregate household income while still preserving per-person attribution for taxes, pension timing, and explanation outputs.
- A tax-efficient recommendation must not assume that unused allowance from one person automatically offsets taxable income of the other unless a specific modeled rule supports that transfer.

### Stage 4: Derive summary outputs
Tasks:
- detect depletion year if any,
- compute years funded,
- compute deterministic safe-spending estimate,
- estimate earliest sustainable retirement age,
- compute comparison metrics for scenario view.

### Stage 5: Generate insights
Tasks:
- evaluate recommendation rules,
- evaluate advanced feature triggers,
- attach human-readable explanation payloads.

## 7. Recommended v1 withdrawal logic
Keep v1 intentionally simple and explicit.

Suggested order:
1. Use guaranteed income sources first.
2. Use defined benefit and State Pension income streams when active for that year.
3. Use pension tax-free entitlement only when drawdown begins and when explicitly modeled.
4. Use taxable pension withdrawals for remaining need after guaranteed income.
5. Use ISA withdrawals as tax-free balancing withdrawals, including bridge years before State Pension starts.

Alternative implementation note:
- You may choose a simpler default of pension-first or ISA-bridge-first, but it must be clearly explained because withdrawal order strongly affects tax and bridge-to-pension years.

Advanced drawdown recommendation note:
- A later recommendation layer should evaluate alternative patterns for using taxable SIPP drawdown, ISA withdrawals, and the remaining 25% tax-free pension cash.
- The recommendation output should explicitly identify when preserving headroom in a lower tax band produces a better bridge strategy.

## 8. Safe-spending calculation options
For v1, avoid pretending to produce a mathematically exact universal safe-withdrawal figure.

Recommended approach:
1. Solve for the maximum annual retirement spending that avoids depletion before the planning horizon under deterministic assumptions.
2. Present it as a model-based estimate, not a guarantee.
3. Recompute it under each stress preset for context.

## 9. Recommendation layer design
Recommendation rules should be derived from interpretable conditions, not opaque scoring.

Examples:
1. If shortfall persists, suggest later retirement.
2. If bridge years before State Pension are weak, suggest increasing ISA bridge assets.
3. If spending is close to the pass/fail boundary, suggest stress testing or advanced analysis.
4. If pension contributions have high modeled impact, suggest raising annual pension saving.

## 10. Progressive-disclosure trigger design
Advanced tooling should appear when the deterministic plan indicates ambiguity, risk, or complexity.

Possible trigger evaluations:
1. Funding shortfall occurs in any future year.
2. Retirement end balance is close to zero.
3. Multiple scenarios have similar outcomes within a defined margin.
4. User repeatedly changes return or inflation assumptions.
5. User has mixed wrappers and bridge years before pension access.

## 11. Versioning and auditability
Every run should capture:
1. input snapshot identifier,
2. scenario identifier,
3. assumption set version,
4. policy table version,
5. generated outputs and warnings.

This is important for trust and for future debugging once you have a production stack.

## 12. Extension path for v1.1 and beyond

### Monte Carlo extension
Add:
- SimulationAssumptionSet
- SimulationRun
- PercentileOutcomeSummary

Reuse:
- HouseholdPlan
- Scenario
- AssumptionSet
- Projection output contracts where possible

### Advanced drawdown extension
Add:
- WithdrawalStrategy
- TaxOptimizationSettings optional
- AccountPriorityRules
- TaxFreeCashRecommendation

### Historical backtesting extension
Add:
- ReturnSeriesDataset
- RegimeDefinition
- HistoricalScenarioRun

## 13. Suggested first technical milestone
Before selecting a full app stack, build or specify an engine harness that can:
1. ingest one normalized plan,
2. run one deterministic projection,
3. emit annual projection rows,
4. compare one alternative scenario,
5. output recommendation candidates.

That artifact will clarify the eventual API shape and frontend needs better than premature framework choices.
