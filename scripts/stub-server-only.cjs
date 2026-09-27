/** Preload stub so scripts can import server-only modules outside Next.js. */
const Module = require("module");
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return origLoad.apply(this, arguments);
};
