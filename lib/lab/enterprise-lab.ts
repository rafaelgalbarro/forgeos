/** ForgeOS RC11 — Enterprise lab harness. */

import { runFullDemoFlow, getDemoFlowState, DEMO_STEPS } from "@/lib/enterprise/demo-flow";
import { buildPermissionMatrix } from "@/lib/enterprise/permissions-engine";
import { getSecurityPosture } from "@/lib/enterprise/security-center";
import { getComplianceChecklist, getComplianceScore } from "@/lib/enterprise/compliance-engine";
import { listPlans } from "@/lib/enterprise/billing-engine";
import { listRoles } from "@/lib/enterprise/rbac-engine";
import { getSsoConfig } from "@/lib/enterprise/sso-engine";
import { getScimConfig } from "@/lib/enterprise/scim-engine";

export interface EnterpriseLabSnapshot {
  flow: ReturnType<typeof getDemoFlowState>;
  steps: typeof DEMO_STEPS;
  roles: ReturnType<typeof listRoles>;
  plans: ReturnType<typeof listPlans>;
  permissions: ReturnType<typeof buildPermissionMatrix>;
  security: ReturnType<typeof getSecurityPosture>;
  compliance: {
    items: ReturnType<typeof getComplianceChecklist>;
    score: number;
  };
  sso: ReturnType<typeof getSsoConfig>;
  scim: ReturnType<typeof getScimConfig>;
  dryRunOnly: true;
}

export function runEnterpriseLab(): EnterpriseLabSnapshot {
  const flow = getDemoFlowState();
  const complianceItems = getComplianceChecklist(flow.org?.id);

  return {
    flow,
    steps: DEMO_STEPS,
    roles: listRoles(),
    plans: listPlans(),
    permissions: buildPermissionMatrix(),
    security: getSecurityPosture(flow.org?.id),
    compliance: {
      items: complianceItems,
      score: getComplianceScore(complianceItems),
    },
    sso: getSsoConfig(flow.org),
    scim: getScimConfig(flow.org),
    dryRunOnly: true,
  };
}

export function seedEnterpriseLab(): EnterpriseLabSnapshot {
  runFullDemoFlow();
  return runEnterpriseLab();
}
