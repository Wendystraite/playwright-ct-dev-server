import { Counter } from "../counter";

/**
 * Default counter with no initial value.
 *
 * Link : http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterStory
 *
 * Usage in tests:
 * ```tsx
 * await mount(
 *   <CounterStory />,
 *   { hooksConfig: { storyFileName: './counter.story.tsx' } }
 * );
 * ```
 */
export function CounterStory() {
  return <Counter />;
}

/**
 * Counter pre-set to a specific initial value.
 *
 * Link : http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterWithInitialValueStory&props={"initialCount":5}
 *
 * Usage in tests:
 * ```tsx
 * await mount(
 *   <CounterWithInitialValueStory initialCount={5} />,
 *   { hooksConfig: { storyFileName: './counter.story.tsx' } }
 * );
 * ```
 */
export function CounterWithInitialValueStory({
  initialCount,
}: {
  initialCount: number;
}) {
  return <Counter initialCount={initialCount} label="Counter" />;
}

/**
 * Counter that fires a callback on each change.
 * Useful for testing that the parent receives the updated count.
 *
 * Link : http://localhost:3200/ct-dev-server/?story=counter.story.tsx&name=CounterWithCallbackStory
 *
 * Usage in tests:
 * ```tsx
 * const calls: number[] = [];
 * await mount(
 *   <CounterWithCallbackStory onCountChange={(n) => calls.push(n)} />,
 *   { hooksConfig: { storyFileName: './counter.story.tsx' } }
 * );
 * ```
 */
export function CounterWithCallbackStory({
  onCountChange,
}: {
  onCountChange: (count: number) => void;
}) {
  return (
    <Counter onCountChange={onCountChange} label="Counter with callback" />
  );
}
