import type { InvitationCode, InvitationRedemption } from "./types";
import { readStorage, writeStorage } from "./storage";
import { markWaitlistInvited, getWaitlistEntry } from "./waitlist";

const CODES_KEY = "forgeos-beta-invitation-codes";
const REDEMPTION_KEY = "forgeos-beta-invitation-redemption";

const DEMO_CODES: InvitationCode[] = [
  {
    code: "FORGE-BETA-2026",
    label: "Sprint 6 demo invite",
    maxUses: 999,
    usedCount: 0,
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    code: "FORGE-FOUNDER-VIP",
    label: "Founder VIP access",
    maxUses: 50,
    usedCount: 0,
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

let memoryCodes: InvitationCode[] = [...DEMO_CODES];
let memoryRedemption: InvitationRedemption | null = null;

function readCodes(): InvitationCode[] {
  if (typeof window === "undefined") return memoryCodes;
  const stored = readStorage<InvitationCode[] | null>(CODES_KEY, null);
  if (stored) memoryCodes = stored;
  return memoryCodes;
}

function writeCodes(codes: InvitationCode[]): void {
  memoryCodes = codes;
  writeStorage(CODES_KEY, codes);
}

function readRedemption(): InvitationRedemption | null {
  if (typeof window === "undefined") return memoryRedemption;
  const stored = readStorage<InvitationRedemption | null>(REDEMPTION_KEY, null);
  if (stored) memoryRedemption = stored;
  return memoryRedemption;
}

function writeRedemption(redemption: InvitationRedemption): void {
  memoryRedemption = redemption;
  writeStorage(REDEMPTION_KEY, redemption);
}

export function listInvitationCodes(): InvitationCode[] {
  return readCodes();
}

export function getInvitationRedemption(): InvitationRedemption | null {
  return readRedemption();
}

export function hasRedeemedInvitation(): boolean {
  return readRedemption() !== null;
}

export function validateInvitationCode(code: string): InvitationCode | null {
  const normalized = code.trim().toUpperCase();
  const found = readCodes().find((c) => c.code === normalized);
  if (!found) return null;
  if (found.status !== "active") return null;
  if (found.usedCount >= found.maxUses) return null;
  if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) return null;
  return found;
}

export function redeemInvitation(code: string, email?: string): {
  success: boolean;
  error?: string;
  redemption?: InvitationRedemption;
} {
  if (readRedemption()) {
    return { success: false, error: "Ya has canjeado un código de invitación." };
  }

  const invitation = validateInvitationCode(code);
  if (!invitation) {
    return { success: false, error: "Código inválido o expirado." };
  }

  const waitlist = getWaitlistEntry();
  const redeemEmail = email?.trim() || waitlist?.email || "beta@forgeos.local";

  const redemption: InvitationRedemption = {
    code: invitation.code,
    email: redeemEmail,
    redeemedAt: new Date().toISOString(),
  };

  const codes = readCodes().map((c) =>
    c.code === invitation.code
      ? {
          ...c,
          usedCount: c.usedCount + 1,
          status: (c.usedCount + 1 >= c.maxUses ? "redeemed" : c.status) as InvitationCode["status"],
          redeemedBy: [...(c.redeemedBy ?? []), redeemEmail],
        }
      : c
  );
  writeCodes(codes);
  writeRedemption(redemption);

  if (waitlist) {
    markWaitlistInvited();
  }

  return { success: true, redemption };
}

export function clearInvitationRedemption(): void {
  memoryRedemption = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(REDEMPTION_KEY);
  }
}
