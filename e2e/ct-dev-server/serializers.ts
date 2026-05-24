/**
 * Serialization helpers for function props passed to the custom mount fixture.
 *
 * Inspired by the official Playwright CT serializer:
 * https://github.com/microsoft/playwright/blob/main/packages/playwright-ct-core/src/injected/serializers.ts
 *
 * ## Why serialization?
 *
 * When Playwright CT mounts a component, props are serialized from the Node.js
 * test process and sent to the browser. Plain values (strings, numbers, …) are
 * trivially JSON-serialized, but **functions cannot be serialized**.
 *
 * The solution:
 * 1. **On the Node.js side** (`ct-dev-mount.ts`): `wrapObject` replaces every
 *    function in the props object with a `FunctionRef` — a plain object carrying
 *    an ordinal index.  The actual functions are kept in a `boundCallbacks` array.
 *    A global `__ctDevDispatchFunction(ordinal, args)` is exposed on the page via
 *    `page.exposeFunction()`, forwarding calls back to the Node.js callbacks.
 * 2. **On the browser side** (this file): `unwrapObject` replaces every
 *    `FunctionRef` with an async function that invokes
 *    `window.__ctDevDispatchFunction(ordinal, args)` and returns the result.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Shape of the global dispatch function exposed by the custom mount fixture.
 */
export type GlobalThisCtDev = {
  /**
   * Dispatches a callback call back to the Playwright Node.js process.
   *
   * @param ordinal - Index of the callback in the `boundCallbacks` array.
   * @param args    - Arguments to forward to the callback.
   */
  __ctDevDispatchFunction: (ordinal: number, args: unknown[]) => unknown;
};

/**
 * A serialized reference to a function prop.
 */
type FunctionRef = {
  /** Discriminant tag used by `isFunctionRef`. */
  __pw_type: "function";
  /** Position of the function in the `boundCallbacks` array on the Node.js side. */
  ordinal: number;
  /** Original function name — kept for debugging purposes. */
  fnName?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFunctionRef(value: unknown): value is FunctionRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "__pw_type" in value &&
    value.__pw_type === "function"
  );
}

// ─── wrapObject (Node.js side) ────────────────────────────────────────────────

/**
 * Recursively replaces every function in `value` with a `FunctionRef` and
 * appends the original function to `boundCallbacks`.
 *
 * Call this in the Playwright test process before passing props to the browser.
 */
export function wrapObject(
  value: unknown,
  boundCallbacks: ((...args: unknown[]) => unknown)[],
  logger: { debug?: (msg: string) => void },
): unknown {
  if (typeof value === "function") {
    const ordinal = boundCallbacks.length;
    boundCallbacks.push(value as (...args: unknown[]) => unknown);
    logger.debug?.(
      `Serialized function '${(value as { name?: string }).name}' as ordinal ${ordinal}`,
    );
    return {
      __pw_type: "function",
      ordinal,
      fnName: (value as { name?: string }).name,
    } satisfies FunctionRef;
  }

  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date || value instanceof RegExp || value instanceof URL)
    return value;

  if (Array.isArray(value)) {
    return value.map((item) => wrapObject(item, boundCallbacks, logger));
  }

  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(value)) {
    result[key] = wrapObject(prop, boundCallbacks, logger);
  }
  return result;
}

// ─── unwrapObject (browser side) ─────────────────────────────────────────────

/**
 * Recursively replaces every `FunctionRef` in `value` with an async function
 * that calls `window.__ctDevDispatchFunction` to invoke the original callback
 * in the Playwright test process.
 *
 * Call this in the browser entry point (`entry.ts`) before rendering the component.
 */
export function unwrapObject(
  value: unknown,
  logger: {
    log: (message: string, ...args: unknown[]) => void;
    warn: (message: string) => void;
  },
): unknown {
  if (isFunctionRef(value)) {
    const dispatch = (globalThis as Partial<GlobalThisCtDev>)
      .__ctDevDispatchFunction;

    if (!dispatch) {
      logger.warn(
        `Global '__ctDevDispatchFunction' is not defined. ` +
          `Cannot deserialize function '${value.fnName}' (ordinal ${value.ordinal}). ` +
          `This can happen when the page is refreshed or opened directly without Playwright.`,
      );
    } else {
      logger.log(
        `Deserializing function '${value.fnName}' (ordinal ${value.ordinal})`,
      );
    }

    return async (...args: unknown[]) => {
      try {
        return await dispatch?.(value.ordinal, args);
      } catch (error) {
        logger.warn(
          `Error dispatching function '${value.fnName}': ${String(error)}`,
        );
        throw error;
      }
    };
  }

  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date || value instanceof RegExp || value instanceof URL)
    return value;

  if (Array.isArray(value)) {
    return value.map((item) => unwrapObject(item, logger));
  }

  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(value)) {
    result[key] = unwrapObject(prop, logger);
  }
  return result;
}
