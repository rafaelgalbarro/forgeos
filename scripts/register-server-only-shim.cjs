/**
 * Preload: resolve `server-only` to a no-op shim for certification scripts.
 * Usage: node --require ./scripts/register-server-only-shim.cjs ...
 */
const Module = require("module");
const path = require("path");

const SHIM = path.join(__dirname, "shims", "server-only.js");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return SHIM;
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
