import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimulateUsage } from "./app/pages/SimulateUsage";
import { InputScreen } from "./app/pages/InputScreen";
import { CostResultsPage } from "./app/pages/CostResultsPage";
import { ComparePlans } from "./app/pages/ComparePlans";
import { AiAssistant } from "./app/pages/AiAssistant";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InputScreen />} />
        <Route path="/cost-results" element={<CostResultsPage />} />
        <Route path="/compare-plans" element={<ComparePlans />} />
        <Route path="/ai-assistant" element={<AiAssistant />} />
        <Route path="/simulate-usage" element={<SimulateUsage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
