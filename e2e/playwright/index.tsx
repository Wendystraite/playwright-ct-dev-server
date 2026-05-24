import { beforeMount } from "@playwright/experimental-ct-react/hooks";

import type { HooksConfig } from "./types";

/**
 * Shared beforeMount hook used in both modes:
 * - Preview mode: registered directly with Playwright CT via `beforeMount()`.
 * - Dev mode: called explicitly from `ct-dev-server/entry.ts`.
 *
 * Add your providers here (React Query client, theme, context, ...).
 * The `hooksConfig` parameter lets tests opt into specific wrappers via `hooksConfig.wrapper`.
 *
 * @example Adding a provider
 * ```tsx
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *
 * export async function beforeMountHook({ App, hooksConfig }) {
 *   const queryClient = new QueryClient();
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <App />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export async function beforeMountHook({
  App,
}: Parameters<Parameters<typeof beforeMount<HooksConfig>>[0]>[0]) {
  // Replace this with your own providers as needed.
  return <App />;
}

// Register the hook with Playwright CT (preview mode only).
// In dev mode, entry.ts calls beforeMountHook directly.
beforeMount<HooksConfig>(beforeMountHook);
