/** Query handlers — map repositories to read models. */

import type { QueryHandler } from "../../queries/types";
import type {
  GetBuildStatusQuery,
  GetCodebaseSummaryQuery,
  GetCodebaseTreeQuery,
  GetCompanyOperatingOverviewQuery,
  GetDeploymentStatusQuery,
  GetMissionConversationQuery,
  GetMissionDecisionsQuery,
  GetMissionOutputsQuery,
  GetMissionOverviewQuery,
  GetMissionTimelineQuery,
  GetOutputDetailsQuery,
  GetPreviewStatusQuery,
  GetReleaseStatusQuery,
  GetVentureOverviewQuery,
  GetWorkspaceOverviewQuery,
} from "../../queries/definitions";
import { fail } from "../../errors";
import type { ApplicationPorts } from "../../ports";
import {
  toBuildStatus,
  toCodebaseSummary,
  toCodebaseTree,
  toCompanyOverview,
  toDeploymentStatus,
  toMissionConversation,
  toMissionDecisions,
  toMissionOverview,
  toMissionTimeline,
  toOutputCard,
  toOutputStudio,
  toPreviewStatus,
  toReleaseStatus,
  toVentureOverview,
  toWorkspaceOverview,
} from "../../mappers";
import { requireIdentity, requireWorkspaceAccess } from "../shared/pipeline";

export function createQueryHandlers(ports: ApplicationPorts): QueryHandler[] {
  const getWorkspaceOverview: QueryHandler<GetWorkspaceOverviewQuery> = {
    queryType: "GetWorkspaceOverview",
    async execute(query) {
      const actor = await requireIdentity(ports, query.meta.actorId);
      await requireWorkspaceAccess(ports, actor.actorId, query.payload.workspaceId);
      const workspace = await ports.uow.workspaces.getById(query.payload.workspaceId);
      if (!workspace) {
        fail({
          code: "WORKSPACE_NOT_FOUND",
          message: `Workspace not found: ${query.payload.workspaceId}`,
          category: "not_found",
        });
      }
      const ventures = await ports.uow.ventures.listByWorkspace(workspace.id);
      const missions = await ports.uow.missions.listByWorkspace(workspace.id);
      return toWorkspaceOverview(workspace, ventures.length, missions.length);
    },
  };

  const getVentureOverview: QueryHandler<GetVentureOverviewQuery> = {
    queryType: "GetVentureOverview",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const venture = await ports.uow.ventures.getById(query.payload.ventureId);
      if (!venture) {
        fail({
          code: "VENTURE_NOT_FOUND",
          message: `Venture not found: ${query.payload.ventureId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, venture.workspaceId);
      return toVentureOverview(venture);
    },
  };

  const getMissionOverview: QueryHandler<GetMissionOverviewQuery> = {
    queryType: "GetMissionOverview",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const mission = await ports.uow.missions.getById(query.payload.missionId);
      if (!mission) {
        fail({
          code: "MISSION_NOT_FOUND",
          message: `Mission not found: ${query.payload.missionId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, mission.workspaceId);
      return toMissionOverview(mission);
    },
  };

  const getMissionConversation: QueryHandler<GetMissionConversationQuery> = {
    queryType: "GetMissionConversation",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const mission = await ports.uow.missions.getById(query.payload.missionId);
      if (!mission) {
        fail({
          code: "MISSION_NOT_FOUND",
          message: `Mission not found: ${query.payload.missionId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, mission.workspaceId);
      return toMissionConversation(mission);
    },
  };

  const getMissionTimeline: QueryHandler<GetMissionTimelineQuery> = {
    queryType: "GetMissionTimeline",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const mission = await ports.uow.missions.getById(query.payload.missionId);
      if (!mission) {
        fail({
          code: "MISSION_NOT_FOUND",
          message: `Mission not found: ${query.payload.missionId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, mission.workspaceId);
      return toMissionTimeline(mission);
    },
  };

  const getMissionDecisions: QueryHandler<GetMissionDecisionsQuery> = {
    queryType: "GetMissionDecisions",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const mission = await ports.uow.missions.getById(query.payload.missionId);
      if (!mission) {
        fail({
          code: "MISSION_NOT_FOUND",
          message: `Mission not found: ${query.payload.missionId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, mission.workspaceId);
      const decisions = await ports.uow.decisions.listByMission(mission.id);
      return toMissionDecisions(mission.id, decisions);
    },
  };

  const getMissionOutputs: QueryHandler<GetMissionOutputsQuery> = {
    queryType: "GetMissionOutputs",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const mission = await ports.uow.missions.getById(query.payload.missionId);
      if (!mission) {
        fail({
          code: "MISSION_NOT_FOUND",
          message: `Mission not found: ${query.payload.missionId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, mission.workspaceId);
      const outputs = await ports.uow.outputs.listByMission(mission.id);
      return outputs.map(toOutputCard);
    },
  };

  const getOutputDetails: QueryHandler<GetOutputDetailsQuery> = {
    queryType: "GetOutputDetails",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const output = await ports.uow.outputs.getById(query.payload.outputId);
      if (!output) {
        fail({
          code: "OUTPUT_NOT_FOUND",
          message: `Output not found: ${query.payload.outputId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, output.workspaceId);
      return toOutputStudio(output);
    },
  };

  const getCodebaseSummary: QueryHandler<GetCodebaseSummaryQuery> = {
    queryType: "GetCodebaseSummary",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const codebase = await ports.uow.codebases.getById(query.payload.codebaseId);
      if (!codebase) {
        fail({
          code: "CODEBASE_NOT_FOUND",
          message: `Codebase not found: ${query.payload.codebaseId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, codebase.workspaceId);
      return toCodebaseSummary(codebase);
    },
  };

  const getCodebaseTree: QueryHandler<GetCodebaseTreeQuery> = {
    queryType: "GetCodebaseTree",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const codebase = await ports.uow.codebases.getById(query.payload.codebaseId);
      if (!codebase) {
        fail({
          code: "CODEBASE_NOT_FOUND",
          message: `Codebase not found: ${query.payload.codebaseId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, codebase.workspaceId);
      return toCodebaseTree(codebase);
    },
  };

  const getBuildStatus: QueryHandler<GetBuildStatusQuery> = {
    queryType: "GetBuildStatus",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const build = await ports.uow.builds.getById(query.payload.buildId);
      if (!build) {
        fail({
          code: "BUILD_NOT_FOUND",
          message: `Build not found: ${query.payload.buildId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, build.workspaceId);
      return toBuildStatus(build);
    },
  };

  const getPreviewStatus: QueryHandler<GetPreviewStatusQuery> = {
    queryType: "GetPreviewStatus",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const preview = await ports.uow.previews.getById(query.payload.previewId);
      if (!preview) {
        fail({
          code: "PREVIEW_NOT_FOUND",
          message: `Preview not found: ${query.payload.previewId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, preview.workspaceId);
      return toPreviewStatus(preview);
    },
  };

  const getReleaseStatus: QueryHandler<GetReleaseStatusQuery> = {
    queryType: "GetReleaseStatus",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const release = await ports.uow.releases.getById(query.payload.releaseId);
      if (!release) {
        fail({
          code: "RELEASE_NOT_FOUND",
          message: `Release not found: ${query.payload.releaseId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, release.workspaceId);
      return toReleaseStatus(release);
    },
  };

  const getDeploymentStatus: QueryHandler<GetDeploymentStatusQuery> = {
    queryType: "GetDeploymentStatus",
    async execute(query) {
      await requireIdentity(ports, query.meta.actorId);
      const deployment = await ports.uow.deployments.getById(query.payload.deploymentId);
      if (!deployment) {
        fail({
          code: "DEPLOYMENT_NOT_FOUND",
          message: `Deployment not found: ${query.payload.deploymentId}`,
          category: "not_found",
        });
      }
      await requireWorkspaceAccess(ports, query.meta.actorId, deployment.workspaceId);
      return toDeploymentStatus(deployment);
    },
  };

  const getCompanyOperatingOverview: QueryHandler<GetCompanyOperatingOverviewQuery> = {
    queryType: "GetCompanyOperatingOverview",
    async execute(query) {
      const actor = await requireIdentity(ports, query.meta.actorId);
      await requireWorkspaceAccess(ports, actor.actorId, query.payload.workspaceId);
      const workspace = await ports.uow.workspaces.getById(query.payload.workspaceId);
      if (!workspace) {
        fail({
          code: "WORKSPACE_NOT_FOUND",
          message: `Workspace not found: ${query.payload.workspaceId}`,
          category: "not_found",
        });
      }
      const ventures = await ports.uow.ventures.listByWorkspace(workspace.id);
      const missions = await ports.uow.missions.listByWorkspace(workspace.id);
      let activeBuilds = 0;
      let livePreviews = 0;
      let pendingDecisions = 0;
      for (const mission of missions) {
        const build = await ports.uow.builds.findLatestByMission(mission.id);
        if (build?.status === "running") activeBuilds += 1;
        const preview = await ports.uow.previews.findLatestByMission(mission.id);
        if (preview?.status === "running") livePreviews += 1;
        const decisions = await ports.uow.decisions.listByMission(mission.id);
        pendingDecisions += decisions.filter((d) => d.status === "pending").length;
      }
      return toCompanyOverview({
        workspace,
        ventures: ventures.length,
        missions: missions.length,
        activeBuilds,
        livePreviews,
        pendingDecisions,
      });
    },
  };

  return [
    getWorkspaceOverview,
    getVentureOverview,
    getMissionOverview,
    getMissionConversation,
    getMissionTimeline,
    getMissionDecisions,
    getMissionOutputs,
    getOutputDetails,
    getCodebaseSummary,
    getCodebaseTree,
    getBuildStatus,
    getPreviewStatus,
    getReleaseStatus,
    getDeploymentStatus,
    getCompanyOperatingOverview,
  ];
}
