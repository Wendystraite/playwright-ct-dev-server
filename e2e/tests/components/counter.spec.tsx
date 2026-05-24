import type { Page } from "@playwright/test";

import {
  CounterStory,
  CounterWithCallbackStory,
  CounterWithInitialValueStory,
} from "../../../app/src/stories/counter.story";

import type { HooksConfig } from "../../playwright/types";
import { test as base, expect } from "../test-component";

// ---- Page Object -----------------------------------------------------------

class CounterComponent {
  constructor(private readonly page: Page) {}
  get label() {
    return this.page.getByRole("paragraph");
  }
  get incrementButton() {
    return this.page.getByRole("button", { name: "Increment" });
  }
  get decrementButton() {
    return this.page.getByRole("button", { name: "Decrement" });
  }
}

// ---- Test setup ------------------------------------------------------------

/**
 * Extend the base test to automatically pass the story file name so that the
 * CT dev server can resolve it. Tests in this file do not have to repeat the
 * `hooksConfig` boilerplate.
 */
const test = base.extend({
  mount: async ({ mount }, use) => {
    await use((component, options) =>
      mount<HooksConfig>(component, {
        ...options,
        hooksConfig: {
          ...options?.hooksConfig,
          storyFileName: "./counter.story.tsx",
        },
      }),
    );
  },
});

// ---- Tests -----------------------------------------------------------------

test.describe("Counter", () => {
  test("renders the default value of 0", async ({ page, mount }) => {
    await mount(<CounterStory />);

    const counter = new CounterComponent(page);
    await expect(counter.label).toHaveText("Count: 0");
  });

  test("renders the provided initial value", async ({ page, mount }) => {
    await mount(<CounterWithInitialValueStory initialCount={5} />);

    const counter = new CounterComponent(page);
    await expect(counter.label).toHaveText("Counter: 5");
  });

  test("increments the count on click", async ({ page, mount }) => {
    await mount(<CounterStory />);

    const counter = new CounterComponent(page);
    await counter.incrementButton.click();
    await expect(counter.label).toHaveText("Count: 1");
  });

  test("decrements the count on click", async ({ page, mount }) => {
    await mount(<CounterStory />);

    const counter = new CounterComponent(page);
    await counter.decrementButton.click();
    await expect(counter.label).toHaveText("Count: -1");
  });

  test("fires the onCountChange callback when incrementing", async ({
    page,
    mount,
  }) => {
    const calls: number[] = [];

    await mount(
      <CounterWithCallbackStory onCountChange={(n) => calls.push(n)} />,
    );

    const counter = new CounterComponent(page);
    await counter.incrementButton.click();
    await counter.incrementButton.click();

    // Give the async dispatch a tick to flush.
    await page.waitForTimeout(50);

    expect(calls).toEqual([1, 2]);
  });
});
