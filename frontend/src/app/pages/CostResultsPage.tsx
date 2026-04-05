import React from "react";
import { useNavigate } from "react-router-dom";

export function CostResultsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-semibold mb-4">
          Estimated Plan Costs (Coming Soon)
        </h1>
        <p className="text-gray-600 mb-8">
          Thanks for sharing your preferences. This page will show personalised
          health insurance plan recommendations and cost estimates based on the
          information you entered.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/compare-plans")}
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700"
          >
            Compare Plans
          </button>

          <button
            onClick={() => navigate("/simulate-usage")}
            className="border px-5 py-2 rounded-md hover:bg-gray-100"
          >
            Simulate Usage
          </button>
        </div>
      </div>
    </div>
  );
}



