// GRASP: Low Coupling + High Cohesion
// Pure presentational component. Knows how to render the preferences form and
// fire events — nothing else. It does not own state, does not know what happens
// after submission, and does not know how validation works. All of that is the
// controller's concern.

import React from "react";
import { ArrowRight } from "lucide-react";
import type { UserPreferences } from "../models/UserPreferences";

interface PreferencesFormProps {
  preferences: UserPreferences;
  isValid: boolean;
  onFieldChange: <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ) => void;
  onSubmit: () => void;
}

export function PreferencesForm({
  preferences,
  isValid,
  onFieldChange,
  onSubmit,
}: PreferencesFormProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Your Demographics & Preferences
        </h2>
      </div>
      <div className="space-y-8 px-6 py-6">

        {/* Age */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Age</label>
            <span className="text-sm font-medium">{preferences.age} years</span>
          </div>
          <input
            type="range"
            value={preferences.age}
            onChange={(e) => onFieldChange("age", Number(e.target.value))}
            min={18}
            max={100}
            step={1}
            className="w-full"
          />
          {preferences.age >= 65 && (
            <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              You are eligible for Medicare coverage (65+). Consider reviewing
              Medicare options as part of your decision.
            </div>
          )}

          {(() => {
            const age = preferences.age;
            const income = preferences.income;
            const familySize = preferences.familySize;
            if (age < 19 || age > 64) return null;

            const thresholds: Record<string, number> = {
              "1": 21597,
              "2": 29187,
              "3": 36777,
              "4": 44367,
              "5+": 51957,
            };

            const limit = thresholds[familySize] ?? 51957;
            if (income <= limit) {
              return (
                <div className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Based on age {age} and household size {familySize}, your income
                  of ${income.toLocaleString()} is at or below the Medicaid
                  threshold (~${limit.toLocaleString()}). You may be eligible
                  for Medicaid coverage.
                </div>
              );
            }

            return (
              <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                For ages 19–64, Medicaid thresholds are approximately ${thresholds["1"].toLocaleString()} for
                one person, ${thresholds["2"].toLocaleString()} for two people,
                and increase for larger households. Your current income is
                above the estimate for your household size.
              </div>
            );
          })()}
        </div>

        {/* Annual Income */}
        <div>
          <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Annual Income</label>
            <span className="text-sm font-medium">
              ${preferences.income.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            value={preferences.income}
            onChange={(e) => onFieldChange("income", Number(e.target.value))}
            min={0}
            max={200000}
            step={5000}
            className="w-full"
          />
        </div>

        {/* Location (read-only for now — state locked to MA) */}
        <div>
          <label className="mb-2 block text-sm font-medium">Location</label>
          <div className="flex items-center px-3 py-2 border rounded-md bg-gray-50">
            <span className="text-sm">Massachusetts</span>
          </div>
        </div>

        {/* Family Size */}
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="familySize">
            Family Size
          </label>
          <select
            id="familySize"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={preferences.familySize}
            onChange={(e) => onFieldChange("familySize", e.target.value)}
          >
            <option value="1">Just me</option>
            <option value="2">Me + 1 dependent</option>
            <option value="3">Me + 2 dependents</option>
            <option value="4">Me + 3 dependents</option>
            <option value="5+">Me + 4+ dependents</option>
          </select>
        </div>

        {/* Employment Status */}
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="employmentStatus"
          >
            Employment Status
          </label>
          <select
            id="employmentStatus"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={preferences.employmentStatus}
            onChange={(e) =>
              onFieldChange(
                "employmentStatus",
                e.target.value as UserPreferences["employmentStatus"],
              )
            }
          >
            <option value="employed">Employed (with benefits)</option>
            <option value="employed-no-benefits">Employed (no benefits)</option>
            <option value="self-employed">Self-employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
            <option value="student">Student</option>
          </select>
        </div>

        {/* Risk Tolerance */}
        <div>
          <label className="mb-4 block text-sm font-medium">
            Risk Tolerance
          </label>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
              <input
                type="radio"
                name="riskTolerance"
                value="low"
                checked={preferences.riskTolerance === "low"}
                onChange={(e) =>
                  onFieldChange(
                    "riskTolerance",
                    e.target.value as UserPreferences["riskTolerance"],
                  )
                }
                className="mt-1"
              />
              <span className="flex-1">
                <div className="mb-1 font-medium">
                  Low Risk – High Premium
                </div>
                <div className="text-sm text-gray-600">
                  I want comprehensive coverage and don't mind higher premiums
                  for peace of mind.
                </div>
              </span>
            </label>

            <label className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
              <input
                type="radio"
                name="riskTolerance"
                value="moderate"
                checked={preferences.riskTolerance === "moderate"}
                onChange={(e) =>
                  onFieldChange(
                    "riskTolerance",
                    e.target.value as UserPreferences["riskTolerance"],
                  )
                }
                className="mt-1"
              />
              <span className="flex-1">
                <div className="mb-1 font-medium">
                  Moderate Risk – Balanced
                </div>
                <div className="text-sm text-gray-600">
                  I want a balance between monthly costs and coverage.
                </div>
              </span>
            </label>

            <label className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
              <input
                type="radio"
                name="riskTolerance"
                value="high"
                checked={preferences.riskTolerance === "high"}
                onChange={(e) =>
                  onFieldChange(
                    "riskTolerance",
                    e.target.value as UserPreferences["riskTolerance"],
                  )
                }
                className="mt-1"
              />
              <span className="flex-1">
                <div className="mb-1 font-medium">
                  High Risk – Low Premium
                </div>
                <div className="text-sm text-gray-600">
                  I'm healthy and want to minimise monthly costs, even if I
                  pay more when I need care.
                </div>
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!isValid}
          size="lg"
          className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View Cost Estimates
          <ArrowRight className="size-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
