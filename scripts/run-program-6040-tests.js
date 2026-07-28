#!/usr/bin/env node
/**
 * PROGRAM 6040 — run events tests via TypeScript transpile (no extra test runner dep).
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

const ROOT = path.join(__dirname, "..");
const ENTRY = path.join(ROOT, "src", "core", "events", "__tests__", "program-6040.test.ts");

function resolveAlias(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return path.join(ROOT, specifier.slice(2));
  }
  return null;
}

function loadTs(filePath, cache = new Map()) {
  const resolved = filePath.endsWith(".ts") || filePath.endsWith(".tsx")
    ? filePath
    : fs.existsSync(filePath + ".ts")
      ? filePath + ".ts"
      : fs.existsSync(path.join(filePath, "index.ts"))
        ? path.join(filePath, "index.ts")
        : filePath;

  if (cache.has(resolved)) return cache.get(resolved);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Cannot load ${resolved}`);
  }

  if (resolved.endsWith(".json")) {
    const json = JSON.parse(fs.readFileSync(resolved, "utf8"));
    cache.set(resolved, json);
    return json;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      strict: false,
    },
    fileName: resolved,
  }).outputText;

  const mod = { exports: {} };
  cache.set(resolved, mod.exports);

  const localRequire = (specifier) => {
    const aliased = resolveAlias(specifier, resolved);
    if (aliased) {
      if (fs.existsSync(aliased) || fs.existsSync(aliased + ".ts") || fs.existsSync(path.join(aliased, "index.ts"))) {
        return loadTs(aliased, cache);
      }
      // Fall through to node resolution for non-ts aliases
      try {
        return require(aliased);
      } catch {
        /* continue */
      }
    }
    if (specifier.startsWith(".")) {
      return loadTs(path.resolve(path.dirname(resolved), specifier), cache);
    }
    return require(specifier);
  };

  const wrapper = new Function("exports", "require", "module", "__filename", "__dirname", transpiled);
  wrapper(mod.exports, localRequire, mod, resolved, path.dirname(resolved));
  cache.set(resolved, mod.exports);
  return mod.exports;
}

async function main() {
  console.log("\nPROGRAM 6040 — events tests\n");
  const loaded = loadTs(ENTRY);
  const run = loaded.runProgram6040Tests;
  if (typeof run !== "function") {
    console.error("runProgram6040Tests not exported");
    process.exit(1);
  }
  const { passed, failed } = await run();
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
