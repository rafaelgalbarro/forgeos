import { createStubWorker } from "../create-stub-worker";

export const legalWorker = createStubWorker({
  id: "legal",
  name: "Legal",
  role: "RGPD y compliance",
  durationMs: 1600,
});
