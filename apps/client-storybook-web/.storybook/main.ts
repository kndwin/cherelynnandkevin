import type { StorybookConfig } from "@storybook/react-vite";

const weddingSrc = new URL("../../client-wedding-web/src", import.meta.url).pathname;

const config: StorybookConfig = {
  stories: [
    "../../client-wedding-web/src/**/*.stories.tsx",
    "../src/**/*.stories.tsx",
  ],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow ??= [];

    const allowed = Array.isArray(config.server.fs.allow)
      ? config.server.fs.allow
      : [config.server.fs.allow];

    config.server.fs.allow = [...allowed, "../.."];

    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": weddingSrc,
    };

    return config;
  },
};

export default config;
