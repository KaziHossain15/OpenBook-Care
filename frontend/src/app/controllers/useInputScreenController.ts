import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  deserializePreferences,
  isPreferencesValid,
  serializePreferences,
} from "../models/UserPreferences";

const PREFERENCES_STORAGE_KEY = "userPreferences";

function readStoredPreferences(): UserPreferences {
  try {
    const raw = sessionStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) return deserializePreferences(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFERENCES;
}

function writeStoredPreferences(prefs: UserPreferences): void {
  try {
    sessionStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      serializePreferences(prefs)
    );
  } catch {
    /* ignore */
  }
}

// GRASP: Controller
// Handles the "Enter Preferences" use-case. It is the first object after the
// UI layer to receive and coordinate system events. The view only calls methods
// on this controller — it never touches sessionStorage, navigate, or validation
// logic directly.
//
// GRASP: Low Coupling
// The controller depends on the model and the router, but knows nothing about
// which UI components are rendered. Swap the view entirely and this still works.
//
// GRASP: High Cohesion
// Every method here relates to one use-case: collecting and submitting user
// preferences. Nothing else lives here.

export interface InputScreenController {
  preferences: UserPreferences;
  isValid: boolean;
  updateField: <K extends keyof UserPreferences>(
    field: K,
    value: UserPreferences[K]
  ) => void;
  submit: () => void;
}

export function useInputScreenController(): InputScreenController {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences>(
    readStoredPreferences
  );

  // GRASP: Information Expert delegates validation to the model
  const isValid = isPreferencesValid(preferences);

  // Persist on every change so navigating away and back restores the draft
  const updateField = useCallback(
    <K extends keyof UserPreferences>(field: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [field]: value };
        writeStoredPreferences(next);
        return next;
      });
    },
    []
  );

  // GRASP: Controller coordinates the submit use-case:
  //   1. Guard against invalid state
  //   2. Persist (Creator: the model serialises itself)
  //   3. Navigate
  const submit = useCallback(() => {
    if (!isPreferencesValid(preferences)) return;
    writeStoredPreferences(preferences);
    navigate("/compare-plans");
  }, [preferences, navigate]);

  return { preferences, isValid, updateField, submit };
}
