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
  /** US ZIP — exactly five digits (0–9). */
  zipCode: string;
  familySize: string;
  employmentStatus: EmploymentStatus;
  riskTolerance: RiskTolerance;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  age: 30,
  income: 50000,
  zipCode: "",
  familySize: "1",
  employmentStatus: "employed",
  riskTolerance: "moderate",
};

/** True when `zip` is a five-digit US ZIP code string. */
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/** Information Expert: only this model knows what makes preferences valid */
export function isPreferencesValid(prefs: UserPreferences): boolean {
  return (
    prefs.age >= 18 &&
    prefs.age <= 100 &&
    prefs.income >= 0 &&
    isValidZipCode(prefs.zipCode) &&
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
  const parsed = JSON.parse(raw) as Partial<UserPreferences> & {
    location?: string;
  };
  const { location: legacyLocation, ...rest } = parsed;
  const merged: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...rest,
    zipCode:
      typeof parsed.zipCode === "string"
        ? parsed.zipCode.replace(/\D/g, "").slice(0, 5)
        : DEFAULT_PREFERENCES.zipCode,
  };
  // Legacy sessions stored state abbreviation in `location` instead of ZIP.
  if (!isValidZipCode(merged.zipCode) && legacyLocation === "MA") {
    merged.zipCode = "02101";
  }
  return merged;
}
