# Playwright CT Dev Server

A minimal, production-inspired example of a **Playwright Component Testing** setup that supports two run modes:

| Mode        | Command             | When to use                                                                       |
| ----------- | ------------------- | --------------------------------------------------------------------------------- |
| **Dev**     | `pnpm test:dev`     | Local development using Vite's native ESM dev server                              |
| **Preview** | `pnpm test:preview` | CI or full validation using Playwright's built-in Vite bundler (production build) |

> **Context** — This repository was created in response to [microsoft/playwright#14748](https://github.com/microsoft/playwright/issues/14748), which requests a Vite dev server mode for component tests. Playwright's team deliberately uses a production build to keep CI tests fast, but the cold-start cost of that build can be painful during local development on large projects. This setup offers both options without duplicating test code.

## Table of contents

- [Key difference from standard Playwright CT](#key-difference-from-standard-playwright-ct)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [CLI usage](#cli-usage)
- [Browser usage](#browser-usage)
- [VS Code usage](#vs-code-usage)
- [Debugging](#debugging)
- [How it works](#how-it-works)
- [Adding components](#adding-components)
- [Extending providers](#extending-providers)

## Key difference from standard Playwright CT

**Two differences from standard Playwright CT:**

1. **Story pattern required.**

Components must be wrapped in a thin story component exported from a dedicated story file (e.g. `counter.story.tsx`).
Tests mount the story, not the component directly.
See the [Story pattern](#story-pattern) section.

2. **`hooksConfig.storyFileName` required in dev mode.**

Every `mount()` call must pass the story's file name through `hooksConfig`:

```tsx
await mount(<CounterStory />, {
  hooksConfig: { storyFileName: "./counter.story.tsx" },
});
```

See [`hooksConfig.storyFileName`](#hooksconfigstoryfilename) for the full explanation.

## Architecture

```
playwright-ct-dev-server/
├── app/                           # Example Vite + React + TypeScript app
│   ├── src/
│   │   ├── counter.tsx            # Example component
│   │   └── stories/
│   │       └── counter.story.tsx  # Story file — thin wrappers around the component
│   └── vite.config.ts
│
└── e2e/                              # Playwright component tests
    ├── ct-dev-server/                # Dev server integration
    │   ├── index.html                # Entry point served by the Vite dev server
    │   ├── entry.ts                  # Dynamically imports the story and renders it
    │   ├── serializers.ts            # Serialize/deserialize function props across the Node↔Browser boundary
    │   └── vite-config-ct-dev.ts     # Vite config for the CT dev server (port 3200)
    │
    ├── ct-preview-server/            # Preview server integration
    │   └── vite-config-ct-preview.ts # Vite config used by Playwright CT's built-in bundler (port 3100)
    │
    ├── playwright/                   # Playwright CT template (shared by both modes)
    │   ├── index.html                # Standard Playwright CT HTML template
    │   ├── index.tsx                 # beforeMount hook — add providers here
    │   └── types.ts                  # HooksConfig type
    │
    ├── configs/
    │   ├── base/playwright.config.base.ts  # Shared Playwright config (CT settings, reporters, timeouts)
    │   ├── dev/playwright.config.ts        # Dev config — disables CT bundler, starts CT dev server
    │   └── preview/playwright.config.ts    # Preview config — enables CT bundler
    │
    ├── fixtures/
    │   └── ct-dev-mount.ts           # Custom mount fixture — the glue between modes
    ├── utils/
    │   └── paths.ts                  # Absolute path helpers (repositoryRoot, e2eRoot, appRoot)
    └── tests/
        ├── test-component.ts         # Re-exports the test object with fixtures merged
        └── components/
            └── counter.spec.tsx      # Example component test
```

### Ports

| Service                                      | Port | Config                                            |
| -------------------------------------------- | ---- | ------------------------------------------------- |
| App dev server (`pnpm app:dev`)              | 5173 | `app/vite.config.ts`                              |
| App preview server (`pnpm app:preview`)      | 4173 | `app/vite.config.ts`                              |
| CT dev server (`pnpm ct:dev-server`)         | 3200 | `e2e/ct-dev-server/vite-config-ct-dev.ts`         |
| Playwright CT built-in server (preview mode) | 3100 | `e2e/ct-preview-server/vite-config-ct-preview.ts` |

## Getting started

**Prerequisites:** [Node.js ≥ 20](https://nodejs.org) and [pnpm ≥ 9](https://pnpm.io/installation).

```sh
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm -F e2e playwright:install
```

## CLI usage

### Dev mode

```sh
pnpm test:dev
```

Playwright automatically starts the CT dev server before the first test run.

Changes to the app or stories are picked up immediately, no rebuild required.

> **Tip:** Pre-start the server manually to avoid the startup delay on the very first run:
>
> ```sh
> # Terminal 1
> pnpm ct:dev-server
>
> # Terminal 2
> pnpm test:dev
> ```

### Preview mode

```sh
pnpm test:preview
```

Playwright starts its own Vite server automatically, builds the app, runs all tests, then shuts it down.

### Run a specific test file

```sh
# Dev mode
pnpm test:dev -- tests/components/counter.spec.tsx

# Preview mode
pnpm test:preview -- tests/components/counter.spec.tsx
```

### Open the HTML report

```sh
pnpm report
```

## Browser usage

### Open a story directly in the browser

While the CT dev server is running (`pnpm ct:dev-server`), any story can be opened directly in a browser without writing a test. The URL format is:

```
http://localhost:3200/ct-dev-server/?story=<StoryFile>&name=<ExportedName>
```

| Parameter | Description                                                      | Example              |
| --------- | ---------------------------------------------------------------- | -------------------- |
| `story`   | Basename of the story file (resolved by the `ct-story-resolver`) | `counter.story.tsx`  |
| `name`    | Exact name of the exported function in that file                 | `CounterStory`       |
| `props`   | _(optional)_ JSON-encoded props to pass to the story             | `{"initialCount":5}` |

**Examples:**

```
# Default counter
http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterStory

# Counter pre-set to 5
http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterWithInitialValueStory&props={"initialCount":5}
```

This is useful for rapid visual iteration: edit the component or story, save, and the browser hot-reloads instantly — no test run required.

## VS Code usage

### Recommended extensions

Install the [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension by Microsoft.

### Running tests from VS Code

The Playwright extension auto-discovers `playwright.config.ts` files in the workspace. Both configs appear in the **Testing** panel:

1. Open the **Testing** panel (`Ctrl+Shift+P` → "Testing: Focus on Playwright View").
2. Unfold the "Playwright" section.
3. In the "Configs" section, two test suites are listed:
   - `e2e/configs/dev/playwright.config.ts`
   - `e2e/configs/preview/playwright.config.ts`
4. Select the desired config using the "Toggle Playwright Configs" cog icon.

## Debugging

### Debugging the test code

1. Set a breakpoint in your test file (`.spec.tsx`).
2. Click the **Debug** icon next to the test in the Testing panel.
3. The browser opens in headed mode; execution pauses at the breakpoint.

### Debugging the app code

#### Option 1 — Browser DevTools

The CT dev server serves original TypeScript source files with inline source maps, so Chrome DevTools can display and debug them directly.

1. Start the CT dev server: `pnpm ct:dev-server`
2. Open any story in Chrome:
   ```
   http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterStory
   ```
3. Open DevTools (`F12`) in **Sources** panel.
4. Find the app files under the `/@fs/` virtual path (e.g. `/@fs/C:/…/app/src/counter.tsx`).
5. Click a line number to set a breakpoint, then interact with the component.

#### Option 2 — VS Code breakpoints

This mode lets you set breakpoints directly in VS Code and step through the app source code without touching DevTools.

**Steps:**

1. Start the CT dev server: `pnpm ct:dev-server`
2. Open any app source file (e.g. `app/src/counter.tsx`) and click the gutter to add a breakpoint.
3. Open the **Run and Debug** panel (`Ctrl+Shift+D`).
4. Select **Debug CT Dev Server (Chrome)** and press `F5`.
5. Chrome opens a story URL, navigate to the story you want to debug.
6. VS Code pauses at the breakpoint when the code is hit.

### Debugging the app code executed during a test

This is the most powerful option: VS Code breakpoints in app source files that fire while a Playwright test is running in **dev mode**.

> **Preview mode not supported.** Playwright CT's preview server does a Vite production build and serves the output as static bundles.
> The `.map` files produced by the build are not served by that static server, so Chrome cannot load the source maps and VS Code breakpoints remain unbound.
> Use dev mode for this workflow.

**How it works:**

1. `PW_REMOTE_DEBUGGING_PORT=9222` launches Chromium with `--remote-debugging-port=9222`, exposing a CDP endpoint that VS Code can attach to.
2. Before navigating to the story, the `mount` fixture automatically pauses for 1.5 s. VS Code attaches to the CDP endpoint during this window and registers all breakpoints.
3. The fixture then navigates Playwright's Chromium to `http://localhost:3200/ct-dev-server/?story=…` where the app code runs as native Vite ESM modules with full source maps.

**Steps from CLI:**

1. Start the CT dev server: `pnpm ct:dev-server`
2. Set a breakpoint in an app source file (e.g. `app/src/counter.tsx`).
3. Open the **Run and Debug** panel (`Ctrl+Shift+D`) and start **Attach to Playwright browser** — it will retry connecting until Chromium is ready (up to 60 s, as configured in `.vscode/launch.json`).
4. Run the tests with the env var and a single worker:
   ```sh
   PW_REMOTE_DEBUGGING_PORT=9222 pnpm test:dev --workers=1
   ```
   On PowerShell:
   ```powershell
   $env:PW_REMOTE_DEBUGGING_PORT="9222"; pnpm test:dev -- --workers=1
   ```
   Example of running a specific test within a test file:
   ```sh
   PW_REMOTE_DEBUGGING_PORT=9222 pnpm test:dev --workers=1 "tests/components/counter.spec.tsx" -g "increments the count on click"
   ```
5. VS Code pauses at the breakpoint when the test triggers the code path.

**Steps from the VS Code Testing panel:**

Uncomment the entry in `.vscode/settings.json`:

```jsonc
"playwright.env": {
  "PW_REMOTE_DEBUGGING_PORT": "9222"
}
```

1. Start the CT dev server: `pnpm ct:dev-server`
2. Set a breakpoint in an app source file (e.g. `app/src/counter.tsx`).
3. Check **Show browser** option in the Playwright sidebar.
4. Open the **Run and Debug** panel (`Ctrl+Shift+D`) and start **Attach to Playwright browser**.
5. Run the test.

## How it works

### The problem

Playwright CT's default flow for every test run:

1. Full Vite production build of the app
2. Start a static server on the built output
3. Run the tests

This is great for CI: build once, run many tests fast. But locally, re-building after every single-line change kills the feedback loop.

### The solution

```
                    Dev mode                      Preview mode
                    ─────────────────────         ──────────────────────────
Test process   →    ct-dev-mount.ts               mount() from @pw/ct-react
                    ↓                             ↓
Browser        →    CT dev server (port 3200)     PW CT bundled server (3100)
                    ↓                             ↓
Vite           →    Native ESM dev mode           Production build
```

**Dev mode** replaces Playwright CT's built-in `mount` fixture with a custom one:

1. **Disables the bundler**: `ctPort`, `ctTemplateDir`, `ctViteConfig` are set to `undefined` in the dev config.
2. **Fakes the base URL**: Before Playwright CT can navigate to its own server, the fixture sets `PLAYWRIGHT_TEST_BASE_URL` to a fake URL and intercepts requests to it, returning an empty HTML page. This keeps Playwright CT happy without actually loading anything.
3. **Navigates to the CT dev server**: The custom `mount` call encodes the story file name, component name, and props as URL query parameters and navigates to `http://localhost:3200/ct-dev-server/?...`.
4. **Deserializes function props**: Function-typed props cannot be JSON-serialized. `serializers.ts` replaces them with ordinal references (`{ __pw_type: "function", ordinal: 0 }`). A bridge function (`__ctDevDispatchFunction`) is exposed on the page via `page.exposeFunction()`, forwarding browser calls back to the Node.js callbacks in the test.
5. **Renders the story**: `entry.ts` running in the browser reads the query params, dynamically imports the story module (via the `ct-story-resolver` Vite plugin), and calls the shared `beforeMountHook` to render the component with the same providers as preview mode.

Both modes share:

- `playwright/index.tsx` : the `beforeMount` hook and its providers
- `playwright/types.ts` : the `HooksConfig` type
- The test files themselves : no changes needed to run in either mode except passing the `storyFileName` in dev mode (see below).

### Story pattern

Stories are thin wrapper components that live next to the app code:

```tsx
// app/src/stories/counter.story.tsx
export function CounterWithCallbackStory({ onCountChange }) {
  return <Counter onCountChange={onCountChange} />;
}
```

Tests import the story components directly and mount them:

```tsx
// e2e/tests/components/counter.spec.tsx
await mount<HooksConfig>(<CounterWithCallbackStory onCountChange={fn} />, {
  hooksConfig: { storyFileName: "./counter.story.tsx" },
});
```

The `storyFileName` is the only extra piece of information needed in dev mode, it tells the CT dev server which story file to import.

### `hooksConfig.storyFileName`

| Mode        | `storyFileName` | Why                                                                                                                                                                                                                                                      |
| ----------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev**     | **Required**    | The dev server receives only a URL with query parameters. It has no static analysis context and must dynamically `import()` the right story file at runtime, the only way to identify it is via this parameter. Omitting it throws an error immediately. |
| **Preview** | Ignored         | Playwright CT's bundler statically analyses all `import` statements in the test files at build time. It already knows every component to include in the bundle. The parameter is passed through `hooksConfig` but never read.                            |

Because both modes run the **same test files**, the pattern is to always pass `storyFileName`.

> **Tip:** Use `test.extend` to inject `storyFileName` once per test file instead of repeating it in every `mount` call.
> See the [Adding components](#adding-components) section for the pattern.

## Adding components

1. Create the component in `app/src/`.
2. Create a story file in `app/src/stories/` exporting one or more story components.
3. Create a test file in `e2e/tests/components/` using `test-component.ts`.

```tsx
// app/src/stories/my-component.story.tsx
import { MyComponent } from "../my-component";

export function MyComponentStory() {
  return <MyComponent />;
}
```

```tsx
// e2e/tests/components/my-component.spec.tsx
import { MyComponentStory } from "../../app/src/stories/my-component.story";
import type { HooksConfig } from "../../playwright/types";
import { test, expect } from "../test-component";

// Extend the base test with a custom mount that injects the storyFileName into hooksConfig:

const testWithStory = test.extend({
  mount: async ({ mount }, use) => {
    await use((component, options) =>
      mount<HooksConfig>(component, {
        ...options,
        hooksConfig: {
          ...options?.hooksConfig,
          storyFileName: "./my-component.story.tsx",
        },
      }),
    );
  },
});

testWithStory("renders correctly", async ({ page, mount }) => {
  await mount(<MyComponentStory />);
  await expect(page.getByRole("…")).toBeVisible();
});

// Or pass hooksConfig directly in the test body:

testWithStory("renders correctly", async ({ page, mount }) => {
  await mount(<MyComponentStory />, {
    hooksConfig: { storyFileName: "./my-component.story.tsx" },
  });
  await expect(page.getByRole("…")).toBeVisible();
});
```

## Extending providers

Add providers (React Query, theme, internationalization, …) to `e2e/playwright/index.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeMount } from "@playwright/experimental-ct-react/hooks";
import type { HooksConfig } from "./types";

export async function beforeMountHook({ App, hooksConfig }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

beforeMount<HooksConfig>(beforeMountHook);
```

The hook is called in both dev and preview mode, so providers only need to be defined once.
