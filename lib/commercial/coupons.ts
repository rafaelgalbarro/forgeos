/** Program 6000 — Coupons stub */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import { COMMERCIAL_STORAGE_KEYS } from "./config";
import type { CommercialCoupon, CommercialPlanId } from "./types";

const DEFAULT_COUPONS: CommercialCoupon[] = [
  {
    code: "FORGE-LAUNCH-20",
    percentOff: 20,
    planIds: ["pro", "business"],
    validUntil: "2026-12-31",
    maxRedemptions: 1000,
    redemptions: 0,
  },
  {
    code: "FOUNDER-VIP",
    percentOff: 50,
    planIds: ["pro"],
    validUntil: "2026-06-30",
    maxRedemptions: 100,
    redemptions: 0,
  },
];

function readCoupons(): CommercialCoupon[] {
  return readStorage<CommercialCoupon[]>(COMMERCIAL_STORAGE_KEYS.coupons, DEFAULT_COUPONS);
}

function writeCoupons(coupons: CommercialCoupon[]): void {
  writeStorage(COMMERCIAL_STORAGE_KEYS.coupons, coupons);
}

export function listCoupons(): CommercialCoupon[] {
  return readCoupons();
}

export function validateCoupon(
  code: string,
  planId: CommercialPlanId
): { valid: boolean; percentOff: number; message: string } {
  const normalized = code.trim().toUpperCase();
  const coupon = readCoupons().find((c) => c.code === normalized);
  if (!coupon) {
    return { valid: false, percentOff: 0, message: "Cupón no encontrado" };
  }
  if (!coupon.planIds.includes(planId)) {
    return { valid: false, percentOff: 0, message: "Cupón no válido para este plan" };
  }
  if (new Date(coupon.validUntil) < new Date()) {
    return { valid: false, percentOff: 0, message: "Cupón expirado" };
  }
  if (coupon.redemptions >= coupon.maxRedemptions) {
    return { valid: false, percentOff: 0, message: "Cupón agotado" };
  }
  return { valid: true, percentOff: coupon.percentOff, message: `${coupon.percentOff}% de descuento aplicado` };
}

export function redeemCoupon(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  const coupons = readCoupons();
  const idx = coupons.findIndex((c) => c.code === normalized);
  if (idx < 0) return false;
  coupons[idx] = { ...coupons[idx], redemptions: coupons[idx].redemptions + 1 };
  writeCoupons(coupons);
  return true;
}
