import { StrictMode } from "react";
import { Toaster } from "sonner";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routes/route-tree.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(root).render(
  <StrictMode><RouterProvider router={router} /><Toaster richColors closeButton /></StrictMode>,
);
