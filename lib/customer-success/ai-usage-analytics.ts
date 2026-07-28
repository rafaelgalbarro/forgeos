import {
  getAiUsageSummary,
  listAiRuntimeRecords,
  getAiUsageByTask,
  getAiUsageByProvider,
} from "@/lib/design-partners/ai-usage-metrics";

export {
  getAiUsageSummary,
  listAiRuntimeRecords,
  getAiUsageByTask,
  getAiUsageByProvider,
};

export function getAiUsageAnalytics(): {
  summary: ReturnType<typeof getAiUsageSummary>;
  byTask: ReturnType<typeof getAiUsageByTask>;
  byProvider: ReturnType<typeof getAiUsageByProvider>;
  recentCount: number;
} {
  return {
    summary: getAiUsageSummary(),
    byTask: getAiUsageByTask(),
    byProvider: getAiUsageByProvider(),
    recentCount: listAiRuntimeRecords().length,
  };
}
