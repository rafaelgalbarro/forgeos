import type { ProductPRD, ProductPRDRequest } from "../types/product";

export function buildMockProductPRD(input: ProductPRDRequest): ProductPRD {
  const research = input.researchReport;
  const hasResearch = Boolean(research);

  const executiveSummary = hasResearch
    ? `${input.projectName} es una aplicación ${input.appType} para ${input.targetCustomer}. ${research!.marketSummary.slice(0, 220)}${research!.marketSummary.length > 220 ? "…" : ""}`
    : `${input.projectName} es una aplicación ${input.appType} diseñada para ${input.targetCustomer}. ${input.description.slice(0, 200)}${input.description.length > 200 ? "…" : ""}`;

  const problemStatement = hasResearch
    ? `${input.targetCustomer} enfrenta fricciones descritas en la investigación: ${research!.marketRisks[0] ?? "dolor operativo recurrente (hipótesis)"}.`
    : `${input.targetCustomer} enfrenta fricciones operativas y falta de herramientas especializadas para el caso de uso descrito.`;

  const valueProposition = hasResearch
    ? research!.differentiationAngles[0] ??
      `Resolver el job-to-be-done principal con un MVP ${input.appType} enfocado.`
    : `Centralizar y automatizar el flujo principal con una experiencia ${input.appType} intuitiva.`;

  const mvpScope = hasResearch
    ? [
        "Auth + onboarding mínimo",
        ...research!.validationPlan.slice(0, 2).map((v) => `Validar: ${v}`),
        ...(research!.differentiationAngles[0]
          ? [`Core wedge: ${research!.differentiationAngles[0]}`]
          : ["Flujo principal end-to-end"]),
        "Dashboard con métrica north-star",
      ].slice(0, 6)
    : [
        "Registro e inicio de sesión",
        "Onboarding guiado",
        "Flujo principal de valor",
        "Panel con métricas clave",
        "Configuración de cuenta",
      ];

  const v2Features = hasResearch
    ? [
        ...research!.opportunities.slice(0, 2).map((o) => `Expandir: ${o}`),
        "Integraciones externas",
        "Colaboración en equipo",
        "Informes avanzados",
      ]
    : [
        "Integraciones con herramientas externas",
        "Exportación e informes avanzados",
        "Plan de equipo y colaboración",
        "Notificaciones inteligentes",
        "API pública para partners",
      ];

  const risks = hasResearch
    ? [...research!.marketRisks, "Complejidad de adopción del MVP (hipótesis)"]
    : [
        "Adopción inicial lenta sin canal definido",
        "Complejidad del flujo core",
        "Dependencia de integraciones futuras",
      ];

  const assumptions = hasResearch
    ? [
        ...research!.targetSegments.slice(0, 2).map((s) => `Segmento viable: ${s}`),
        ...research!.recommendedNextQuestions.slice(0, 2).map((q) => `Por validar: ${q}`),
      ]
    : [
        "El dolor es lo suficientemente frecuente para retención semanal",
        "Los usuarios pagarán por ahorro de tiempo medible",
      ];

  const successMetrics = hasResearch
    ? [
        "Completar plan de validación en 30 días",
        "Activación D7 > 35% (hipótesis)",
        ...research!.opportunities.slice(0, 2).map((o) => `Señal temprana: ${o}`),
      ]
    : [
        "Activación D7 > 35%",
        "Retención M1 > 40%",
        "Tiempo hasta primer valor < 5 min",
        "Conversión free-to-paid > 8%",
      ];

  const roadmap30 = hasResearch
    ? research!.validationPlan.slice(0, 3)
    : ["Definir arquitectura y diseño base", "Implementar auth y onboarding", "Desarrollar flujo core del MVP"];

  return {
    executiveSummary,
    problemStatement,
    targetCustomer: input.targetCustomer,
    valueProposition,
    mvpScope,
    v2Features,
    userStories: [
      `Como ${input.targetCustomer}, quiero completar el flujo principal para obtener valor inmediato.`,
      "Como usuario nuevo, quiero onboarding claro en menos de 5 minutos.",
      "Como admin, quiero ver si el producto está funcionando con una métrica clave.",
    ],
    mainScreens: [
      "Landing / marketing",
      "Login y registro",
      "Onboarding",
      "Dashboard principal",
      "Flujo core",
      "Perfil y ajustes",
    ],
    coreFlows: hasResearch
      ? [
          "Descubrimiento → registro → primer valor",
          `Wedge: ${research!.differentiationAngles[0] ?? "job principal"}`,
        ]
      : ["Descubrimiento → registro → onboarding → acción core → resultado"],
    assumptions,
    risks,
    successMetrics,
    roadmap30_60_90: {
      day30: roadmap30,
      day60: hasResearch
        ? ["Iterar según entrevistas", "Refinar MVP según métricas", "Preparar beta cerrada"]
        : ["Dashboard y métricas", "QA con usuarios beta", "Deploy en staging"],
      day90: hasResearch
        ? ["Lanzamiento controlado", "Medir métricas de éxito definidas", "Decidir expansión v2"]
        : ["Landing y pricing", "Lanzamiento público", "Iteración por activación"],
    },
  };
}
