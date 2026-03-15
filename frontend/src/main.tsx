import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { InputScreen } from "./app/pages/InputScreen";
import { CostResultsPage } from "./app/pages/CostResultsPage";
import { ComparePlans } from "./app/pages/ComparePlans";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InputScreen />} />
        <Route path="/cost-results" element={<CostResultsPage />} />
        <Route path="/compare-plans" element={<ComparePlans />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
