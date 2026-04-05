import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface UsageInputs {
  pcpVisits: number;
  specialistVisits: number;
  labTests: number;
  imagingEvents: number;
  erVisits: number;
}

export interface SimulateUsageController {
  inputs: UsageInputs;
  updateField: <K extends keyof UsageInputs>(
    field: K,
    value: UsageInputs[K]
  ) => void;
  runSimulation: () => void;
}

const DEFAULT_USAGE_INPUTS: UsageInputs = {
  pcpVisits: 4,
  specialistVisits: 2,
  labTests: 1,
  imagingEvents: 0,
  erVisits: 0,
};

export function useSimulateUsageController(): SimulateUsageController {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<UsageInputs>(DEFAULT_USAGE_INPUTS);

  const updateField = useCallback(
    <K extends keyof UsageInputs>(field: K, value: UsageInputs[K]) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const runSimulation = useCallback(() => {
    navigate("/compare-plans", {
      state: {
        restoreSimulation: {
          activeIndex: 1,
          dependents: 0,
          primaryVisits: inputs.pcpVisits,
          specialistVisits: inputs.specialistVisits,
          prescriptions: inputs.labTests,
          erVisits: inputs.erVisits,
        },
      },
    });
  }, [inputs, navigate]);

  return { inputs, updateField, runSimulation };
}