import { createStubWorker } from "../create-stub-worker";

export const databaseWorker = createStubWorker({
  id: "database",
  name: "Database",
  role: "Modelo de datos",
  durationMs: 1800,
});
