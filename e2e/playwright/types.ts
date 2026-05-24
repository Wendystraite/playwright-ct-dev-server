/**
 * Hooks configuration passed from tests to the `beforeMount` hook.
 *
 * Extend this type to add your own options.
 *
 * @example Using hooksConfig in a test
 * ```tsx
 * import type { HooksConfig } from '../playwright/types';
 *
 * test('my test', async ({ mount }) => {
 *   await mount<HooksConfig>(<MyComponent />, {
 *     hooksConfig: {
 *       storyFileName: './MyComponent.story.tsx',
 *       wrapper: { myFeatureFlag: true },
 *     },
 *   });
 * });
 * ```
 */
export type HooksConfig = {
  /**
   * Path (or basename) of the story file that contains the component being mounted.
   * **Required in dev mode** so that the CT dev server can resolve the story with the `ct-story-resolver` Vite plugin.
   */
  storyFileName?: string;

  /**
   * Optional wrapper configuration forwarded to `beforeMountHook`.
   * Extend this object with flags for conditional providers.
   */
  wrapper?: Record<string, unknown>;
};
