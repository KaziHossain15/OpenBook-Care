// GRASP: Information Expert
// This model owns everything about UserPreferences — shape, defaults, and
// validation — so no other layer needs to re-know those rules.

export type RiskTolerance = "low" | "moderate" | "high";
export type EmploymentStatus =
  | "employed"
  | "employed-no-benefits"
  | "self-employed"
  | "unemployed"
  | "retired"
  | "student";

export interface UserPreferences {
  age: number;
  income: number;
  location: string;
  familySize: string;
  employmentStatus: EmploymentStatus;
  riskTolerance: RiskTolerance;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  age: 30,
  income: 50000,
  location: "MA",
  familySize: "1",
  employmentStatus: "employed",
  riskTolerance: "moderate",
};

/** Information Expert: only this model knows what makes preferences valid */
export function isPreferencesValid(prefs: UserPreferences): boolean {
  return (
    prefs.age >= 18 &&
    prefs.age <= 100 &&
    prefs.income >= 0 &&
    !!prefs.familySize &&
    !!prefs.employmentStatus &&
    !!prefs.riskTolerance
  );
}

/** Information Expert: only this model knows how to serialise itself */
export function serializePreferences(prefs: UserPreferences): string {
  return JSON.stringify(prefs);
}

export function deserializePreferences(raw: string): UserPreferences {
  return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
}
