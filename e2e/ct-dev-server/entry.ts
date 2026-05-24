import type { HooksConfig } from "../playwright/types";
import { beforeMountHook } from "../playwright/index";
import { unwrapObject } from "./serializers";

const rootElement = globalThis.document.getElementById("root");
if (!rootElement) throw new Error("Element with id 'root' not found");

/**
 * Displays an error message in the root element and logs it to the console.
 */
const showError = (error: unknown): unknown => {
  console.error("[CT Dev Server]", error);
  rootElement.textContent = String(error);
  return error;
};

// Read URL search parameters passed by the custom mount fixture.
const searchParams = new globalThis.URLSearchParams(
  globalThis.window.location.search,
);
const storyParam = searchParams.get("story");
const componentNameParam = searchParams.get("name");
const propsParam = searchParams.get("props");
const wrapperParam = searchParams.get("wrapper");

const storyFileName = storyParam;
const componentName = componentNameParam;
// Props are JSON-encoded; functions are replaced by serialized references (see serializers.ts).
const componentPropsRaw = propsParam
  ? (JSON.parse(propsParam) as object | undefined)
  : {};
const wrapperConfig = wrapperParam
  ? (JSON.parse(wrapperParam) as HooksConfig["wrapper"] | undefined)
  : {};

// The story is imported as a virtual path; the ct-story-resolver Vite plugin
// (defined in vite-config-ct-dev.ts) maps "/<basename>.story.*" to the actual file
// inside app/src/stories/.
const storyImportPath = `/${storyFileName}`;

await (async (): Promise<unknown> => {
  if (!storyFileName) return showError('Missing "story" query parameter');
  if (!componentName) return showError('Missing "name" query parameter');

  const [reactModule, reactDomClientModule, storyModule] =
    await Promise.allSettled([
      import("react"),
      import("react-dom/client"),
      // Dynamic import resolved by ct-story-resolver Vite plugin.
      import(/* @vite-ignore */ storyImportPath),
    ]);

  if (reactModule.status === "rejected") return showError(reactModule.reason);
  if (reactDomClientModule.status === "rejected")
    return showError(reactDomClientModule.reason);
  if (storyModule.status === "rejected") return showError(storyModule.reason);

  const React = reactModule.value;
  const { createRoot } = reactDomClientModule.value;

  // Reconstruct callback props from their serialized references so they can
  // dispatch back to the Playwright test process via __ctDevDispatchFunction.
  const componentProps = unwrapObject(componentPropsRaw, {
    log: (...args) => console.log("[CT Dev Server]", ...args),
    warn: (msg) => console.warn("[CT Dev Server]", msg),
  }) as object;

  const StoryComponent = (
    storyModule.value as Record<string, React.ComponentType<object>>
  )[componentName];
  if (!StoryComponent) {
    return showError(
      `Component '${componentName}' not found in story '${storyFileName}'`,
    );
  }

  // Render the component through the shared beforeMount hook so that providers
  // (context, theme, query client, …) are applied identically in dev and preview mode.
  const root = createRoot(rootElement);
  root.render(
    await beforeMountHook({
      App: () => React.createElement(StoryComponent, componentProps),
      hooksConfig: { storyFileName, wrapper: wrapperConfig },
    }),
  );
})();
