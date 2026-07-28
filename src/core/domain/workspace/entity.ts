/**
 * Workspace aggregate — org isolation root.
 * PROGRAM 6010
 */

import {
  asWorkspaceId,
  type FounderId,
  type WorkspaceId,
} from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  nowTimestamp,
  type IsoTimestamp,
  type SchemaVersion,
} from "../shared/value-objects";

export type WorkspaceStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type WorkspaceProps = Readonly<{
  id: WorkspaceId;
  name: string;
  slug: string;
  ownerFounderId: FounderId;
  status: WorkspaceStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateWorkspaceInput = Readonly<{
  id: string;
  name: string;
  slug: string;
  ownerFounderId: FounderId;
  metadata?: Record<string, string | number | boolean | null>;
  now?: IsoTimestamp;
}>;

function normalizeSlug(slug: string): Result<string, DomainError> {
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(s) && !/^[a-z0-9]{2,64}$/.test(s)) {
    return err(DomainError.validation("Workspace slug must be 2–64 chars [a-z0-9-]"));
  }
  return ok(s);
}

export class Workspace {
  private constructor(readonly props: WorkspaceProps) {}

  get id(): WorkspaceId {
    return this.props.id;
  }

  static create(input: CreateWorkspaceInput): Result<Workspace, DomainError> {
    const name = input.name.trim();
    if (!name) {
      return err(DomainError.invariant("Workspace", "Name is required"));
    }
    const slugR = normalizeSlug(input.slug);
    if (!slugR.ok) return slugR;
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Workspace({
        id: asWorkspaceId(input.id),
        name,
        slug: slugR.value,
        ownerFounderId: input.ownerFounderId,
        status: "ACTIVE",
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(input.metadata ?? {}),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: WorkspaceProps): Workspace {
    return new Workspace(props);
  }

  rename(name: string, now: IsoTimestamp = nowTimestamp()): Result<Workspace, DomainError> {
    const n = name.trim();
    if (!n) return err(DomainError.invariant("Workspace", "Name is required"));
    if (this.props.status === "ARCHIVED") {
      return err(DomainError.invariant("Workspace", "Cannot rename archived workspace"));
    }
    return ok(
      new Workspace({
        ...this.props,
        name: n,
        updatedAt: now,
      })
    );
  }

  transitionStatus(
    status: WorkspaceStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Workspace, DomainError> {
    const allowed: Record<WorkspaceStatus, WorkspaceStatus[]> = {
      ACTIVE: ["SUSPENDED", "ARCHIVED"],
      SUSPENDED: ["ACTIVE", "ARCHIVED"],
      ARCHIVED: [],
    };
    if (!allowed[this.props.status].includes(status)) {
      return err(DomainError.invalidTransition("Workspace", this.props.status, status));
    }
    return ok(new Workspace({ ...this.props, status, updatedAt: now }));
  }

  toSnapshot(): WorkspaceProps {
    return this.props;
  }
}
