import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  deserializePreferences,
} from "../models/UserPreferences";

const PREFERENCES_STORAGE_KEY = "userPreferences";

interface Plan {
  name: string;
  provider: string;
  premium: number;
}

const FALLBACK_PLANS: Plan[] = [
  { name: "HealthFirst Essential", provider: "HealthFirst", premium: 295 },
  { name: "United Health Silver", provider: "UnitedHealthcare", premium: 425 },
  { name: "BlueCross Gold Plus", provider: "BlueCross BlueShield", premium: 580 },
];

function loadStoredPreferences(): UserPreferences {
  try {
    const raw = sessionStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return deserializePreferences(raw) ?? DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function CostResultsPage() {
  const navigate = useNavigate();
  const [preferences] = useState<UserPreferences>(loadStoredPreferences);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const zip = preferences.zipCode?.trim();
    if (!zip) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/plans?zip=${encodeURIComponent(zip)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Plan[]>;
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      })
      .catch(() => {
        // CMS API unavailable — keep FALLBACK_PLANS already in state
      })
      .finally(() => setIsLoading(false));
  }, [preferences.zipCode]);

  const premiums = plans.map((p) => p.premium);
  const minPremium = Math.min(...premiums);
  const maxPremium = Math.max(...premiums);
  const avgPremium = Math.round(
    premiums.reduce((sum, p) => sum + p, 0) / premiums.length
  );

  const formatUSD = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estimated Plan Costs
          </h1>
          <p className="text-gray-600">
            {preferences.zipCode
              ? `Based on your ZIP code ${preferences.zipCode}`
              : "Based on available plan data"}
          </p>
        </header>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">Loading cost estimates...</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-lg shadow p-8 mb-6">
              <div className="text-center mb-8">
                <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">
                  Average Monthly Premium
                </p>
                <p className="text-5xl font-bold text-gray-900">
                  {formatUSD(avgPremium)}
                </p>
                <p className="text-sm text-gray-500 mt-1">per month</p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm uppercase tracking-wide text-gray-500 mb-3 text-center">
                  Price Range
                </p>
                <div className="flex justify-between items-end max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Low</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatUSD(minPremium)}
                    </p>
                  </div>
                  <div className="flex-1 h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 mx-4 rounded" />
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">High</p>
                    <p className="text-2xl font-semibold text-gray-800">
                      {formatUSD(maxPremium)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Available Plans
              </h2>
              <ul className="divide-y divide-gray-200">
                {plans.map((plan, idx) => (
                  <li
                    key={`${plan.name}-${idx}`}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.provider}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatUSD(plan.premium)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/compare-plans")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Compare Plans in Detail
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors"
              >
                Update Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
