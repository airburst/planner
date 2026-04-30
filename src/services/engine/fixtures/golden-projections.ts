import type {
  AccountContext,
  AssumptionSet,
  IncomeStreamContext,
  PersonContext,
  SpendingAssumption,
  WithdrawalStrategy,
} from "../types";

export interface GoldenProjectionRow {
  year: number;
  totalHouseholdIncome: number;
  totalHouseholdTax: number;
  totalHouseholdAssets: number;
}

export interface GoldenProjectionFixture {
  id: string;
  description: string;
  people: PersonContext[];
  accounts: AccountContext[];
  incomeStreams: IncomeStreamContext[];
  spending: SpendingAssumption;
  startYear: number;
  endYear: number;
  expectedRows: GoldenProjectionRow[];
}

export const defaultGoldenAssumptions: AssumptionSet = {
  id: 1,
  planId: 1,
  name: "Golden Baseline",
  inflationRate: 0.02,
  investmentReturn: 0.04,
  personalAllowance: 12570,
  personalSavingsAllowance: 1000,
  basicRateBand: 50270,
  higherRateBand: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  sippTaxFreePercentage: 0.25,
  sippMinimumAgeAccess: 55,
};

export const defaultGoldenWithdrawalStrategy: WithdrawalStrategy = {
  accountTypeOrder: ["cash", "isa", "sipp", "other"],
  optimizeForTaxEfficiency: true,
  sippWithdrawalApproach: "flexible",
};

export const goldenProjectionFixtures: GoldenProjectionFixture[] = [
  {
    id: "single-early-retiree-bridge",
    description: "Single early retiree with bridge-year drawdown before pension activation.",
    people: [
      {
        id: 1,
        planId: 1,
        role: "primary",
        name: "Alex",
        dateOfBirth: new Date("1966-01-01"),
      },
    ],
    accounts: [
      { id: 1, planId: 1, personId: 1, name: "Cash", type: "cash", openingBalance: 60000 },
      { id: 2, planId: 1, personId: 1, name: "ISA", type: "isa", openingBalance: 120000 },
      { id: 3, planId: 1, personId: 1, name: "SIPP", type: "sipp", openingBalance: 250000 },
    ],
    incomeStreams: [
      {
        id: 1,
        planId: 1,
        personId: 1,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 12000,
        isIndexed: true,
      },
    ],
    spending: {
      id: 1,
      planId: 1,
      annualSpendingTarget: 36000,
      isIndexed: true,
    },
    startYear: 2026,
    endYear: 2030,
    expectedRows: [
      { year: 2026, totalHouseholdIncome: 0, totalHouseholdTax: 0, totalHouseholdAssets: 417955 },
      { year: 2027, totalHouseholdIncome: 0, totalHouseholdTax: 0, totalHouseholdAssets: 404414 },
      { year: 2028, totalHouseholdIncome: 0, totalHouseholdTax: 0, totalHouseholdAssets: 389271 },
      { year: 2029, totalHouseholdIncome: 0, totalHouseholdTax: 0, totalHouseholdAssets: 372413 },
      { year: 2030, totalHouseholdIncome: 0, totalHouseholdTax: 0, totalHouseholdAssets: 353718 },
    ],
  },
  {
    id: "couple-db-plus-state",
    description: "Partner-mode household with DB pension and staggered state pension activation.",
    people: [
      {
        id: 1,
        planId: 1,
        role: "primary",
        name: "Jamie",
        dateOfBirth: new Date("1965-01-01"),
      },
      {
        id: 2,
        planId: 1,
        role: "partner",
        name: "Sam",
        dateOfBirth: new Date("1968-01-01"),
      },
    ],
    accounts: [
      {
        id: 10,
        planId: 1,
        personId: 1,
        name: "Primary ISA",
        type: "isa",
        openingBalance: 150000,
      },
      {
        id: 11,
        planId: 1,
        personId: 2,
        name: "Partner SIPP",
        type: "sipp",
        openingBalance: 200000,
      },
    ],
    incomeStreams: [
      {
        id: 20,
        planId: 1,
        personId: 1,
        name: "DB Pension",
        type: "db_pension",
        activationAge: 60,
        annualAmount: 22000,
        isIndexed: true,
      },
      {
        id: 21,
        planId: 1,
        personId: 1,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 11000,
        isIndexed: true,
      },
      {
        id: 22,
        planId: 1,
        personId: 2,
        name: "State Pension",
        type: "state_pension",
        activationAge: 67,
        annualAmount: 10000,
        isIndexed: true,
      },
    ],
    spending: {
      id: 1,
      planId: 1,
      annualSpendingTarget: 50000,
      isIndexed: true,
    },
    startYear: 2026,
    endYear: 2030,
    expectedRows: [
      { year: 2026, totalHouseholdIncome: 22000, totalHouseholdTax: 9372, totalHouseholdAssets: 279166 },
      { year: 2027, totalHouseholdIncome: 22440, totalHouseholdTax: 9806, totalHouseholdAssets: 201936 },
      { year: 2028, totalHouseholdIncome: 22889, totalHouseholdTax: 10304, totalHouseholdAssets: 117825 },
      { year: 2029, totalHouseholdIncome: 23347, totalHouseholdTax: 7944, totalHouseholdAssets: 47277 },
      { year: 2030, totalHouseholdIncome: 23814, totalHouseholdTax: 2249, totalHouseholdAssets: 15752 },
    ],
  },
  {
    id: "high-earner-tax-trap",
    description: "Single high earner in the personal allowance taper range.",
    people: [
      {
        id: 1,
        planId: 1,
        role: "primary",
        name: "Taylor",
        dateOfBirth: new Date("1976-01-01"),
      },
    ],
    accounts: [
      { id: 30, planId: 1, personId: 1, name: "SIPP", type: "sipp", openingBalance: 100000 },
    ],
    incomeStreams: [
      {
        id: 31,
        planId: 1,
        personId: 1,
        name: "Salary",
        type: "salary",
        activationAge: 18,
        annualAmount: 110000,
        isIndexed: false,
      },
    ],
    spending: {
      id: 1,
      planId: 1,
      annualSpendingTarget: 70000,
      isIndexed: false,
    },
    startYear: 2026,
    endYear: 2028,
    expectedRows: [
      { year: 2026, totalHouseholdIncome: 110000, totalHouseholdTax: 33432, totalHouseholdAssets: 72648 },
      { year: 2027, totalHouseholdIncome: 110000, totalHouseholdTax: 33432, totalHouseholdAssets: 43633 },
      { year: 2028, totalHouseholdIncome: 110000, totalHouseholdTax: 33432, totalHouseholdAssets: 12854 },
    ],
  },
  {
    id: "sipp-heavy-drawdown",
    description: "SIPP-only drawdown validates tax treatment across repeated years.",
    people: [
      {
        id: 1,
        planId: 1,
        role: "primary",
        name: "Morgan",
        dateOfBirth: new Date("1964-01-01"),
      },
    ],
    accounts: [
      { id: 40, planId: 1, personId: 1, name: "SIPP", type: "sipp", openingBalance: 300000 },
    ],
    incomeStreams: [],
    spending: {
      id: 1,
      planId: 1,
      annualSpendingTarget: 45000,
      isIndexed: true,
    },
    startYear: 2026,
    endYear: 2029,
    expectedRows: [
      { year: 2026, totalHouseholdIncome: 0, totalHouseholdTax: 6486, totalHouseholdAssets: 264018 },
      { year: 2027, totalHouseholdIncome: 0, totalHouseholdTax: 6666, totalHouseholdAssets: 224714 },
      { year: 2028, totalHouseholdIncome: 0, totalHouseholdTax: 6850, totalHouseholdAssets: 181862 },
      { year: 2029, totalHouseholdIncome: 0, totalHouseholdTax: 7037, totalHouseholdAssets: 135225 },
    ],
  },
];
