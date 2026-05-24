import { defineConfig } from "@playwright/experimental-ct-react";

import { baseConfig } from "../base/playwright.config.base";

/**
 * Dev configuration that runs component tests against the CT dev server.
 */
const config = defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,

    /**
     * Override CT configuration to prevent Playwright CT from building and serving the components.
     */

    ctPort: undefined,
    ctTemplateDir: undefined,
    ctViteConfig: undefined,

    /**
     * Custom launch options for remote debugging.
     */

    ...(process.env["PW_REMOTE_DEBUGGING_PORT"]
      ? {
          headless: false,
          launchOptions: {
            args: [
              `--remote-debugging-port=${process.env["PW_REMOTE_DEBUGGING_PORT"]}`,
            ],
          },
        }
      : {}),
  },

  /**
   * Base URL of the CT dev server started by `pnpm ct:dev-server`.
   */
  metadata: { ctDevServerBaseURL: "http://localhost:3200/ct-dev-server" },

  /**
   * Start the CT dev server before running the tests if it's not already running.
   */
  webServer: [
    {
      command: "pnpm -F e2e ct:dev-server",
      url: "http://localhost:3200/ct-dev-server/index.html",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});

export default config;
