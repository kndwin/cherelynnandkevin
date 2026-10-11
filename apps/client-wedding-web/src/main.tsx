import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminPanel } from "@/module/admin/admin.panel.tsx";
import { CheckInPanel } from "@/module/check-in/check-in.panel.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

// Hidden admin surface. It is reachable only by navigating directly to
// /admin/guests, is absent from all public navigation, and renders on refresh
// because the static host falls back to index.html (single-page-application
// handling). Hidden is not authorization: every /admin/* API requires the
// HttpOnly admin session cookie.
const isAdminPath =
  typeof window !== "undefined" &&
  (window.location.pathname === "/admin/guests" || window.location.pathname.startsWith("/admin/guests/"));

createRoot(root).render(
  <StrictMode>{isAdminPath ? <AdminPanel /> : <CheckInPanel />}</StrictMode>,
);
