import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FilterContextProvider } from "./contexts/FilterContext";
import { AIContextProvider } from "./contexts/AIContext";  // ✅ import AI provider

const container = document.getElementById("root")!;
createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <FilterContextProvider>
        <AIContextProvider>   {/* ✅ wrap inside here */}
          <App />
        </AIContextProvider>
      </FilterContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
