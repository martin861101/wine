import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      port: Number(env.PORT || 4010),
      strictPort: true,
      allowedHosts: ["test.hookitupservices.com"],
    },
    plugins: [tsConfigPaths(), tanstackStart({ server: { entry: "server" } }), viteReact()],
  };
});
