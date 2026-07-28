/** ForgeOS Productivity Meetings — public API (RC4.3). */

export * from "./types";
export * from "./registry";
export * from "./permissions";
export * from "./policies";
export * from "./risk";
export * from "./rollback";
export * from "./mock-executor";
export * from "./sandbox";
export * from "./adapter";
import { buildProviderModule } from "../build-provider";
import { MEETINGS_CONFIG } from "../provider-configs";

export const meetingsModule = buildProviderModule(MEETINGS_CONFIG);
