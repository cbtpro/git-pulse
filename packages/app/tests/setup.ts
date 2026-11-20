import { webcrypto } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
Object.defineProperty(globalThis, "indexedDB", {
  value: new IDBFactory(),
  configurable: true,
});
import { beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(async () =>
  (
    await import("../src/services/github/GitHubService")
  ).clearGitHubRequestState(),
);
afterEach(cleanup);
