"use strict";exports.id=2973,exports.ids=[2973],exports.modules={9790:(a,b,c)=>{c.d(b,{E:()=>i});var d=c(6282),e=c(43835),f=c(54287);let g="Pendiente de completar";function h(a,b=g){return a?.length?a.map(a=>`- ${a}`).join("\n"):b}function i(a,b,c){let i=a.productPRD,j=a.researchReport,k=a.ventureSimulatorResult??(0,f.zL)((0,f.tf)(a)),l=i?`## PRD
Resumen: ${i.executiveSummary}
Problema: ${i.problemStatement}
Propuesta de valor: ${i.valueProposition}
Cliente: ${i.targetCustomer}
MVP Scope:
${h(i.mvpScope)}
User Stories:
${h(i.userStories?.slice(0,8))}
Assumptions:
${h(i.assumptions?.slice(0,6))}
Riesgos producto:
${h(i.risks?.slice(0,5))}`:`## PRD
${g}`,m=j?`## Research
Mercado: ${j.marketSummary}
Segmentos: ${j.targetSegments.join(", ")||g}
Competidores: ${j.competitors.map(a=>a.name).join(", ")||g}
Diferenciaci\xf3n:
${h(j.differentiationAngles)}
Oportunidades:
${h(j.opportunities?.slice(0,5))}`:`## Research
${g}`,n=(0,d.s1)(a.discoveryContext??null),o=k?`## Venture Simulator
Venture Score: ${k.ventureScore}/100
Recomendaci\xf3n: ${k.recommendationLabel}
Confianza: ${k.confidence}
Siguiente acci\xf3n: ${k.suggestedNextAction}
Escenario base — usuarios A1: ${k.scenarios.find(a=>"base"===a.scenario)?.year1Users??g}`:`## Venture Simulator
${g}`,p=(0,e.l)("product");return{ventureName:a.name,ideaText:a.ideaText,prdBlock:l,researchBlock:m,discoveryBlock:n,simulatorBlock:o,brainBlock:p,mvpScope:h(i?.mvpScope),screens:h(i?.mainScreens),coreFlows:h(i?.coreFlows),stackSummary:b,implementationOrder:c.map((a,b)=>`${b+1}. ${a}`).join("\n")}}},43835:(a,b,c)=>{c.d(b,{w:()=>l,l:()=>k});let d=`PRINCIPIOS FORGEOS:
- Claridad antes de construir: Discovery e Intelligence preceden al build.
- El usuario decide; ForgeOS recomienda sin bloquear.
- Honestidad epist\xe9mica: no inventar TAM, market share ni funding; marcar "hip\xf3tesis" y "por validar".
- Prioridad de contexto: Discovery del usuario > Research > heur\xedsticas > Knowledge gen\xe9rico.
- MVP peque\xf1o (4-8 semanas, m\xe1x. 5-7 items en mvpScope).
- Fallback graceful: sin API key, mock estructurado.
- Actuar como cofundador digital: desafiar ideas d\xe9biles, proponer alternativas.`,e=`SISTEMA DE DECISI\xd3N:
Recomendaciones posibles: Build, Build small MVP, Pivot, Research more, Do not build yet.
Se\xf1ales positivas: Discovery completo, research con oportunidades, MVP acotado, stance proceed.
Se\xf1ales negativas: marketplace sin wedge, competencia alta, stance challenge, riesgos altos m\xfaltiples.
Confianza = riqueza de contexto (Intelligence + Discovery + Research), no probabilidad estad\xedstica.
El usuario puede construir aunque la recomendaci\xf3n sea negativa.`,f=`DISCOVERY:
Objetivo: convertir ambig\xfcedad en decisiones expl\xedcitas antes de c\xf3digo.
Preguntas single/multiple/free_text priorizadas por impacto.
discoveryContext tiene prioridad sobre tags autom\xe1ticos en Research y Product.
Respuestas refuerzan C2C, monetizaci\xf3n, vertical, pagos en plataforma, etc.`,g=`SCORES:
Startup Score (0-100): viabilidad textual r\xe1pida — tags, advisor stance, discovery.
Venture Score: compuesto con Discovery, Research, Product, penalizaciones competencia/complejidad.
Discovery Score: claridad de definici\xf3n, no viabilidad de mercado.
Los scores orientan; no son veredictos financieros.`,h=`VENTURE SIMULATOR:
Proyecta escenarios conservador/base/optimista con usuarios, ingresos, CAC, LTV, churn, break-even.
Heur\xedstico — no sustituye modelos financieros ni entrevistas con usuarios.
Usa ideaText, discoveryContext, intelligenceReport y artefactos opcionales.
Overrides del usuario marcan "custom assumptions".`,i=`REGLAS DE CALIDAD:
- JSON v\xe1lido en Research/Product sin markdown extra.
- assumptions y risks expl\xedcitos en PRD.
- Distinguir source ai vs mock.
- Insights accionables para fundador pre-MVP.
- No duplicar claims contradictorios entre capas.`,j={research:[d,f,`RESEARCH WORKER:
Investigar mercado y competencia con incertidumbre expl\xedcita.
Priorizar differentiationAngles y validationPlan accionables.
Competidores como hip\xf3tesis cualitativas, no datos financieros inventados.`,i,g],product:[d,f,`PRODUCT WORKER:
PRD accionable en espa\xf1ol; Research como contexto principal si existe.
MVP m\xednimo validable; userStories y coreFlows concretos.
successMetrics medibles con pocos usuarios.`,i,h],founder:[d,`FOUNDER ADVISOR:
Stances: challenge (desafiar), caution (precauci\xf3n), proceed (avanzar).
Debe nombrar riesgos concretos, oportunidades y alternativas con mayor probabilidad de \xe9xito.
Preguntas inc\xf3modas: qui\xe9n paga, primeros 50 usuarios, por qu\xe9 no WhatsApp/Excel.
No validar por defecto en mercados hostiles (marketplace C2C generalista).`,f,e],ceo:[d,e,g,h,i]};function k(a){let b=j[a]??[d];return`FORGEOS BRAIN CONTEXT v0.1
Brain Context define c\xf3mo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.

${b.join("\n\n")}`}function l(a){let b=k(a);return b.trim().length>0?b:""}},49250:(a,b,c)=>{c.d(b,{s:()=>f,u:()=>e});var d=c(54766);function e(a){let{isMarketplace:b,isB2B:c}=(0,d.QF)(a.ideaText),e=a.discoveryContext?.trustAndSafetyHints?.some(a=>/pago/i.test(a))??!1,f=a.productPRD,g=[{id:"auth",task:"Autenticaci\xf3n (email/OAuth) y sesi\xf3n",phase:"Fundaci\xf3n",priority:"alta"},{id:"schema",task:"Esquema de base de datos y migraciones iniciales",phase:"Fundaci\xf3n",priority:"alta"},{id:"landing",task:"Landing page con propuesta de valor clara",phase:"Fundaci\xf3n",priority:"alta"}];return b&&g.push({id:"listings",task:"CRUD de anuncios/listings con im\xe1genes",phase:"Core",priority:"alta"},{id:"search",task:"B\xfasqueda y filtros b\xe1sicos",phase:"Core",priority:"alta"},{id:"messaging",task:"Mensajer\xeda o contacto entre usuarios",phase:"Core",priority:"media"}),c&&g.push({id:"org",task:"Multi-tenant o equipos/organizaciones",phase:"Core",priority:"alta"},{id:"billing",task:"Facturaci\xf3n B2B / planes",phase:"Monetizaci\xf3n",priority:"media"}),e&&g.push({id:"payments",task:"Integraci\xf3n de pagos (Stripe) y webhooks",phase:"Monetizaci\xf3n",priority:"alta"},{id:"disputes",task:"Flujo b\xe1sico de disputas/reembolsos",phase:"Monetizaci\xf3n",priority:"media"}),f?.mvpScope?.length?f.mvpScope.slice(0,5).forEach((a,b)=>{g.push({id:`mvp-${b}`,task:a,phase:"MVP",priority:"alta"})}):g.push({id:"mvp-core",task:"Flujo principal del producto (happy path)",phase:"MVP",priority:"alta"}),g.push({id:"metrics",task:"Eventos analytics m\xednimos (signup, conversi\xf3n core)",phase:"Validaci\xf3n",priority:"media"},{id:"deploy",task:"Deploy staging + smoke tests",phase:"Validaci\xf3n",priority:"alta"},{id:"legal",task:"T\xe9rminos, privacidad y cookies b\xe1sicos",phase:"Validaci\xf3n",priority:"baja"}),g}function f(a){let b=[],c=a.intelligenceReport,{isMarketplace:e}=(0,d.QF)(a.ideaText);return c?.risks?.slice(0,2).forEach(a=>b.push(`${a.title}: ${a.description}`)),a.discoveryContext?.buildConstraints?.forEach(a=>b.push(a)),e&&(b.push("Cold start: necesitas densidad local antes de escalar features"),b.push("Moderaci\xf3n de contenido y fraude en listings")),a.discoveryContext?.trustAndSafetyHints?.some(a=>/pago/i.test(a))&&b.push("Complejidad PCI/compliance al integrar pagos"),(c?.technicalComplexity?.toLowerCase()??"").includes("alta")&&b.push("Alcance t\xe9cnico elevado — riesgo de retrasar MVP"),0===b.length&&b.push("Validar supuestos t\xe9cnicos antes de comprometer arquitectura distribuida"),[...new Set(b)].slice(0,8)}},82973:(a,b,c)=>{c.d(b,{sK:()=>j,Fo:()=>i});var d=c(54766),e=c(9790),f=c(49250);function g(a){return(0,d.QF)(a.ideaText).isMarketplace||"marketplace"===a.category||(a.discoveryContext?.inferredProductType?.toLowerCase().includes("marketplace")??!1)}function h(a){return a.discoveryContext?.trustAndSafetyHints?.some(a=>/pago/i.test(a))??!1}function i(a){let b=function(a){let b=g(a),c=(0,d.QF)(a.ideaText).isB2B||"saas"===a.category,e=h(a),f=[{layer:"Frontend",technology:"Next.js 15 + React + TypeScript",rationale:"SSR/SSG, routing, API routes en un solo repo"},{layer:"Estilos",technology:"Tailwind CSS",rationale:"Velocidad de UI para MVP"},{layer:"Base de datos",technology:b?"PostgreSQL (Supabase o Neon)":"PostgreSQL",rationale:"Relacional para entidades y transacciones"},{layer:"ORM",technology:"Prisma o Drizzle",rationale:"Migraciones tipadas y DX en TypeScript"},{layer:"Auth",technology:"NextAuth / Clerk / Supabase Auth",rationale:"Sesiones y OAuth sin reinventar"}];return e&&f.push({layer:"Pagos",technology:"Stripe (+ Connect si marketplace)",rationale:"Pagos y webhooks; Connect para C2C"}),b&&f.push({layer:"Storage",technology:"S3 / Supabase Storage / Cloudinary",rationale:"Im\xe1genes de listings"},{layer:"B\xfasqueda",technology:"PostgreSQL full-text → Algolia en v2",rationale:"MVP con FTS; escalar b\xfasqueda despu\xe9s"}),c&&f.push({layer:"Email",technology:"Resend / Postmark",rationale:"Transaccional y onboarding"}),f.push({layer:"Deploy",technology:"Vercel + managed Postgres",rationale:"CI/CD simple para MVP"}),f}(a),c=function(a){let b=["Inicializar repo, TypeScript, lint y estructura de carpetas","Configurar base de datos, ORM y migraci\xf3n inicial","Implementar autenticaci\xf3n y modelo User"];return g(a)?b.push("CRUD de listings con upload de im\xe1genes","B\xfasqueda, filtros y p\xe1gina de detalle","Mensajer\xeda b\xe1sica entre usuarios"):b.push("Modelo de dominio core y APIs REST","Pantalla principal del flujo happy-path"),h(a)&&b.push("Integraci\xf3n Stripe checkout + webhooks"),b.push("Landing y onboarding","Eventos analytics m\xednimos","Deploy staging, smoke tests y checklist MVP"),b}(a),i=b.map(a=>`- **${a.layer}:** ${a.technology} — ${a.rationale}`).join("\n"),j=(0,e.E)(a,i,c),k=(0,f.u)(a);return{ventureId:a.id,ventureName:a.name,technicalSummary:function(a){let b=a.intelligenceReport,c=b?.technicalComplexity??"media",d=b?.estimatedMvpTime??"4-8 semanas",e=g(a);return`MVP ${e?"marketplace":a.category} para ${a.targetAudience}. Complejidad t\xe9cnica estimada: ${c}. Ventana de implementaci\xf3n objetivo: ${d}. Enfoque: monolito Next.js con PostgreSQL, entregar flujo principal antes de features secundarias.`}(a),recommendedStack:b,technicalModules:function(a){let b=g(a),c=["auth","users","core-domain","api","ui-shell","analytics-events"];return b&&c.push("listings","search","messaging","reputation","moderation"),h(a)&&c.push("payments","webhooks","transactions"),a.productPRD?.mvpScope?.some(a=>/notif/i.test(a))&&c.push("notifications"),[...new Set(c)]}(a),folderStructure:function(a){let b=a.name.toLowerCase().replace(/\s+/g,"-").slice(0,30);return[`${b}/`,"├── src/","│   ├── app/              # Next.js App Router","│   │   ├── (auth)/","│   │   ├── (dashboard)/","│   │   └── api/","│   ├── components/","│   │   ├── ui/","│   │   └── features/","│   ├── lib/","│   │   ├── db/","│   │   ├── auth/","│   │   └── validators/","│   └── types/","├── prisma/               # schema + migrations","├── public/","├── tests/","└── package.json"]}(a),mainEntities:function(a){let b=g(a),c=["User","Session"];return b?c.push("Listing","Category","Message","Favorite","Report"):c.push("Project","Item"),h(a)&&c.push("Transaction","Payment","Payout"),(0,d.QF)(a.ideaText).isB2B&&c.push("Organization","Membership"),c}(a),apis:function(a){let b=g(a),c=[{method:"POST",path:"/api/auth/*",description:"Autenticaci\xf3n y sesi\xf3n"},{method:"GET",path:"/api/health",description:"Health check"}];return b?c.push({method:"GET",path:"/api/listings",description:"Listar y buscar anuncios"},{method:"POST",path:"/api/listings",description:"Crear anuncio"},{method:"GET",path:"/api/listings/[id]",description:"Detalle de anuncio"},{method:"PATCH",path:"/api/listings/[id]",description:"Actualizar anuncio"},{method:"POST",path:"/api/messages",description:"Enviar mensaje"},{method:"GET",path:"/api/messages",description:"Conversaciones del usuario"}):c.push({method:"GET",path:"/api/items",description:"Recurso principal del dominio"},{method:"POST",path:"/api/items",description:"Crear recurso"}),h(a)&&c.push({method:"POST",path:"/api/checkout",description:"Iniciar pago"},{method:"POST",path:"/api/webhooks/stripe",description:"Webhooks Stripe"}),c}(a),frontendComponents:function(a){let b=a.productPRD,c=["AppShell / Layout","Navbar","AuthForm (login/register)","LoadingState","EmptyState","ErrorBoundary"];return g(a)&&c.push("ListingCard","ListingGrid","ListingForm","SearchFilters","MessageThread","UserAvatar"),b?.mainScreens?.length&&b.mainScreens.slice(0,6).forEach(a=>{let b=a.replace(/\s+/g,"")+"Page";c.some(b=>b.toLowerCase().includes(a.toLowerCase()))||c.push(b)}),[...new Set(c)]}(a),screens:a.productPRD?.mainScreens?.length?a.productPRD.mainScreens:g(a)?["Home / Feed de anuncios","B\xfasqueda y filtros","Detalle de anuncio","Publicar anuncio","Mensajes","Perfil de usuario","Login / Registro"]:["Landing","Dashboard","Flujo principal","Configuraci\xf3n","Login / Registro"],suggestedDependencies:function(a){let b=["next","react","react-dom","typescript","tailwindcss","@prisma/client","prisma","zod","clsx"];return h(a)&&b.push("stripe"),g(a)&&b.push("uploadthing","date-fns"),b.push("next-auth","lucide-react"),b}(a),technicalRisks:(0,f.s)(a),implementationOrder:c,mvpChecklist:k,cursorPrompt:`You are building "${j.ventureName}" — a startup MVP generated by ForgeOS.

## Your role
Act as a senior full-stack engineer using Cursor. Implement a small, shippable MVP in 4-8 weeks. Prefer simple, boring technology. Match existing conventions in the repo if present.

## Product idea
${j.ideaText}

${j.prdBlock}

${j.researchBlock}

---
DISCOVERY CONTEXT (user decisions — highest priority):
${j.discoveryBlock}

${j.simulatorBlock}

---
## Recommended stack
${j.stackSummary}

## MVP scope (build ONLY this first)
${j.mvpScope}

## Screens to implement
${j.screens}

## Core user flows
${j.coreFlows}

## Implementation order
${j.implementationOrder}

---
## ForgeOS Brain Context (how to reason — does not override user/discovery data)
${j.brainBlock}

## Rules
- Do not over-engineer. No microservices for MVP.
- Use TypeScript strict mode. Add minimal tests for critical paths only.
- Mark unverified assumptions as TODO.
- Discovery Context wins over heuristics when they conflict.
- After each milestone, ensure \`npm run build\` passes.

## First task
Scaffold the project structure, database schema for core entities, and authentication. Then implement the primary user flow end-to-end.`,claudePrompt:`I need you to act as my technical cofounder and help me build the MVP for "${j.ventureName}".

## Context
This venture was analyzed and structured by ForgeOS. Use the sections below as source of truth. **Discovery Context** reflects explicit user decisions and has priority over generic heuristics.

## Idea
${j.ideaText}

${j.prdBlock}

${j.researchBlock}

---
## Discovery Context (user decisions — priority)
${j.discoveryBlock}

${j.simulatorBlock}

---
## Technical direction
${j.stackSummary}

## MVP scope
${j.mvpScope}

## Screens
${j.screens}

## Core flows
${j.coreFlows}

## Suggested build sequence
${j.implementationOrder}

---
## ForgeOS Brain Context
${j.brainBlock}

## What I need from you
1. Validate the technical approach for this MVP (call out risks early).
2. Propose a minimal architecture diagram in text (components + data flow).
3. Generate production-ready code incrementally — start with schema + auth + one complete user journey.
4. Flag anything marked "hip\xf3tesis" or "por validar" — do not invent verified market data.
5. Keep scope small: 4-8 weeks, one developer.

## Constraints
- TypeScript preferred for web apps.
- Avoid premature optimization and unnecessary abstractions.
- If payments are in scope, use Stripe with webhooks; plan for disputes later.
- End each response with the next 3 concrete implementation tasks.

Start by summarizing what you understood and your recommended first sprint.`,generatedAt:new Date().toISOString()}}function j(a){return function(a){let b=a.recommendedStack.map(a=>`| ${a.layer} | ${a.technology} | ${a.rationale} |`).join("\n"),c=a.apis.map(a=>`| ${a.method} | \`${a.path}\` | ${a.description} |`).join("\n"),d=a.mvpChecklist.map(a=>`- [ ] **[${a.priority}]** ${a.task} _(${a.phase})_`).join("\n");return`# Build Plan — ${a.ventureName}

> Generado por ForgeOS \xb7 ${a.generatedAt.slice(0,10)} \xb7 Handoff para Cursor / Claude

## Resumen t\xe9cnico

${a.technicalSummary}

## Stack recomendado

| Capa | Tecnolog\xeda | Raz\xf3n |
|------|------------|-------|
${b}

## M\xf3dulos t\xe9cnicos

${a.technicalModules.map(a=>`- ${a}`).join("\n")}

## Estructura de carpetas

\`\`\`
${a.folderStructure.join("\n")}
\`\`\`

## Entidades principales

${a.mainEntities.map(a=>`- ${a}`).join("\n")}

## APIs necesarias

| M\xe9todo | Ruta | Descripci\xf3n |
|--------|------|-------------|
${c}

## Componentes frontend

${a.frontendComponents.map(a=>`- ${a}`).join("\n")}

## Pantallas

${a.screens.map(a=>`- ${a}`).join("\n")}

## Dependencias sugeridas

\`\`\`
${a.suggestedDependencies.join("\n")}
\`\`\`

## Riesgos t\xe9cnicos

${a.technicalRisks.map(a=>`- ${a}`).join("\n")}

## Orden de implementaci\xf3n

${a.implementationOrder.map((a,b)=>`${b+1}. ${a}`).join("\n")}

## Checklist MVP

${d}

---

## Prompt Cursor

\`\`\`
${a.cursorPrompt}
\`\`\`

---

## Prompt Claude

\`\`\`
${a.claudePrompt}
\`\`\`
`}(i(a))}}};