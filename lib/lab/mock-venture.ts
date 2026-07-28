/** Lab-only mock venture — never reads from portfolio store. */

import type { VentureProject } from "@/lib/domain/venture";

export const LAB_MOCK_VENTURE_ID = "lab-mock-venture-1";

export function createLabMockVenture(): VentureProject {
  const now = new Date().toISOString();

  return {
    id: LAB_MOCK_VENTURE_ID,
    ideaText:
      "Plataforma SaaS de gestión de flotas eléctricas para pymes logísticas en España.",
    name: "FleetPulse Lab",
    description:
      "Venture de laboratorio para probar Executive Runtime sin tocar el portfolio real.",
    category: "saas",
    targetAudience: "Pymes logísticas con flotas de 5–50 vehículos eléctricos",
    status: "intelligence",
    createdAt: now,
    updatedAt: now,
    intelligenceReport: null,
    analysis: null,
    founderAdvisor: null,
    sections: [],
    discoveryContext: {
      clarifiedDecisions: ["Modelo B2B SaaS", "Mercado España"],
      remainingQuestions: ["Definir pricing por vehículo"],
      inferredProductType: "SaaS B2B",
      inferredBusinessModel: "Suscripción mensual por vehículo",
      targetCustomerHints: ["Logística urbana", "Última milla"],
      monetizationHints: ["Por vehículo/mes", "Tier enterprise"],
      trustAndSafetyHints: ["Datos GPS sensibles"],
      platformHints: ["Web dashboard", "App móvil conductor"],
      buildConstraints: ["MVP en 8 semanas"],
      answers: [
        {
          questionId: "q1",
          question: "¿Problema principal?",
          answer: "Falta de visibilidad y optimización de flota eléctrica",
          impacts: ["product"],
          createdAt: now,
        },
        {
          questionId: "q2",
          question: "¿Cliente pagador?",
          answer: "Operador logístico / fleet manager",
          impacts: ["gtm"],
          createdAt: now,
        },
        {
          questionId: "q3",
          question: "¿Canal de adquisición?",
          answer: "Ventas directas B2B",
          impacts: ["gtm"],
          createdAt: now,
        },
      ],
    },
    researchReport: {
      marketSummary: "Mercado de gestión de flotas eléctricas en crecimiento en la UE.",
      targetSegments: ["Pymes logísticas", "Operadores última milla"],
      competitors: [
        {
          name: "Fleetio",
          type: "SaaS internacional",
          strengths: ["Madurez", "Integraciones"],
          weaknesses: ["No especializado en EV", "Precio USD"],
        },
      ],
      marketRisks: ["Competencia de incumbentes", "Regulación energética"],
      opportunities: ["Incentivos EV en España", "ESG reporting"],
      differentiationAngles: ["Especialización EV", "Localización ES"],
      validationPlan: ["10 entrevistas fleet managers", "Landing + waitlist"],
      recommendedNextQuestions: ["Willingness to pay", "Integraciones telematics"],
    },
  };
}
