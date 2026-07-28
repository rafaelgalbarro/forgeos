import { createStubWorker } from "../create-stub-worker";

export const backendWorker = createStubWorker({
  id: "backend",
  name: "Backend",
  role: "APIs y servicios",
  durationMs: 2300,
});
