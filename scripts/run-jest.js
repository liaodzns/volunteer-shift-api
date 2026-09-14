#!/usr/bin/env node
// Node 22+ ships an experimental `localStorage` global that throws a
// SecurityError when accessed without --localstorage-file. jest-environment-node
// probes for it during environment setup, which crashes every test suite.
// Disabling webstorage sidesteps that. Older Node builds don't have the flag
// at all, so we only add it when the running Node actually supports it.
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const jestBin = path.join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "jest.cmd" : "jest"
);

const env = { ...process.env };
if (process.allowedNodeEnvironmentFlags.has("--no-webstorage")) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, "--no-webstorage"].filter(Boolean).join(" ");
}

const result = spawnSync(jestBin, process.argv.slice(2), {
  stdio: "inherit",
  env,
});

process.exit(result.status === null ? 1 : result.status);
