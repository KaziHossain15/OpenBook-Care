import type { UserPreferences } from "../models/UserPreferences";

interface CoverageEligibilityCalloutsProps {
  preferences: UserPreferences;
  /** Extra class on the outer wrapper (e.g. margin). */
  className?: string;
}

/**
 * Contextual reminders about Medicare, student/university plans, and Medicaid
 * thresholds — shared between the preferences form and Compare Plans.
 */
export function CoverageEligibilityCallouts({
  preferences,
  className = "",
}: CoverageEligibilityCalloutsProps) {
  const age = preferences.age;
  const income = preferences.income;
  const familySize = preferences.familySize;

  const thresholds: Record<string, number> = {
    "1": 21597,
    "2": 29187,
    "3": 36777,
    "4": 44367,
    "5+": 51957,
  };

  const limit = thresholds[familySize] ?? 51957;
  const showMedicaidEligible =
    age >= 19 && age <= 64 && income <= limit;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {preferences.age >= 65 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          You are eligible for Medicare coverage (65+). Consider reviewing
          Medicare options as part of your decision.
        </div>
      )}

      {preferences.age >= 18 &&
        preferences.age <= 22 &&
        preferences.employmentStatus === "student" && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            As a student aged 18–22, you may also qualify for special
            university/student health plans. Check with your school for
            available coverage options.
          </div>
        )}

      {age >= 19 && age <= 64 && (
        <>
          {showMedicaidEligible ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Based on age {age} and household size {familySize}, your income of
              ${income.toLocaleString()} is at or below the Medicaid threshold
              (~${limit.toLocaleString()}). You may be eligible for Medicaid
              coverage.
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              For ages 19–64, Medicaid thresholds are approximately $
              {thresholds["1"].toLocaleString()} for one person, $
              {thresholds["2"].toLocaleString()} for two people, and increase for
              larger households. Your current income is above the estimate for
              your household size.
            </div>
          )}
        </>
      )}
    </div>
  );
}
