import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/experimental-ct-react";

import { baseConfig } from "../base/playwright.config.base";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Preview configuration that runs component tests using Playwright CT's built-in Vite bundler.
 */
const config = defineConfig({
  ...baseConfig,

  use: {
    ...baseConfig.use,

    /**
     * Playwright CT configuration
     */

    ctPort: 3100,
    ctTemplateDir: "../../playwright",
    ctViteConfig: {
      configFile: path.join(
        dirname,
        "../../ct-preview-server/vite-config-ct-preview.ts",
      ),
    },
  },
});

export default config;
