import path from "node:path";

import {
  test as testBaseCt,
  type ComponentFixtures,
} from "@playwright/experimental-ct-react";
import { test as testBaseNormal, mergeTests } from "@playwright/test";

import type { GlobalThisCtDev } from "../ct-dev-server/serializers";
import { wrapObject } from "../ct-dev-server/serializers";
import type { HooksConfig } from "../playwright/types";

/** Wait time for remote debugging to attach, in milliseconds. */
const REMOTE_DEBUGGING_WAIT_TIME_MS = parseInt(
  process.env["PW_REMOTE_DEBUGGING_WAIT_TIME_MS"] ?? "1500",
  10,
);

/**
 * The URL of the CT dev server, read from project metadata.
 */
function getCtDevServerBaseURL(
  metadata: Record<string, unknown>,
): string | undefined {
  return typeof metadata["ctDevServerBaseURL"] === "string"
    ? metadata["ctDevServerBaseURL"]
    : undefined;
}

// ---- Step 1: override `page` BEFORE Playwright CT wraps it -----------------
//
// Playwright CT patches the `page` fixture to navigate to its built-in server
// and set PLAYWRIGHT_TEST_BASE_URL. In dev mode we want to intercept that
// navigation and replace it with a no-op so the page stays blank until our
// custom mount fixture takes over.

const fixtureBeforeCt = testBaseNormal.extend({
  page: [
    async ({ page }, use, testInfo) => {
      const ctDevServerBaseURL = getCtDevServerBaseURL(
        testInfo.project.metadata,
      );

      if (ctDevServerBaseURL) {
        // Point Playwright CT to a blank URL so it does not start its own server.
        process.env["PLAYWRIGHT_TEST_BASE_URL"] = "about:blank";
      }

      await use(page);
    },
    { scope: "test", box: true },
  ],
});

// ---- Step 2: override `mount` AFTER Playwright CT wraps it -----------------
//
// In dev mode, replace `mount` with a custom implementation that:
// 1. Exposes `__ctDevDispatchFunction` on the page so that function props can
//    call back into the test process.
// 2. Serializes the component props (replacing functions with ordinal refs).
// 3. Navigates to the CT dev server URL with the story info as query params.
// 4. Returns a locator pointing to `[data-testid="story-component"]`.

const fixtureAfterCt = testBaseCt.extend<{ mount: ComponentFixtures["mount"] }>(
  {
    mount: [
      async ({ page, mount }, use, testInfo) => {
        const ctDevServerBaseURL = getCtDevServerBaseURL(
          testInfo.project.metadata,
        );

        await use(async (component, options) => {
          // Fallback to Playwright CT's default mount in preview mode.
          if (!ctDevServerBaseURL) {
            return mount(component, options);
          }

          // Bound callbacks for this specific mount call.
          // Each function prop is stored here and referenced by ordinal.
          const boundCallbacks: ((...args: unknown[]) => unknown)[] = [];

          // Expose the dispatch bridge so the browser can call back into Node.js.
          const dispatchFn: GlobalThisCtDev["__ctDevDispatchFunction"] = (
            ordinal,
            args,
          ) => {
            const cb = boundCallbacks[ordinal];
            if (!cb)
              throw new Error(`Callback with ordinal ${ordinal} not found`);
            return cb(...args);
          };
          await page.exposeFunction("__ctDevDispatchFunction", dispatchFn);

          const hooksConfig = (options?.hooksConfig ?? {}) as HooksConfig;
          const { storyFileName } = hooksConfig;

          if (!storyFileName) {
            throw new Error(
              "hooksConfig.storyFileName is required when using the CT dev server. " +
                "Pass the story file name to the mount call:\n" +
                '  mount<HooksConfig>(<MyStory />, { hooksConfig: { storyFileName: "./MyComponent.story.tsx" } })',
            );
          }

          // Only the basename is needed; the ct-story-resolver Vite plugin resolves it
          // to the actual path inside app/src/stories/.
          const storyBasename = path.basename(storyFileName);

          // Extract the component name from its internal Playwright ID (format: "module_ComponentName").
          const componentName = (component.type as { id?: string }).id
            ?.split("_")
            .pop();
          if (!componentName) {
            throw new Error(
              "The component must have a name to be mounted in a story.",
            );
          }

          const componentProps = component.props as object;

          // Serialize props: replace function values with FunctionRef objects.
          const wrappedProps = wrapObject(componentProps, boundCallbacks, {
            debug: (msg) => console.debug("[ct-dev-mount]", msg),
          });

          // Build the URL pointing to the CT dev server with story info as query params.
          const searchParams = new URLSearchParams();
          searchParams.set("name", componentName);
          searchParams.set("story", storyBasename);
          if (Object.keys(componentProps).length > 0) {
            searchParams.set("props", JSON.stringify(wrappedProps));
          }
          if (hooksConfig.wrapper) {
            searchParams.set("wrapper", JSON.stringify(hooksConfig.wrapper));
          }

          // Pause before navigation so VS Code can attach and register breakpoints
          // before the story renders, including the component's initial render.
          if (process.env["PW_REMOTE_DEBUGGING_PORT"]) {
            console.log(
              `Playwright launched with remote debugging on port ${process.env["PW_REMOTE_DEBUGGING_PORT"]}. ` +
                `You can attach a debugger to the browser to set breakpoints in the story's code.`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, REMOTE_DEBUGGING_WAIT_TIME_MS),
            );
          }

          await page.goto(`${ctDevServerBaseURL}/?${searchParams.toString()}`);

          // Wait for the story component to appear in the DOM.
          const storyLocator = page.getByTestId("story-component");
          await storyLocator.waitFor({ state: "visible", timeout: 15_000 });

          // Return a locator with stubs for the unmount/update methods required by
          // the ComponentFixtures type.  These are not implemented in dev mode.
          return Object.assign(storyLocator, {
            unmount: (): never => {
              throw new Error(
                "unmount() is not supported in CT dev server mode.",
              );
            },
            update: (): never => {
              throw new Error(
                "update() is not supported in CT dev server mode.",
              );
            },
          });
        });
      },
      { scope: "test", box: true },
    ],
  },
);

/**
 * Merged fixture that patches both `page` (before CT) and `mount` (after CT).
 */
export const ctDevMountFixture = mergeTests(fixtureBeforeCt, fixtureAfterCt);
