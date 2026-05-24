import path from "node:path";

import {
  devices,
  type PlaywrightTestConfig,
} from "@playwright/experimental-ct-react";

import { e2eRoot, repositoryRoot } from "../../utils/paths";

/**
 * Shared Playwright configuration used by both dev and preview environments.
 */
export const baseConfig = {
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  workers: "50%",

  outputDir: path.join(repositoryRoot, "test-results"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(repositoryRoot, "playwright-report") }],
  ],

  use: {
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: "components",
      testDir: path.join(e2eRoot, "tests"),
      testMatch: "**/*.spec.{ts,tsx}",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
} satisfies PlaywrightTestConfig;
