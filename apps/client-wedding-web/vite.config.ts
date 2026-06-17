import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const apiTarget = env.VITE_API_PROXY_TARGET ?? "https://api.cherelynnandkevin.localhost";
  const port = process.env.PORT ? Number(process.env.PORT) : undefined;

  return {
    envDir: "../..",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
    server: {
      allowedHosts: ["wedding.cherelynnandkevin.localhost"],
      host: "0.0.0.0",
      port,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          secure: false,
        },
      },
    },
  };
});
