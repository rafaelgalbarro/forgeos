/** CEO pillar — public exports. */

export type { CeoPriorityItem, CeoBriefingStub, CeoSnapshot } from "./types";
export { CeoPillarEngine, ceoPillarEngine } from "./engine";
export { listCeoCapabilities, getCeoCapability } from "./registry";
export { ceoOfficeAdapter } from "./adapters/ceo-office.adapter";
export { fosKernelAdapter, type FosKernelBridge } from "./adapters/fos-kernel.adapter";
