import { createStubWorker } from "../create-stub-worker";

export const qaWorker = createStubWorker({
  id: "qa",
  name: "QA",
  role: "Casos de prueba",
  durationMs: 1800,
});
