/**
 * Founder — minimal identity/profile for workspace ownership.
 * PROGRAM 6010
 */

import { asFounderId, type FounderId, type WorkspaceId } from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  nowTimestamp,
  type IsoTimestamp,
  type SchemaVersion,
} from "../shared/value-objects";

export type FounderProfile = Readonly<{
  displayName: string;
  email?: string;
  timezone?: string;
}>;

export type FounderProps = Readonly<{
  id: FounderId;
  profile: FounderProfile;
  primaryWorkspaceId?: WorkspaceId;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateFounderInput = Readonly<{
  id: string;
  displayName: string;
  email?: string;
  timezone?: string;
  primaryWorkspaceId?: WorkspaceId;
  now?: IsoTimestamp;
}>;

export class Founder {
  private constructor(readonly props: FounderProps) {}

  get id(): FounderId {
    return this.props.id;
  }

  static create(input: CreateFounderInput): Result<Founder, DomainError> {
    const displayName = input.displayName.trim();
    if (!displayName) {
      return err(DomainError.invariant("Founder", "displayName is required"));
    }
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Founder({
        id: asFounderId(input.id),
        profile: {
          displayName,
          email: input.email?.trim() || undefined,
          timezone: input.timezone?.trim() || undefined,
        },
        primaryWorkspaceId: input.primaryWorkspaceId,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: FounderProps): Founder {
    return new Founder(props);
  }

  toSnapshot(): FounderProps {
    return this.props;
  }
}
