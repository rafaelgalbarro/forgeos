import { createStubWorker } from "../create-stub-worker";

export const frontendWorker = createStubWorker({
  id: "frontend",
  name: "Frontend",
  role: "Componentes UI",
  durationMs: 2500,
});
