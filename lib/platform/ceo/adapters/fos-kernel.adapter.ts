/**
 * FOS kernel adapter — stub interface only.
 * NOT CONNECTED — no runtime import from lib/fos in engine.
 */

export interface FosKernelBridge {
  readonly module: "fos-kernel";
  isConnected(): boolean;
  describe(): string;
}

export const fosKernelAdapter: FosKernelBridge = {
  module: "fos-kernel",
  isConnected(): boolean {
    return false;
  },
  describe(): string {
    return "FOS kernel bridge stub — not connected.";
  },
};
