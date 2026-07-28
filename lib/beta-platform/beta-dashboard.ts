import type { BetaAccessState, BetaDashboardData } from "./types";
import { readSession } from "@/lib/auth/session-store";
import { getWaitlistEntry, getQueuePosition } from "./waitlist";
import { getInvitationRedemption, hasRedeemedInvitation } from "./invitations";
import { getFeedbackCount } from "./feedback";
import { getAnalyticsEventCount } from "./analytics";
import { getCrashReportCount } from "./crash-reports";
import { getResolvedFlags } from "./feature-flags";
import { getRecentChangelog } from "./changelog";
import { hasBetaAccess as hasLegacyBetaAccess } from "@/lib/launch/beta-signup";

export function resolveBetaAccess(): BetaAccessState {
  const session = typeof window !== "undefined" ? readSession() : null;
  const waitlist = getWaitlistEntry();
  const invitation = getInvitationRedemption();
  const legacyAccess = typeof window !== "undefined" ? hasLegacyBetaAccess() : false;

  let stage: BetaAccessState["stage"] = "none";

  if (session) {
    stage = "registered";
    if (waitlist?.status === "active" || legacyAccess) {
      stage = "active";
    }
  } else if (hasRedeemedInvitation()) {
    stage = "invited";
  } else if (waitlist) {
    stage = waitlist.status === "invited" ? "invited" : "waitlist";
  }

  const canAccessDashboard =
    stage !== "none" || hasRedeemedInvitation() || legacyAccess || !!waitlist;
  const canAccessProduct =
    stage === "active" ||
    stage === "registered" ||
    hasRedeemedInvitation() ||
    legacyAccess ||
    waitlist?.status === "active";

  return {
    stage,
    waitlistEntry: waitlist,
    invitation,
    hasAuthSession: !!session,
    canAccessDashboard,
    canAccessProduct,
  };
}

export function getBetaDashboardData(): BetaDashboardData {
  const access = resolveBetaAccess();
  const session = typeof window !== "undefined" ? readSession() : null;

  return {
    access,
    waitlistPosition: getQueuePosition(),
    feedbackCount: getFeedbackCount(),
    analyticsEventCount: getAnalyticsEventCount(),
    crashReportCount: getCrashReportCount(),
    featureFlags: getResolvedFlags({
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
    }),
    recentChangelog: getRecentChangelog(4),
    systemStatus: "operational",
  };
}
