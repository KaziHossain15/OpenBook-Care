// GRASP: Pure View
// This component has one job: render. It receives everything it needs through
// the controller hook and delegates every event back to it. There is no
// business logic, no validation, no sessionStorage, no navigate calls here.

import React from "react";
import { WelcomeHero } from "../components/WelcomeHero";
import { PreferencesForm } from "../components/PreferencesForm";
import { useInputScreenController } from "../controllers/useInputScreenController";

export function InputScreen() {
  const controller = useInputScreenController();

  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomeHero />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl mb-2">Step 1: Tell Us About Yourself</h2>
          <p className="text-gray-600">
            Help us find the perfect health insurance plan for you
          </p>
        </div>
        <PreferencesForm
          preferences={controller.preferences}
          isValid={controller.isValid}
          onFieldChange={controller.updateField}
          onSubmit={controller.submit}
        />
      </div>
    </div>
  );
}