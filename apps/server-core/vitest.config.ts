import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: new URL("./src", import.meta.url).pathname }],
  },
});
