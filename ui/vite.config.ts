import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    server: {
      port: 5235,
      strictPort: false,
      allowedHosts: [
        "wineandchapters.co.za",
        "www.wineandchapters.co.za",
        "test.hookitupservices.com",
        "192.168.1.160",
        "0.0.0.0",
      ],
    },
    build: {
      rollupOptions: {
        input: {
          main: "index.html",
          fallback: "fallback.html",
        },
      },
    },
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      tsConfigPaths(),
      tailwindcss(),
      viteReact(),
    ],
  };
});
