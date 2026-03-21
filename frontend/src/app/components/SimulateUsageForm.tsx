import React from "react";
import type { UsageInputs } from "../controllers/useSimulateUsageController";

interface SimulateUsageFormProps {
  inputs: UsageInputs;
  onFieldChange: <K extends keyof UsageInputs>(
    field: K,
    value: UsageInputs[K]
  ) => void;
  onSubmit: () => void;
}

export function SimulateUsageForm({
  inputs,
  onFieldChange,
  onSubmit,
}: SimulateUsageFormProps) {
  const fields: {
    label: string;
    key: keyof UsageInputs;
    max: number;
  }[] = [
    { label: "Primary Care Visits", key: "pcpVisits", max: 20 },
    { label: "Specialist Visits", key: "specialistVisits", max: 12 },
    { label: "Lab Tests", key: "labTests", max: 12 },
    { label: "Imaging Events", key: "imagingEvents", max: 6 },
    { label: "Emergency Room Visits", key: "erVisits", max: 5 },
  ];

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Simulate Your Healthcare Usage
        </h2>
      </div>

      <div className="space-y-8 px-6 py-6">
        {fields.map(({ label, key, max }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">{label}</label>
              <span className="text-sm font-medium">{inputs[key]}</span>
            </div>
            <input
              type="range"
              value={inputs[key]}
              onChange={(e) => onFieldChange(key, Number(e.target.value))}
              min={0}
              max={max}
              step={1}
              className="w-full"
            />
          </div>
        ))}

        <button
          onClick={onSubmit}
          className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Run Simulation
        </button>
      </div>
    </div>
  );
}