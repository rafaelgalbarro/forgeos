/** RC9 — Review engine (mock catalog). */

import type { PackReview } from "./types";

const REVIEWS: PackReview[] = [
  {
    id: "rev-crm-1",
    packId: "eco-pack-crm",
    author: "Carlos R.",
    rating: 5,
    title: "Perfecto para nuestro pipeline",
    body: "Instalamos el CRM Pack en sandbox y el CEO tuvo visibilidad inmediata del pipeline.",
    createdAt: "2026-06-28T10:00:00.000Z",
    verified: true,
  },
  {
    id: "rev-crm-2",
    packId: "eco-pack-crm",
    author: "Laura M.",
    rating: 4,
    title: "Muy completo",
    body: "Las dependencias se resolvieron bien. Falta integración real con Salesforce.",
    createdAt: "2026-06-20T14:30:00.000Z",
    verified: true,
  },
  {
    id: "rev-ai-1",
    packId: "eco-pack-ai-ceo",
    author: "Founder X",
    rating: 5,
    title: "Briefings ejecutivos excelentes",
    body: "El pack de IA para CEO acelera las decisiones diarias.",
    createdAt: "2026-06-15T09:00:00.000Z",
    verified: false,
  },
  {
    id: "rev-plugin-1",
    packId: "eco-plugin-crm-sync",
    author: "Dev Team",
    rating: 4,
    title: "Plugin útil en sandbox",
    body: "Los hooks de sincronización funcionan en modo simulación.",
    createdAt: "2026-07-01T16:00:00.000Z",
    verified: true,
  },
];

export function getReviewsForPack(packId: string): PackReview[] {
  return REVIEWS.filter((r) => r.packId === packId);
}

export function getReviewById(id: string): PackReview | undefined {
  return REVIEWS.find((r) => r.id === id);
}

export function getAverageRating(packId: string): number {
  const reviews = getReviewsForPack(packId);
  if (reviews.length === 0) return 0;
  return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
}

export function submitReview(
  review: Omit<PackReview, "id" | "createdAt">
): PackReview {
  return {
    ...review,
    id: `rev-draft-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}
