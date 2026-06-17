import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CheckInPanel } from "@/module/check-in/check-in.panel.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <CheckInPanel />
  </StrictMode>,
);
