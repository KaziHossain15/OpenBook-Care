import React from "react";
import { SimulateUsageForm } from "../components/SimulateUsageForm";
import { useSimulateUsageController } from "../controllers/useSimulateUsageController";

export function SimulateUsage() {
  const controller = useSimulateUsageController();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl mb-2">Step 3: Simulate Your Usage</h2>
          <p className="text-gray-600">
            Adjust your expected healthcare usage and see how plan costs change
          </p>
        </div>

        <SimulateUsageForm
          inputs={controller.inputs}
          onFieldChange={controller.updateField}
          onSubmit={controller.runSimulation}
        />
      </div>
    </div>
  );
}