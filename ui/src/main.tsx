import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { supabase } from "./lib/supabase";
import "./styles.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

async function shouldUseFallback(): Promise<boolean> {
  const appRoutes = ["/admin", "/login", "/verify-email", "/reset-password"];
  if (appRoutes.some((route) => window.location.pathname.startsWith(route))) return false;

  const { data, error } = await supabase
    .from("payment_method_settings")
    .select("fallback_enabled")
    .eq("singleton", true)
    .maybeSingle();
  if (error) {
    console.error("Fallback mode could not be checked.", { errorType: error.name });
    return false;
  }
  return data?.fallback_enabled === true;
}

async function start() {
  if (await shouldUseFallback()) {
    window.location.replace("/fallback.html");
    return;
  }
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root application element.");
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void start();
