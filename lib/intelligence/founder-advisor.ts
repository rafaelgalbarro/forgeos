import type { DiscoveryContext } from "@/lib/discovery/types";
import { getDiscoveryFounderRecommendations } from "@/lib/discovery/discovery-intelligence";
import type { FounderAdvisorOutput, IntelligenceOpportunity, IntelligenceRisk } from "./types";
import { classifyIdea } from "./heuristics";
import { getIntelligenceKnowledgeHints } from "./knowledge-context";

function risk(title: string, description: string, severity: IntelligenceRisk["severity"]): IntelligenceRisk {
  return { title, description, severity };
}

function opp(title: string, description: string, probability: IntelligenceOpportunity["probability"]): IntelligenceOpportunity {
  return { title, description, probability };
}

type AdvisorBase = Omit<FounderAdvisorOutput, "questions">;

function buildAdvisorQuestions(ideaText: string, advisor: AdvisorBase): string[] {
  const { isMarketplace, isB2B } = classifyIdea(ideaText);
  const questions: string[] = [
    "¿Quién paga por este producto y cuánto estaría dispuesto a pagar?",
    "¿Cuál es el único problema que resuelves en la v1?",
    "¿Cómo conseguirás los primeros 50 usuarios sin gastar en ads?",
  ];

  if (isMarketplace) {
    questions.push("¿Qué lado del mercado activas primero: oferta o demanda?");
    questions.push("¿Por qué no usarían WhatsApp o Excel en su lugar?");
  }

  if (isB2B) {
    questions.push("¿Cuál es el ciclo de venta esperado y quién firma el contrato?");
  }

  if (advisor.stance === "challenge") {
    questions.push("¿Qué evidencia tienes de que este modelo funciona mejor que las alternativas?");
  }

  if (ideaText.length < 60) {
    questions.push("¿Puedes describir el flujo principal del usuario en 3 pasos?");
  }

  return questions.slice(0, 5);
}

function finalize(
  ideaText: string,
  advisor: AdvisorBase,
  discoveryContext?: DiscoveryContext | null
): FounderAdvisorOutput {
  const hints = getIntelligenceKnowledgeHints(ideaText);
  const discoveryRecs = getDiscoveryFounderRecommendations(discoveryContext ?? null);
  const mergedRecommendations = [
    ...advisor.recommendations,
    ...hints.recommendations,
    ...discoveryRecs,
  ].slice(0, 4);

  return {
    ...advisor,
    recommendations: mergedRecommendations,
    questions: buildAdvisorQuestions(ideaText, advisor),
  };
}

export function runFounderAdvisor(
  ideaText: string,
  discoveryContext?: DiscoveryContext | null
): FounderAdvisorOutput {
  return finalize(ideaText, runFounderAdvisorCore(ideaText), discoveryContext);
}

function runFounderAdvisorCore(ideaText: string): AdvisorBase {
  const { isMarketplace, isB2B, isPadel, isFood, isPublicAid } = classifyIdea(ideaText);

  if (isPadel && isMarketplace) {
    return {
      headline: "He analizado tu idea de marketplace para pádel",
      summary:
        "El mercado del pádel crece, pero un marketplace de reservas compite directamente con Playtomic. No te voy a decir que es mala idea — te digo que el modelo tiene riesgos que debes entender antes de invertir.",
      stance: "challenge",
      risks: [
        risk("Efecto red bilateral", "Necesitas clubes y jugadores a la vez. Sin densidad local, el producto no funciona.", "alta"),
        risk("Competencia consolidada", "Playtomic domina reservas. Diferenciarte solo con 'más pistas' no basta.", "alta"),
        risk("Monetización débil", "Comisión por reserva compite con márgenes ajustados de clubes.", "media"),
      ],
      opportunities: [
        opp("SaaS de gestión para clubes", "Software de torneos, CRM y gestión con ingresos recurrentes.", "alta"),
        opp("Marketplace B2B de entrenadores", "Conectar coaches con clubes. Ticket medio más alto.", "media"),
      ],
      alternatives: [
        { title: "Reservas para entrenadores privados", description: "Plataforma para coaches independientes.", rationale: "Un solo lado del mercado al inicio — menos cold start." },
        { title: "SaaS de torneos y ligas", description: "Organización de ligas amateur con rankings.", rationale: "Retención recurrente y viralidad intra-club." },
        { title: "Marketplace de material", description: "Compra-venta de palas y equipamiento.", rationale: "Sin coordinar disponibilidad de pistas." },
      ],
      recommendations: [
        { text: "Valida con 5 clubes si pagarían por SaaS de gestión antes de construir marketplace.", reason: "Reduce riesgo de efecto red y genera MRR temprano." },
        { text: "Define un wedge geográfico: un barrio o ciudad, no España entera.", reason: "Los marketplaces locales ganan por densidad, no por cobertura." },
        { text: "Compara las 3 alternativas antes de comprometerte con el modelo Airbnb.", reason: "Puede existir un camino con mayor probabilidad de éxito." },
      ],
      shouldCompare: true,
    };
  }

  if (isFood) {
    return {
      headline: "Sector alimentario: potencial real, retención difícil",
      summary: "El desperdicio alimentario es un problema genuino, pero las apps B2C de alimentación tienen retención brutal. Te propongo repensar el wedge.",
      stance: "caution",
      risks: [
        risk("Retención D30 baja", "Apps de cocina se abandonan en la primera semana.", "alta"),
        risk("Datos de productos", "Catálogo de caducidades requiere integraciones costosas.", "media"),
        risk("Monetización B2C", "Usuarios no pagan por apps de cocina sin valor inmediato.", "media"),
      ],
      opportunities: [
        opp("B2B para supermercados", "Reducir mermas con dashboard de caducidades.", "alta"),
        opp("Wedge familiar", "Familias con hijos — dolor más frecuente y medible.", "media"),
      ],
      alternatives: [
        { title: "B2B para restaurantes", description: "Control de stock y mermas en hostelería.", rationale: "Ticket más alto, dolor diario." },
        { title: "Newsletter + recetas IA", description: "Validar demanda sin app completa.", rationale: "Coste casi cero." },
      ],
      recommendations: [
        { text: "Considera B2B antes de B2C.", reason: "Mayor willingness to pay y menor churn." },
        { text: "Define un único job: ¿ahorrar dinero, reducir desperdicio, o planificar comidas?", reason: "Un MVP necesita un solo job-to-be-done." },
      ],
      shouldCompare: true,
    };
  }

  if (isPublicAid) {
    return {
      headline: "Ayudas públicas: demanda real, riesgo legal alto",
      summary: "La complejidad administrativa crea oportunidad, pero la responsabilidad por información incorrecta es un riesgo que no puedes ignorar.",
      stance: "challenge",
      risks: [
        risk("Responsabilidad legal", "Información incorrecta genera reclamaciones graves.", "alta"),
        risk("Datos fragmentados", "Cada autonomía publica de forma distinta.", "alta"),
        risk("Estacionalidad", "Uso ligado a convocatorias, no diario.", "media"),
      ],
      opportunities: [
        opp("Copiloto para gestorías", "Vender a profesionales que gestionan múltiples clientes.", "alta"),
        opp("Alertas por perfil", "Notificaciones cuando hay ayudas aplicables.", "media"),
      ],
      alternatives: [
        { title: "SaaS para gestorías", description: "Herramienta B2B para asesores fiscales.", rationale: "Menor riesgo legal, mayor precio." },
        { title: "Nicho sectorial", description: "Solo agricultura o renovables.", rationale: "Datos acotados y verificables." },
      ],
      recommendations: [
        { text: "No lances B2C sin asesor legal especializado.", reason: "El riesgo de responsabilidad es desproporcionado." },
        { text: "Habla con 10 gestorías antes de escribir código.", reason: "Valida willingness to pay y workflow real." },
      ],
      shouldCompare: true,
    };
  }

  if (isMarketplace) {
    return {
      headline: "Modelo marketplace detectado — necesitas un wedge",
      summary: "Los marketplaces son seductores pero el cold start mata al 90% de los proyectos. No voy a validar esta idea sin cuestionar el modelo.",
      stance: "challenge",
      risks: [
        risk("Cold start", "Sin oferta y demanda simultánea, no funciona.", "alta"),
        risk("Take rate vs CAC", "Comisiones bajas no cubren adquisición.", "alta"),
        risk("Desintermediación", "Usuarios saltan la plataforma tras el primer contacto.", "media"),
      ],
      opportunities: [
        opp("Vertical específico", "Dominar un nicho pequeño primero.", "alta"),
        opp("SaaS para supply-side", "Software para proveedores + marketplace.", "alta"),
      ],
      alternatives: [
        { title: "Directorio con leads premium", description: "Sin transacción, solo leads cualificados.", rationale: "Menor complejidad operativa." },
        { title: "SaaS + marketplace", description: "Ingresos recurrentes desde día uno.", rationale: "No dependes solo de volumen." },
      ],
      recommendations: [
        { text: "Define tu wedge: ¿qué barrio, sector o tipo de usuario?", reason: "Sin wedge, el marketplace no arranca." },
        { text: "Empieza por un lado del mercado, no ambos.", reason: "Supply-first o demand-first — nunca ambos a la vez." },
      ],
      shouldCompare: true,
    };
  }

  return {
    headline: "He analizado tu idea — hay trabajo que hacer",
    summary: isB2B
      ? "B2B suele tener mejor unit economics, pero necesitas un dolor específico y medible. Tu descripción aún es amplia."
      : "Tu idea tiene elementos interesantes, pero necesita más afilado antes de construir. No te voy a decir 'buena idea' — te voy a ayudar a mejorarla.",
    stance: "caution",
    risks: [
      risk("Propuesta difusa", "El MVP necesita un único job-to-be-done claro.", "media"),
      risk("Competencia genérica", "Sin ángulo único, compites por precio.", "media"),
      risk("Alcance amplio", "Más features = más tiempo sin validar.", "media"),
    ],
    opportunities: [
      opp("Nicho vertical", "Especializarte reduce competencia.", "alta"),
      opp("Modelo híbrido", "SaaS + servicios para ingresos tempranos.", "media"),
    ],
    alternatives: [
      { title: "MVP de una funcionalidad", description: "Solo el core job en 4 semanas.", rationale: "Validar antes de la visión completa." },
      { title: "Landing + waitlist", description: "Medir interés sin desarrollar.", rationale: "Datos reales, coste cero." },
    ],
    recommendations: [
      { text: "Afilá el problema a un usuario concreto con dolor medible.", reason: "Sin esto, el producto no encuentra mercado." },
      { text: "Habla con 10 usuarios potenciales esta semana.", reason: "Validación > construcción." },
    ],
    shouldCompare: ideaText.length > 80,
  };
}
