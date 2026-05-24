import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the repo */
export const repositoryRoot = path.resolve(dirname, "../..");

/** Root of the e2e folder */
export const e2eRoot = path.resolve(repositoryRoot, "e2e");

/** Root of the app folder */
export const appRoot = path.resolve(repositoryRoot, "app");
