import path from "node:path";

import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { appRoot, e2eRoot, repositoryRoot } from "../utils/paths";

/**
 * Vite configuration used by Playwright CT in preview mode.
 */
export default mergeConfig(
  // Base: reuse the app's React plugin and settings.
  defineConfig({ plugins: [react()], root: appRoot }),

  // Overrides for the Playwright CT built-in server.
  defineConfig({
    // Root is the playwright/ directory which contains index.html.
    root: path.join(e2eRoot, "playwright"),
    publicDir: path.join(appRoot, "public"),

    // HTTPS must be disabled: Playwright CT always navigates over plain HTTP,
    // and an HTTPS server would cause ERR_EMPTY_RESPONSE.
    server: { port: 3100, strictPort: true, https: false as never },

    // Separate cache to avoid conflicts with the main Vite server.
    cacheDir: path.resolve(repositoryRoot, "node_modules/.vite-ct-preview"),

    // Disable minification and enable source maps for easier debugging.
    build: { minify: false, sourcemap: true },
  }),
);
