# Planner Features

Planner is a local-first retirement and long-term financial modeling desktop application focused on
decision support, scenario analysis, and tax-aware drawdown planning.

## 1) Plan Setup

- Create and manage multiple plans (baseline + alternatives)
- Primary user profile with optional partner profile in the same household plan
- Retirement ages, State Pension ages, and longevity horizons per person
- UK-focused defaults with editable assumptions

## 2) Household Financial Model

- Asset wrappers: SIPP/pension and ISA (with optional taxable account later)
- Income streams with independent start ages:
	- Employment income
	- Defined benefit pensions
	- State Pension
	- Other recurring income
- Spending model split into essential and discretionary components

## 3) Projection Engine (Deterministic)

- Year-by-year projection from current age to planning horizon
- Phased income handling (e.g. DB income at 60, State Pension at 67)
- Bridge-year modeling using SIPP/ISA withdrawals
- Annual taxable income and tax estimate outputs
- Safe spending estimate and shortfall/surplus detection

## 4) Partner-Aware Tax Handling

- Single user-centric UX with household plan context
- Per-person tax computation in partner mode
- Household totals derived from person-level tax calculations
- Attribution in outputs (primary vs partner vs household)

## 5) Scenario Planning

- Clone and modify scenarios from a base plan
- Compare scenarios side-by-side on key outcomes
- Change retirement age, spending, savings, and assumptions
- Explain why scenario outcomes diverge

## 6) Drawdown & Bridge Guidance

- Baseline modeling:
	- taxable SIPP drawdown
	- tax-free ISA withdrawals
	- SIPP 25% tax-free cash availability
- Advanced recommendation mode:
	- compare bridge strategies
	- suggest tax-efficient use of SIPP tax-free cash
	- highlight tax-band impacts and trade-offs

## 7) Risk & Confidence Tools

- Preset stress tests (high inflation, weak first decade returns, longer lifespan)
- Trigger-driven progressive disclosure for advanced tools
- Optional later modules:
	- Monte Carlo simulation
	- sequence risk visualization
	- richer drawdown optimization

## 8) Insights & Recommendations

- Action-oriented recommendation cards (top 3 to 5 actions)
- Explainable rationale for each recommendation
- Scenario-sensitive recommendations (not one-size-fits-all)

## 9) Local-First Data & Operations

- SQLite persistence on local machine
- Backup and restore capabilities
- Data folder configuration
- No mandatory authentication for single-device usage

## 10) UX Direction

- TanStack Start + React renderer
- shadcn + Tailwind UI system
- Progressive disclosure: simple defaults first, advanced controls when relevant
- Accessibility and clarity prioritized over dense financial jargon

## Getting Started

For first-time setup and walkthrough guidance, see `docs/NEW-USER-GUIDE.md`.
