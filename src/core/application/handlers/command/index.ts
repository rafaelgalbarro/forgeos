/** Command handlers — Program 6020. Depend on ports only. */

import {
  approveCodebase,
  approveDeployment,
  approveMissionPlan,
  approveOutput,
  approveRelease,
  cancelMission,
  createMissionAggregate,
  createPreview,
  createRelease,
  createVentureAggregate,
  createWorkspaceAggregate,
  generateCodebase,
  generateOutput,
  pauseMission,
  planOutput,
  requestCodeChange,
  requestDecision,
  requestDeployment,
  requestOutputChange,
  resolveDecision,
  resumeMission,
  retryBuild,
  startBuild,
  stopBuild,
  stopPreview,
  updateMissionIntent as applyMissionIntentUpdate,
  rollbackDeployment,
} from "../../compat-domain";
import type { CommandHandler } from "../../commands/types";
import type {
  ApproveCodebaseCommand,
  ApproveDeploymentCommand,
  ApproveMissionPlanCommand,
  ApproveOutputCommand,
  ApproveReleaseCommand,
  CancelMissionCommand,
  CreateMissionCommand,
  CreatePreviewCommand,
  CreateReleaseCommand,
  CreateVentureCommand,
  CreateWorkspaceCommand,
  GenerateCodebaseCommand,
  GenerateOutputCommand,
  PauseMissionCommand,
  PlanOutputCommand,
  RequestCodeChangeCommand,
  RequestDecisionCommand,
  RequestDeploymentCommand,
  RequestOutputChangeCommand,
  ResolveDecisionCommand,
  ResumeMissionCommand,
  RetryBuildCommand,
  RollbackDeploymentCommand,
  StartBuildCommand,
  StopBuildCommand,
  StopPreviewCommand,
  UpdateMissionIntentCommand,
} from "../../commands/definitions";
import { fail } from "../../errors";
import {
  CanApproveDecision,
  CanApproveRelease,
  CanCreateMission,
  CanCreatePreview,
  CanDeployPreview,
  CanDeployProduction,
  CanGenerateOutput,
  CanRollbackDeployment,
  CanStartBuild,
} from "../../policies";
import type { ApplicationPorts } from "../../ports";
import {
  toBuildStatus,
  toCodebaseSummary,
  toDeploymentStatus,
  toMissionOverview,
  toOutputCard,
  toPreviewStatus,
  toReleaseStatus,
  toVentureOverview,
  toWorkspaceOverview,
} from "../../mappers";
import { runCommandPipeline } from "../shared/pipeline";

async function requireMission(ports: ApplicationPorts, missionId: string) {
  const mission = await ports.uow.missions.getById(missionId);
  if (!mission) {
    fail({ code: "MISSION_NOT_FOUND", message: `Mission not found: ${missionId}`, category: "not_found" });
  }
  return mission;
}

export function createCommandHandlers(ports: ApplicationPorts): CommandHandler[] {
  const createWorkspace: CommandHandler<CreateWorkspaceCommand> = {
    commandType: "CreateWorkspace",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "CreateWorkspace",
        execute: async () => {
          const id = ports.clock.createId("ws");
          const now = ports.clock.now();
          const { workspace, events } = createWorkspaceAggregate(
            id,
            {
              name: command.payload.name,
              slug: command.payload.slug,
              ownerId: command.meta.actorId,
              organizationId: command.payload.organizationId,
            },
            now,
          );
          if (!workspace.name) {
            fail({
              code: "VALIDATION",
              message: "Workspace name required",
              category: "validation",
              fieldErrors: { name: "required" },
            });
          }
          await ports.uow.workspaces.save(workspace);
          await ports.uow.events.append(
            events.map((e) => ({ ...e, correlationId: command.meta.correlationId })),
          );
          return toWorkspaceOverview(workspace, 0, 0);
        },
      });
    },
  };

  const createVenture: CommandHandler<CreateVentureCommand> = {
    commandType: "CreateVenture",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "CreateVenture",
        workspaceId: command.payload.workspaceId,
        execute: async () => {
          const ws = await ports.uow.workspaces.getById(command.payload.workspaceId);
          if (!ws) {
            fail({
              code: "WORKSPACE_NOT_FOUND",
              message: `Workspace not found: ${command.payload.workspaceId}`,
              category: "not_found",
            });
          }
          const id = ports.clock.createId("ven");
          const now = ports.clock.now();
          const { venture, events } = createVentureAggregate(
            id,
            {
              workspaceId: command.payload.workspaceId,
              name: command.payload.name,
              slug: command.payload.slug,
              ownerId: command.meta.actorId,
              idea: command.payload.idea,
            },
            now,
          );
          await ports.uow.ventures.save(venture);
          const nextWs = {
            ...ws,
            ventureIds: [...ws.ventureIds, venture.id],
            updatedAt: now,
          };
          await ports.uow.workspaces.save(nextWs);
          await ports.uow.events.append(
            events.map((e) => ({ ...e, correlationId: command.meta.correlationId })),
          );
          return toVentureOverview(venture);
        },
      });
    },
  };

  const createMission: CommandHandler<CreateMissionCommand> = {
    commandType: "CreateMission",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "CreateMission",
        workspaceId: command.payload.workspaceId,
        policy: CanCreateMission,
        useIdempotency: true,
        execute: async () => {
          const ws = await ports.uow.workspaces.getById(command.payload.workspaceId);
          if (!ws) {
            fail({
              code: "WORKSPACE_NOT_FOUND",
              message: `Workspace not found: ${command.payload.workspaceId}`,
              category: "not_found",
            });
          }
          const id = ports.clock.createId("mis");
          const now = ports.clock.now();
          const { mission, events } = createMissionAggregate(
            id,
            {
              workspaceId: command.payload.workspaceId,
              ventureId: command.payload.ventureId,
              founderId: command.meta.actorId,
              idea: command.payload.idea,
            },
            now,
          );
          await ports.uow.missions.save(mission);
          if (command.payload.ventureId) {
            const venture = await ports.uow.ventures.getById(command.payload.ventureId);
            if (venture) {
              await ports.uow.ventures.save({
                ...venture,
                missionIds: [...venture.missionIds, mission.id],
                updatedAt: now,
              });
            }
          }
          await ports.uow.events.append(
            events.map((e) => ({ ...e, correlationId: command.meta.correlationId })),
          );
          return toMissionOverview(mission);
        },
      });
    },
  };

  const updateMissionIntentHandler: CommandHandler<UpdateMissionIntentCommand> = {
    commandType: "UpdateMissionIntent",
    async execute(command) {
      const existing = await requireMission(ports, command.payload.missionId);
      return runCommandPipeline(ports, command, {
        name: "UpdateMissionIntent",
        workspaceId: existing.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const now = ports.clock.now();
          const { mission: next, events } = applyMissionIntentUpdate(
            mission,
            command.payload.intent,
            now,
          );
          await ports.uow.missions.save(next);
          await ports.uow.events.append(
            events.map((e) => ({ ...e, correlationId: command.meta.correlationId })),
          );
          return toMissionOverview(next);
        },
      });
    },
  };

  const approveMissionPlanHandler: CommandHandler<ApproveMissionPlanCommand> = {
    commandType: "ApproveMissionPlan",
    async execute(command) {
      const existing = await requireMission(ports, command.payload.missionId);
      return runCommandPipeline(ports, command, {
        name: "ApproveMissionPlan",
        workspaceId: existing.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const now = ports.clock.now();
          const { mission: next, events } = approveMissionPlan(mission, now);
          await ports.uow.missions.save(next);
          await ports.uow.events.append(
            events.map((e) => ({ ...e, correlationId: command.meta.correlationId })),
          );
          return toMissionOverview(next);
        },
      });
    },
  };

  const pauseMissionHandler: CommandHandler<PauseMissionCommand> = {
    commandType: "PauseMission",
    async execute(command) {
      const existing = await requireMission(ports, command.payload.missionId);
      return runCommandPipeline(ports, command, {
        name: "PauseMission",
        workspaceId: existing.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const { mission: next, events } = pauseMission(mission, ports.clock.now());
          await ports.uow.missions.save(next);
          await ports.uow.events.append(events);
          return toMissionOverview(next);
        },
      });
    },
  };

  const resumeMissionHandler: CommandHandler<ResumeMissionCommand> = {
    commandType: "ResumeMission",
    async execute(command) {
      const existing = await requireMission(ports, command.payload.missionId);
      return runCommandPipeline(ports, command, {
        name: "ResumeMission",
        workspaceId: existing.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const { mission: next, events } = resumeMission(
            mission,
            command.payload.resumeTo,
            ports.clock.now(),
          );
          await ports.uow.missions.save(next);
          await ports.uow.events.append(events);
          return toMissionOverview(next);
        },
      });
    },
  };

  const cancelMissionHandler: CommandHandler<CancelMissionCommand> = {
    commandType: "CancelMission",
    async execute(command) {
      const existing = await requireMission(ports, command.payload.missionId);
      return runCommandPipeline(ports, command, {
        name: "CancelMission",
        workspaceId: existing.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const { mission: next, events } = cancelMission(mission, ports.clock.now());
          await ports.uow.missions.save(next);
          await ports.uow.events.append(events);
          return toMissionOverview(next);
        },
      });
    },
  };

  const requestDecisionHandler: CommandHandler<RequestDecisionCommand> = {
    commandType: "RequestDecision",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "RequestDecision",
        workspaceId: command.payload.workspaceId,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("dec");
          const now = ports.clock.now();
          const { decision, events } = requestDecision(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
              title: command.payload.title,
              description: command.payload.description,
              options: command.payload.options,
              requestedBy: command.meta.actorId,
            },
            now,
          );
          await ports.uow.decisions.save(decision);
          await ports.uow.missions.save({
            ...mission,
            decisionIds: [...mission.decisionIds, decision.id],
            updatedAt: now,
          });
          await ports.uow.events.append(events);
          return {
            id: decision.id,
            title: decision.title,
            status: decision.status,
            options: decision.options,
          };
        },
      });
    },
  };

  const resolveDecisionHandler: CommandHandler<ResolveDecisionCommand> = {
    commandType: "ResolveDecision",
    async execute(command) {
      const decision = await ports.uow.decisions.getById(command.payload.decisionId);
      if (!decision) {
        fail({
          code: "DECISION_NOT_FOUND",
          message: `Decision not found: ${command.payload.decisionId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "ResolveDecision",
        workspaceId: decision.workspaceId,
        policy: CanApproveDecision,
        execute: async () => {
          const current = await ports.uow.decisions.getById(command.payload.decisionId);
          if (!current) {
            fail({
              code: "DECISION_NOT_FOUND",
              message: `Decision not found: ${command.payload.decisionId}`,
              category: "not_found",
            });
          }
          const { decision: next, events } = resolveDecision(
            current,
            command.payload.selectedOption,
            command.meta.actorId,
            ports.clock.now(),
          );
          await ports.uow.decisions.save(next);
          await ports.uow.events.append(events);
          return {
            id: next.id,
            title: next.title,
            status: next.status,
            selectedOption: next.selectedOption,
          };
        },
      });
    },
  };

  const planOutputHandler: CommandHandler<PlanOutputCommand> = {
    commandType: "PlanOutput",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "PlanOutput",
        workspaceId: command.payload.workspaceId,
        policy: CanGenerateOutput,
        execute: async () => {
          const mission = await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("out");
          const now = ports.clock.now();
          const { output, events } = planOutput(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
              kind: command.payload.kind,
              title: command.payload.title,
            },
            now,
          );
          await ports.uow.outputs.save(output);
          await ports.uow.missions.save({
            ...mission,
            outputIds: [...mission.outputIds, output.id],
            updatedAt: now,
          });
          await ports.uow.events.append(events);
          return toOutputCard(output);
        },
      });
    },
  };

  const generateOutputHandler: CommandHandler<GenerateOutputCommand> = {
    commandType: "GenerateOutput",
    async execute(command) {
      const output = await ports.uow.outputs.getById(command.payload.outputId);
      if (!output) {
        fail({
          code: "OUTPUT_NOT_FOUND",
          message: `Output not found: ${command.payload.outputId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "GenerateOutput",
        workspaceId: output.workspaceId,
        policy: CanGenerateOutput,
        useIdempotency: true,
        execute: async () => {
          const current = await ports.uow.outputs.getById(command.payload.outputId);
          if (!current) {
            fail({
              code: "OUTPUT_NOT_FOUND",
              message: `Output not found: ${command.payload.outputId}`,
              category: "not_found",
            });
          }
          const summary =
            command.payload.summary ??
            (await ports.ai.generateSummary(`Generate ${current.kind}: ${current.title}`));
          const { output: next, events } = generateOutput(current, summary, ports.clock.now());
          await ports.uow.outputs.save(next);
          await ports.uow.events.append(events);
          return toOutputCard(next);
        },
      });
    },
  };

  const requestOutputChangeHandler: CommandHandler<RequestOutputChangeCommand> = {
    commandType: "RequestOutputChange",
    async execute(command) {
      const output = await ports.uow.outputs.getById(command.payload.outputId);
      if (!output) {
        fail({
          code: "OUTPUT_NOT_FOUND",
          message: `Output not found: ${command.payload.outputId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "RequestOutputChange",
        workspaceId: output.workspaceId,
        execute: async () => {
          const current = await ports.uow.outputs.getById(command.payload.outputId);
          if (!current) {
            fail({
              code: "OUTPUT_NOT_FOUND",
              message: `Output not found: ${command.payload.outputId}`,
              category: "not_found",
            });
          }
          const { output: next, events } = requestOutputChange(current, ports.clock.now());
          await ports.uow.outputs.save(next);
          await ports.uow.events.append(events);
          return toOutputCard(next);
        },
      });
    },
  };

  const approveOutputHandler: CommandHandler<ApproveOutputCommand> = {
    commandType: "ApproveOutput",
    async execute(command) {
      const output = await ports.uow.outputs.getById(command.payload.outputId);
      if (!output) {
        fail({
          code: "OUTPUT_NOT_FOUND",
          message: `Output not found: ${command.payload.outputId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "ApproveOutput",
        workspaceId: output.workspaceId,
        execute: async () => {
          const current = await ports.uow.outputs.getById(command.payload.outputId);
          if (!current) {
            fail({
              code: "OUTPUT_NOT_FOUND",
              message: `Output not found: ${command.payload.outputId}`,
              category: "not_found",
            });
          }
          const { output: next, events } = approveOutput(
            current,
            command.meta.actorId,
            ports.clock.now(),
          );
          await ports.uow.outputs.save(next);
          await ports.uow.events.append(events);
          return toOutputCard(next);
        },
      });
    },
  };

  const generateCodebaseHandler: CommandHandler<GenerateCodebaseCommand> = {
    commandType: "GenerateCodebase",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "GenerateCodebase",
        workspaceId: command.payload.workspaceId,
        useIdempotency: true,
        execute: async () => {
          await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("cb");
          const { codebase, events } = generateCodebase(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
              summary: command.payload.summary,
            },
            ports.clock.now(),
          );
          await ports.uow.codebases.save(codebase);
          await ports.sourceControl.scaffoldRepo(command.payload.missionId);
          await ports.uow.events.append(events);
          return toCodebaseSummary(codebase);
        },
      });
    },
  };

  const requestCodeChangeHandler: CommandHandler<RequestCodeChangeCommand> = {
    commandType: "RequestCodeChange",
    async execute(command) {
      const codebase = await ports.uow.codebases.getById(command.payload.codebaseId);
      if (!codebase) {
        fail({
          code: "CODEBASE_NOT_FOUND",
          message: `Codebase not found: ${command.payload.codebaseId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "RequestCodeChange",
        workspaceId: codebase.workspaceId,
        execute: async () => {
          const current = await ports.uow.codebases.getById(command.payload.codebaseId);
          if (!current) {
            fail({
              code: "CODEBASE_NOT_FOUND",
              message: `Codebase not found: ${command.payload.codebaseId}`,
              category: "not_found",
            });
          }
          const { codebase: next, events } = requestCodeChange(current, ports.clock.now());
          await ports.uow.codebases.save(next);
          await ports.uow.events.append(events);
          return toCodebaseSummary(next);
        },
      });
    },
  };

  const approveCodebaseHandler: CommandHandler<ApproveCodebaseCommand> = {
    commandType: "ApproveCodebase",
    async execute(command) {
      const codebase = await ports.uow.codebases.getById(command.payload.codebaseId);
      if (!codebase) {
        fail({
          code: "CODEBASE_NOT_FOUND",
          message: `Codebase not found: ${command.payload.codebaseId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "ApproveCodebase",
        workspaceId: codebase.workspaceId,
        execute: async () => {
          const current = await ports.uow.codebases.getById(command.payload.codebaseId);
          if (!current) {
            fail({
              code: "CODEBASE_NOT_FOUND",
              message: `Codebase not found: ${command.payload.codebaseId}`,
              category: "not_found",
            });
          }
          const { codebase: next, events } = approveCodebase(
            current,
            command.meta.actorId,
            ports.clock.now(),
          );
          await ports.uow.codebases.save(next);
          await ports.uow.events.append(events);
          return toCodebaseSummary(next);
        },
      });
    },
  };

  const startBuildHandler: CommandHandler<StartBuildCommand> = {
    commandType: "StartBuild",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "StartBuild",
        workspaceId: command.payload.workspaceId,
        policy: CanStartBuild,
        useIdempotency: true,
        execute: async () => {
          await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("bld");
          const { build, events } = startBuild(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
            },
            ports.clock.now(),
          );
          await ports.uow.builds.save(build);
          await ports.execution.requestExecution({
            kind: "build",
            missionId: command.payload.missionId,
            correlationId: command.meta.correlationId,
          });
          await ports.uow.events.append(events);
          return toBuildStatus(build);
        },
      });
    },
  };

  const stopBuildHandler: CommandHandler<StopBuildCommand> = {
    commandType: "StopBuild",
    async execute(command) {
      const build = await ports.uow.builds.getById(command.payload.buildId);
      if (!build) {
        fail({
          code: "BUILD_NOT_FOUND",
          message: `Build not found: ${command.payload.buildId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "StopBuild",
        workspaceId: build.workspaceId,
        execute: async () => {
          const current = await ports.uow.builds.getById(command.payload.buildId);
          if (!current) {
            fail({
              code: "BUILD_NOT_FOUND",
              message: `Build not found: ${command.payload.buildId}`,
              category: "not_found",
            });
          }
          const { build: next, events } = stopBuild(current, ports.clock.now());
          await ports.uow.builds.save(next);
          await ports.uow.events.append(events);
          return toBuildStatus(next);
        },
      });
    },
  };

  const retryBuildHandler: CommandHandler<RetryBuildCommand> = {
    commandType: "RetryBuild",
    async execute(command) {
      const build = await ports.uow.builds.getById(command.payload.buildId);
      if (!build) {
        fail({
          code: "BUILD_NOT_FOUND",
          message: `Build not found: ${command.payload.buildId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "RetryBuild",
        workspaceId: build.workspaceId,
        policy: CanStartBuild,
        useIdempotency: true,
        execute: async () => {
          const current = await ports.uow.builds.getById(command.payload.buildId);
          if (!current) {
            fail({
              code: "BUILD_NOT_FOUND",
              message: `Build not found: ${command.payload.buildId}`,
              category: "not_found",
            });
          }
          const { build: next, events } = retryBuild(current, ports.clock.now());
          await ports.uow.builds.save(next);
          await ports.uow.events.append(events);
          return toBuildStatus(next);
        },
      });
    },
  };

  const createPreviewHandler: CommandHandler<CreatePreviewCommand> = {
    commandType: "CreatePreview",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "CreatePreview",
        workspaceId: command.payload.workspaceId,
        policy: CanCreatePreview,
        useIdempotency: true,
        execute: async () => {
          await requireMission(ports, command.payload.missionId);
          const sandbox = await ports.sandbox.createPreview(command.payload.missionId);
          const { preview, events } = createPreview(
            sandbox.previewId,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
            },
            ports.clock.now(),
          );
          const withUrl = { ...preview, url: sandbox.url };
          await ports.uow.previews.save(withUrl);
          await ports.uow.events.append(events);
          return toPreviewStatus(withUrl);
        },
      });
    },
  };

  const stopPreviewHandler: CommandHandler<StopPreviewCommand> = {
    commandType: "StopPreview",
    async execute(command) {
      const preview = await ports.uow.previews.getById(command.payload.previewId);
      if (!preview) {
        fail({
          code: "PREVIEW_NOT_FOUND",
          message: `Preview not found: ${command.payload.previewId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "StopPreview",
        workspaceId: preview.workspaceId,
        execute: async () => {
          const current = await ports.uow.previews.getById(command.payload.previewId);
          if (!current) {
            fail({
              code: "PREVIEW_NOT_FOUND",
              message: `Preview not found: ${command.payload.previewId}`,
              category: "not_found",
            });
          }
          const { preview: next, events } = stopPreview(current, ports.clock.now());
          await ports.sandbox.stopPreview(next.id);
          await ports.uow.previews.save(next);
          await ports.uow.events.append(events);
          return toPreviewStatus(next);
        },
      });
    },
  };

  const createReleaseHandler: CommandHandler<CreateReleaseCommand> = {
    commandType: "CreateRelease",
    async execute(command) {
      return runCommandPipeline(ports, command, {
        name: "CreateRelease",
        workspaceId: command.payload.workspaceId,
        execute: async () => {
          await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("rel");
          const { release, events } = createRelease(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
              version: command.payload.version,
            },
            ports.clock.now(),
          );
          await ports.uow.releases.save(release);
          await ports.uow.events.append(events);
          return toReleaseStatus(release);
        },
      });
    },
  };

  const approveReleaseHandler: CommandHandler<ApproveReleaseCommand> = {
    commandType: "ApproveRelease",
    async execute(command) {
      const release = await ports.uow.releases.getById(command.payload.releaseId);
      if (!release) {
        fail({
          code: "RELEASE_NOT_FOUND",
          message: `Release not found: ${command.payload.releaseId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "ApproveRelease",
        workspaceId: release.workspaceId,
        policy: CanApproveRelease,
        execute: async () => {
          const current = await ports.uow.releases.getById(command.payload.releaseId);
          if (!current) {
            fail({
              code: "RELEASE_NOT_FOUND",
              message: `Release not found: ${command.payload.releaseId}`,
              category: "not_found",
            });
          }
          const { release: next, events } = approveRelease(
            current,
            command.meta.actorId,
            ports.clock.now(),
          );
          // Atomic: release + approval id must persist together
          if (!next.approvalId) {
            fail({
              code: "APPROVAL_MISSING",
              message: "Release approval must create Approval record",
              category: "transaction",
              retryable: true,
            });
          }
          await ports.uow.releases.save(next);
          await ports.uow.events.append(events);
          return toReleaseStatus(next);
        },
      });
    },
  };

  const requestDeploymentHandler: CommandHandler<RequestDeploymentCommand> = {
    commandType: "RequestDeployment",
    async execute(command) {
      const policy =
        command.payload.target === "production" ? CanDeployProduction : CanDeployPreview;
      return runCommandPipeline(ports, command, {
        name: "RequestDeployment",
        workspaceId: command.payload.workspaceId,
        policy,
        policyCtx: { target: command.payload.target },
        useIdempotency: true,
        execute: async () => {
          await requireMission(ports, command.payload.missionId);
          const id = ports.clock.createId("dep");
          const { deployment, events } = requestDeployment(
            id,
            {
              workspaceId: command.payload.workspaceId,
              missionId: command.payload.missionId,
              releaseId: command.payload.releaseId,
              target: command.payload.target,
            },
            ports.clock.now(),
          );
          await ports.uow.deployments.save(deployment);
          await ports.uow.events.append(events);
          return toDeploymentStatus(deployment);
        },
      });
    },
  };

  const approveDeploymentHandler: CommandHandler<ApproveDeploymentCommand> = {
    commandType: "ApproveDeployment",
    async execute(command) {
      const deployment = await ports.uow.deployments.getById(command.payload.deploymentId);
      if (!deployment) {
        fail({
          code: "DEPLOYMENT_NOT_FOUND",
          message: `Deployment not found: ${command.payload.deploymentId}`,
          category: "not_found",
        });
      }
      const policy =
        deployment.target === "production" ? CanDeployProduction : CanDeployPreview;
      return runCommandPipeline(ports, command, {
        name: "ApproveDeployment",
        workspaceId: deployment.workspaceId,
        policy,
        execute: async () => {
          const current = await ports.uow.deployments.getById(command.payload.deploymentId);
          if (!current) {
            fail({
              code: "DEPLOYMENT_NOT_FOUND",
              message: `Deployment not found: ${command.payload.deploymentId}`,
              category: "not_found",
            });
          }
          const { deployment: next, events } = approveDeployment(current, ports.clock.now());
          await ports.uow.deployments.save(next);
          await ports.deployment.deploy({
            deploymentId: next.id,
            target: next.target,
          });
          await ports.uow.events.append(events);
          return toDeploymentStatus(next);
        },
      });
    },
  };

  const rollbackDeploymentHandler: CommandHandler<RollbackDeploymentCommand> = {
    commandType: "RollbackDeployment",
    async execute(command) {
      const deployment = await ports.uow.deployments.getById(command.payload.deploymentId);
      if (!deployment) {
        fail({
          code: "DEPLOYMENT_NOT_FOUND",
          message: `Deployment not found: ${command.payload.deploymentId}`,
          category: "not_found",
        });
      }
      return runCommandPipeline(ports, command, {
        name: "RollbackDeployment",
        workspaceId: deployment.workspaceId,
        policy: CanRollbackDeployment,
        useIdempotency: true,
        execute: async () => {
          const current = await ports.uow.deployments.getById(command.payload.deploymentId);
          if (!current) {
            fail({
              code: "DEPLOYMENT_NOT_FOUND",
              message: `Deployment not found: ${command.payload.deploymentId}`,
              category: "not_found",
            });
          }
          const live = { ...current, status: "live" as const };
          const { deployment: next, events } = rollbackDeployment(live, ports.clock.now());
          await ports.deployment.rollback(next.id);
          await ports.uow.deployments.save(next);
          await ports.uow.events.append(events);
          return toDeploymentStatus(next);
        },
      });
    },
  };

  return [
    createWorkspace,
    createVenture,
    createMission,
    updateMissionIntentHandler,
    approveMissionPlanHandler,
    pauseMissionHandler,
    resumeMissionHandler,
    cancelMissionHandler,
    requestDecisionHandler,
    resolveDecisionHandler,
    planOutputHandler,
    generateOutputHandler,
    requestOutputChangeHandler,
    approveOutputHandler,
    generateCodebaseHandler,
    requestCodeChangeHandler,
    approveCodebaseHandler,
    startBuildHandler,
    stopBuildHandler,
    retryBuildHandler,
    createPreviewHandler,
    stopPreviewHandler,
    createReleaseHandler,
    approveReleaseHandler,
    requestDeploymentHandler,
    approveDeploymentHandler,
    rollbackDeploymentHandler,
  ];
}
