import { HouseholdYearState, Recommendation } from "./types";

function hasTaxTrapExposure(year: HouseholdYearState): boolean {
  for (const person of year.taxBreakdown.people.values()) {
    if (person.personalAllowance > 0 && person.personalAllowance < 12570) {
      return true;
    }
  }
  return false;
}

function hasTaxableWithdrawals(year: HouseholdYearState): boolean {
  for (const person of year.people.values()) {
    for (const withdrawal of person.withdrawalDetails) {
      if (withdrawal.taxableComponent > 0) {
        return true;
      }
    }
  }
  return false;
}

export function generateRecommendations(
  projectionRunId: number,
  years: HouseholdYearState[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let nextId = 1;

  const firstUnsustainableYear = years.find((year) => !year.canSustainSpending);
  if (firstUnsustainableYear) {
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "high",
      category: "spending",
      title: "Reduce planned spending or add guaranteed income",
      description: "The projection becomes unsustainable in this year under current assumptions.",
      rationale: `Spending is no longer covered in ${firstUnsustainableYear.year}, creating a deficit or exhausting household assets.`,
      yearTriggered: firstUnsustainableYear.year,
    });
  }

  // Only flag depletion when assets were previously positive, then drop to zero,
  // and the plan can no longer sustain spending.
  let hadPositiveAssetsBefore = false;
  let assetDepletionYear: HouseholdYearState | undefined;
  for (const year of years) {
    if (year.totalHouseholdAssets > 0) {
      hadPositiveAssetsBefore = true;
      continue;
    }

    if (hadPositiveAssetsBefore && year.totalHouseholdAssets === 0 && !year.canSustainSpending) {
      assetDepletionYear = year;
      break;
    }
  }

  if (assetDepletionYear) {
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "high",
      category: "withdrawal",
      title: "Address asset depletion risk",
      description: "Projected assets are fully depleted in this year.",
      rationale: `Household assets fall to zero in ${assetDepletionYear.year}, so the plan cannot fund later years without changes.`,
      yearTriggered: assetDepletionYear.year,
    });
  }

  const firstTaxTrapYear = years.find(hasTaxTrapExposure);
  if (firstTaxTrapYear) {
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "medium",
      category: "tax",
      title: "Manage income through the personal allowance taper",
      description: "A person enters the £100k-£125,140 adjusted net income band where the allowance is withdrawn.",
      rationale: `At least one person loses part of their personal allowance in ${firstTaxTrapYear.year}, creating an effective 60% marginal rate in that band.`,
      yearTriggered: firstTaxTrapYear.year,
    });
  }

  const firstTaxableWithdrawalYear = years.find(hasTaxableWithdrawals);
  if (firstTaxableWithdrawalYear) {
    recommendations.push({
      id: nextId++,
      projectionRunId,
      priority: "medium",
      category: "withdrawal",
      title: "Review taxable withdrawal sequencing",
      description: "The projection relies on taxable withdrawals in this year.",
      rationale: `Taxable withdrawals appear in ${firstTaxableWithdrawalYear.year}, so the drawdown order may be creating avoidable tax drag.`,
      yearTriggered: firstTaxableWithdrawalYear.year,
    });
  }

  return recommendations;
}