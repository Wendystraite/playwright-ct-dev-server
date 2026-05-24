import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { appRoot, e2eRoot, repositoryRoot } from "../utils/paths";

/**
 * Vite configuration used by Playwright CT in dev mode.
 */
export default mergeConfig(
  // Base: reuse the app's React plugin and settings.
  defineConfig({ plugins: [react()], root: appRoot }),

  // Overrides for the Playwright CT built-in server.
  defineConfig({
    // Root is the e2e directory which contains the tests and the custom index.html.
    root: e2eRoot,
    publicDir: path.join(appRoot, "public"),

    // Port for the CT dev server.
    server: { port: 3200, strictPort: true },

    plugins: [
      {
        // Resolves story imports by their basename against `app/src/stories/`.
        // This allows entry.ts to use dynamic imports like `import('/counter.story.tsx')`
        // without knowing the full absolute path at build time.
        name: "ct-story-resolver",
        enforce: "pre" as const,
        resolveId(id: string) {
          if (/\.story\.[jt]sx?$/.test(id)) {
            const basename = path.basename(id);
            const storyPath = path.join(appRoot, "src", "stories", basename);
            if (existsSync(storyPath)) return storyPath;
          }
        },
      },
    ],

    // Separate cache to avoid conflicts with the main Vite server.
    cacheDir: path.resolve(repositoryRoot, "node_modules/.vite-ct-dev"),

    // Disable minification and enable source maps for easier debugging.
    build: { minify: false, sourcemap: true },
  }),
);
