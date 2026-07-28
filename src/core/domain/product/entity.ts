/**
 * Product aggregate — product identity under a venture.
 * PROGRAM 6010
 */

import {
  asProductId,
  type OutputId,
  type ProductId,
  type VentureId,
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

export type ProductKind =
  | "VENTURE_SUITE"
  | "WEBSITE"
  | "WEB_APPLICATION"
  | "MOBILE_APPLICATION"
  | "BACKEND"
  | "OTHER";

export type ProductStatus = "DRAFT" | "ACTIVE" | "DEPRECATED" | "ARCHIVED";

export type ProductProps = Readonly<{
  id: ProductId;
  workspaceId: WorkspaceId;
  ventureId: VentureId;
  name: string;
  kind: ProductKind;
  status: ProductStatus;
  outputIds: readonly OutputId[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateProductInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  ventureId: VentureId;
  name: string;
  kind: ProductKind;
  now?: IsoTimestamp;
}>;

export class Product {
  private constructor(readonly props: ProductProps) {}

  get id(): ProductId {
    return this.props.id;
  }

  static create(input: CreateProductInput): Result<Product, DomainError> {
    const name = input.name.trim();
    if (!name) return err(DomainError.invariant("Product", "name required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Product({
        id: asProductId(input.id),
        workspaceId: input.workspaceId,
        ventureId: input.ventureId,
        name,
        kind: input.kind,
        status: "DRAFT",
        outputIds: [],
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: ProductProps): Product {
    return new Product(props);
  }

  attachOutput(outputId: OutputId, now: IsoTimestamp = nowTimestamp()): Product {
    if (this.props.outputIds.includes(outputId)) return this;
    return new Product({
      ...this.props,
      outputIds: [...this.props.outputIds, outputId],
      updatedAt: now,
    });
  }

  activate(now: IsoTimestamp = nowTimestamp()): Result<Product, DomainError> {
    if (this.props.status === "ARCHIVED") {
      return err(DomainError.invalidTransition("Product", this.props.status, "ACTIVE"));
    }
    return ok(new Product({ ...this.props, status: "ACTIVE", updatedAt: now }));
  }

  toSnapshot(): ProductProps {
    return this.props;
  }
}
