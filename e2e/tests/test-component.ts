import { mergeTests } from "@playwright/test";

import { ctDevMountFixture } from "../fixtures/ct-dev-mount";

/**
 * Base test object for component tests.
 */
export const test = mergeTests(ctDevMountFixture);
export const { expect } = test;
