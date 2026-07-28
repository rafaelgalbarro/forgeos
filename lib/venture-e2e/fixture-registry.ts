/** Program 10000 — Generic venture fixture resolution (no venture-specific logic). */

import type { VentureProject } from "@/lib/domain/venture";
import {
  VANDL_VENTURE,
  VANDL_VENTURE_ID,
  VANDL_VENTURE_ALIAS,
} from "@/lib/fixtures/vandl-venture";
import {
  AUREA_FACILITIES_VENTURE,
  AUREA_FACILITIES_VENTURE_ID,
  AUREA_FACILITIES_ALIAS,
} from "@/lib/fixtures/aurea-facilities-venture";
import {
  NEXORA_FIELD_VENTURE,
  NEXORA_FIELD_VENTURE_ID,
  NEXORA_FIELD_ALIAS,
} from "@/lib/fixtures/nexora-field-venture";
import { getVentureById, saveVenture } from "@/lib/store/ventures";

export interface VentureFixtureEntry {
  id: string;
  slug: string;
  venture: VentureProject;
}

const FIXTURE_ENTRIES: VentureFixtureEntry[] = [
  { id: VANDL_VENTURE_ID, slug: VANDL_VENTURE_ALIAS, venture: VANDL_VENTURE },
  {
    id: AUREA_FACILITIES_VENTURE_ID,
    slug: AUREA_FACILITIES_ALIAS,
    venture: AUREA_FACILITIES_VENTURE,
  },
  {
    id: NEXORA_FIELD_VENTURE_ID,
    slug: NEXORA_FIELD_ALIAS,
    venture: NEXORA_FIELD_VENTURE,
  },
];

const byId = new Map<string, VentureFixtureEntry>();
const bySlug = new Map<string, VentureFixtureEntry>();

for (const entry of FIXTURE_ENTRIES) {
  byId.set(entry.id, entry);
  bySlug.set(entry.slug, entry);
  bySlug.set(entry.id, entry);
}

/** Required venture fields before E2E / build-context can run safely. */
export function isValidVentureProject(venture: VentureProject | null | undefined): venture is VentureProject {
  if (!venture) return false;
  return Boolean(
    venture.id?.trim() &&
      venture.name?.trim() &&
      venture.ideaText?.trim() &&
      Array.isArray(venture.sections)
  );
}

export function listVentureFixtures(): VentureFixtureEntry[] {
  return [...FIXTURE_ENTRIES];
}

function fixtureFromStored(stored: VentureProject, slugHint?: string): VentureFixtureEntry {
  const match =
    byId.get(stored.id) ?? FIXTURE_ENTRIES.find((e) => e.venture.name === stored.name);
  return {
    id: stored.id,
    slug: slugHint ?? match?.slug ?? stored.id,
    venture: stored,
  };
}

export function resolveVentureFixture(idOrSlug: string): VentureFixtureEntry | undefined {
  const fixtureMatch = byId.get(idOrSlug) ?? bySlug.get(idOrSlug);

  if (fixtureMatch && isValidVentureProject(fixtureMatch.venture)) {
    return fixtureMatch;
  }

  const stored =
    getVentureById(idOrSlug) ??
    (fixtureMatch ? getVentureById(fixtureMatch.id) : undefined);

  if (stored && isValidVentureProject(stored)) {
    return fixtureFromStored(stored, fixtureMatch?.slug);
  }

  return undefined;
}

export function resolveVentureProject(idOrSlug: string): VentureProject | undefined {
  const fixture = resolveVentureFixture(idOrSlug);
  return fixture && isValidVentureProject(fixture.venture) ? fixture.venture : undefined;
}

/** Seed canonical fixture venture into localStorage when missing (client only). */
export function ensureFixtureVentureSeeded(idOrSlug: string): void {
  if (typeof window === "undefined") return;
  const fixture = byId.get(idOrSlug) ?? bySlug.get(idOrSlug);
  if (!fixture || !isValidVentureProject(fixture.venture)) return;
  if (!getVentureById(fixture.venture.id)) {
    saveVenture(fixture.venture);
  }
}
