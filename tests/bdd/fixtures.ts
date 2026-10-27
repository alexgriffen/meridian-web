import { test as bddBase } from "playwright-bdd";
import { consoleFixtures, type ConsoleFixtures } from "../e2e/fixtures/test.js";

// playwright-bdd needs its own base `test`; layer the e2e console fixtures on it.
export const test = bddBase.extend<ConsoleFixtures>(consoleFixtures);
export { expect, type TabName } from "../e2e/fixtures/test.js";
