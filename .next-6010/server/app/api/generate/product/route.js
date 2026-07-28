(()=>{var a={};a.id=9843,a.ids=[9843],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},14666:(a,b,c)=>{"use strict";c.d(b,{lC:()=>d.l,wS:()=>d.w});var d=c(46076)},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},20376:(a,b,c)=>{"use strict";function d(a,b){return b.some(b=>b.test(a))}function e(a){return a&&0!==a.answers.length?`DECISIONES EXPL\xcdCITAS DEL USUARIO (prioridad sobre heur\xedsticas):
- Tipo de producto inferido: ${a.inferredProductType}
- Modelo de negocio inferido: ${a.inferredBusinessModel}

Decisiones aclaradas:
${a.clarifiedDecisions.map(a=>`- ${a}`).join("\n")}

Monetizaci\xf3n: ${a.monetizationHints.join(", ")||"—"}
Cliente objetivo: ${a.targetCustomerHints.join(", ")||"—"}
Confianza y pagos: ${a.trustAndSafetyHints.join(", ")||"—"}
Plataforma: ${a.platformHints.join(", ")||"—"}
Restricciones de build: ${a.buildConstraints.join(", ")||"—"}

Preguntas pendientes:
${a.remainingQuestions.map(a=>`- ${a}`).join("\n")||"—"}`:"Sin Discovery Context — usar heur\xedsticas."}function f(a){if(!a)return 0;let b=0,c=a.answers.map(a=>{var b;return Array.isArray(b=a.answer)?b.join(" "):b}).join(" ").toLowerCase();return a.answers.length>=3?b+=6:a.answers.length>=1&&(b+=3),d(c,[/vertical|especializado|niche/i])&&(b+=5),d(c,[/generalista/i])&&(b-=4),d(c,[/comisi[oó]n/i])&&d(c,[/vertical/i])&&(b+=3),d(c,[/pagos?\s+en\s+plataforma|escrow/i])&&(b-=3),d(c,[/sin\s+pagos|solo\s+anuncios|contacto/i])&&(b+=2),d(c,[/wallapop|vinted|c2c/i])&&(b+=2),Math.max(-8,Math.min(12,b))}c.d(b,{s1:()=>e,u2:()=>f})},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},46076:(a,b,c)=>{"use strict";c.d(b,{w:()=>l,l:()=>k});let d=`PRINCIPIOS FORGEOS:
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

${b.join("\n\n")}`}function l(a){let b=k(a);return b.trim().length>0?b:""}},62189:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>N,patchFetch:()=>M,routeModule:()=>I,serverHooks:()=>L,workAsyncStorage:()=>J,workUnitAsyncStorage:()=>K});var d={};c.r(d),c.d(d,{POST:()=>H});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(10641),v=c(32115),w=c(14666),x=c(20376);let y=`{
  "executiveSummary": "string",
  "problemStatement": "string",
  "targetCustomer": "string",
  "valueProposition": "string",
  "mvpScope": ["string"],
  "v2Features": ["string"],
  "userStories": ["string"],
  "mainScreens": ["string"],
  "coreFlows": ["string"],
  "assumptions": ["string"],
  "risks": ["string"],
  "successMetrics": ["string"],
  "roadmap30_60_90": {
    "day30": ["string"],
    "day60": ["string"],
    "day90": ["string"]
  }
}`,z=["mvpScope","v2Features","userStories","mainScreens","coreFlows","assumptions","risks","successMetrics"];var A=c(508),B=c(71349),C=c(40662),D=c(33548);function E(a,b,c){return{data:function(a){let b=a.researchReport,c=!!b,d=c?`${a.projectName} es una aplicaci\xf3n ${a.appType} para ${a.targetCustomer}. ${b.marketSummary.slice(0,220)}${b.marketSummary.length>220?"…":""}`:`${a.projectName} es una aplicaci\xf3n ${a.appType} dise\xf1ada para ${a.targetCustomer}. ${a.description.slice(0,200)}${a.description.length>200?"…":""}`,e=c?`${a.targetCustomer} enfrenta fricciones descritas en la investigaci\xf3n: ${b.marketRisks[0]??"dolor operativo recurrente (hip\xf3tesis)"}.`:`${a.targetCustomer} enfrenta fricciones operativas y falta de herramientas especializadas para el caso de uso descrito.`,f=c?b.differentiationAngles[0]??`Resolver el job-to-be-done principal con un MVP ${a.appType} enfocado.`:`Centralizar y automatizar el flujo principal con una experiencia ${a.appType} intuitiva.`,g=c?["Auth + onboarding m\xednimo",...b.validationPlan.slice(0,2).map(a=>`Validar: ${a}`),...b.differentiationAngles[0]?[`Core wedge: ${b.differentiationAngles[0]}`]:["Flujo principal end-to-end"],"Dashboard con m\xe9trica north-star"].slice(0,6):["Registro e inicio de sesi\xf3n","Onboarding guiado","Flujo principal de valor","Panel con m\xe9tricas clave","Configuraci\xf3n de cuenta"],h=c?[...b.opportunities.slice(0,2).map(a=>`Expandir: ${a}`),"Integraciones externas","Colaboraci\xf3n en equipo","Informes avanzados"]:["Integraciones con herramientas externas","Exportaci\xf3n e informes avanzados","Plan de equipo y colaboraci\xf3n","Notificaciones inteligentes","API p\xfablica para partners"],i=c?[...b.marketRisks,"Complejidad de adopci\xf3n del MVP (hip\xf3tesis)"]:["Adopci\xf3n inicial lenta sin canal definido","Complejidad del flujo core","Dependencia de integraciones futuras"],j=c?[...b.targetSegments.slice(0,2).map(a=>`Segmento viable: ${a}`),...b.recommendedNextQuestions.slice(0,2).map(a=>`Por validar: ${a}`)]:["El dolor es lo suficientemente frecuente para retenci\xf3n semanal","Los usuarios pagar\xe1n por ahorro de tiempo medible"],k=c?["Completar plan de validaci\xf3n en 30 d\xedas","Activaci\xf3n D7 > 35% (hip\xf3tesis)",...b.opportunities.slice(0,2).map(a=>`Se\xf1al temprana: ${a}`)]:["Activaci\xf3n D7 > 35%","Retenci\xf3n M1 > 40%","Tiempo hasta primer valor < 5 min","Conversi\xf3n free-to-paid > 8%"],l=c?b.validationPlan.slice(0,3):["Definir arquitectura y dise\xf1o base","Implementar auth y onboarding","Desarrollar flujo core del MVP"];return{executiveSummary:d,problemStatement:e,targetCustomer:a.targetCustomer,valueProposition:f,mvpScope:g,v2Features:h,userStories:[`Como ${a.targetCustomer}, quiero completar el flujo principal para obtener valor inmediato.`,"Como usuario nuevo, quiero onboarding claro en menos de 5 minutos.","Como admin, quiero ver si el producto est\xe1 funcionando con una m\xe9trica clave."],mainScreens:["Landing / marketing","Login y registro","Onboarding","Dashboard principal","Flujo core","Perfil y ajustes"],coreFlows:c?["Descubrimiento → registro → primer valor",`Wedge: ${b.differentiationAngles[0]??"job principal"}`]:["Descubrimiento → registro → onboarding → acci\xf3n core → resultado"],assumptions:j,risks:i,successMetrics:k,roadmap30_60_90:{day30:l,day60:c?["Iterar seg\xfan entrevistas","Refinar MVP seg\xfan m\xe9tricas","Preparar beta cerrada"]:["Dashboard y m\xe9tricas","QA con usuarios beta","Deploy en staging"],day90:c?["Lanzamiento controlado","Medir m\xe9tricas de \xe9xito definidas","Decidir expansi\xf3n v2"]:["Landing y pricing","Lanzamiento p\xfablico","Iteraci\xf3n por activaci\xf3n"]}}}(a),source:"mock",usedResearch:c,usedKnowledgeRefs:b,fallbackUsed:!0}}async function F(a){let b=a.knowledgeRefs??[],c=!!a.researchReport,d=function(a=[]){return a.map(a=>A._.getById(a.id)).filter(a=>null!==a)}(b);if(!(0,D.rN)().some(a=>"mock"!==a))return E(a,b,c);try{let{system:e,user:f}=function(a,b=[]){var c;let d=v.l.find(a=>"prompt-product"===a.id);return{system:`Eres el Product Worker de ForgeOS. Transformas investigaci\xf3n de mercado en un PRD accionable en espa\xf1ol.

REGLAS OBLIGATORIAS:
- Usa el ResearchReport como contexto PRINCIPAL cuando est\xe9 disponible.
- Usa Discovery Context como decisiones expl\xedcitas del usuario. Tiene m\xe1s prioridad que las heur\xedsticas.
- Brain Context define c\xf3mo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.
- No inventes datos precisos no verificados (TAM exacto, market share, cifras de revenue).
- Transforma la investigaci\xf3n en decisiones de producto concretas y priorizadas.
- Prioriza un MVP peque\xf1o y validable (4-8 semanas, m\xe1ximo 5-7 items en mvpScope).
- Incluye hip\xf3tesis expl\xedcitas en assumptions y m\xe9tricas medibles en successMetrics.
- Mant\xe9n incertidumbre cuando corresponda ("hip\xf3tesis", "por validar").
- knowledgeRefs son orientativos, no verdad absoluta.
- Responde \xdaNICAMENTE con JSON v\xe1lido, sin markdown ni texto adicional.
- El JSON debe seguir exactamente este esquema:
${y}

${d?`Plantilla base del cat\xe1logo:
${d.template}`:""}

---
${(0,w.wS)("product")}`,user:`Proyecto: ${a.projectName}
Tipo de aplicaci\xf3n: ${a.appType}
Cliente objetivo: ${a.targetCustomer}

Idea:
${a.description}

---
RESEARCH REPORT (contexto principal):
${!(c=a.researchReport)?"No hay ResearchReport disponible. Basa el PRD en la idea y knowledgeRefs.":`## Resumen de mercado
${c.marketSummary}

## Segmentos
${c.targetSegments.map(a=>`- ${a}`).join("\n")}

## Competidores
${c.competitors.map(a=>`- ${a.name} (${a.type}): fortalezas ${a.strengths.join(", ")}; debilidades ${a.weaknesses.join(", ")}`).join("\n")}

## Oportunidades
${c.opportunities.map(a=>`- ${a}`).join("\n")}

## Diferenciaci\xf3n
${c.differentiationAngles.map(a=>`- ${a}`).join("\n")}

## Plan de validaci\xf3n
${c.validationPlan.map((a,b)=>`${b+1}. ${a}`).join("\n")}

## Preguntas abiertas
${c.recommendedNextQuestions.map(a=>`- ${a}`).join("\n")}

## Riesgos de mercado
${c.marketRisks.map(a=>`- ${a}`).join("\n")}`}

---
Knowledge Engine (contexto complementario):
${0===b.length?"Sin entradas adicionales del Knowledge Engine.":b.map(a=>`- [${a.domain}] ${a.title}: ${a.description}`).join("\n")}

Referencias resumidas:
${(a.knowledgeRefs??[]).map(a=>`- ${a.title} (${a.domain})`).join("\n")||"Ninguna"}

---
DISCOVERY CONTEXT (decisiones del usuario — prioridad sobre heur\xedsticas):
${(0,x.s1)(a.discoveryContext)}`}}(a,d),g=await (0,B._O)({task:"product",system:e,user:f,context:{sources:["product","research","knowledge","memory"],knowledgeRefs:b,researchSummary:a.researchReport?`Research available for ${a.projectName}`:void 0}}),h=JSON.parse((0,C.O)(g.output));if(!function(a){if(!a||"object"!=typeof a)return!1;let b=a.roadmap30_60_90;if("string"!=typeof a.executiveSummary||!a.executiveSummary.trim()||"string"!=typeof a.problemStatement||"string"!=typeof a.targetCustomer||"string"!=typeof a.valueProposition)return!1;for(let b of z)if(!Array.isArray(a[b])||0===a[b].length)return!1;return!!b&&!!Array.isArray(b.day30)&&!!Array.isArray(b.day60)&&!!Array.isArray(b.day90)}(h))throw Error("Invalid PRD structure from AI provider");let i=function(a){if("anthropic"===a||"openai"===a)return a}(g.provider);return{data:h,source:"ai",provider:i,usedResearch:c,usedKnowledgeRefs:b,fallbackUsed:g.fallbackUsed||"mock"===g.provider}}catch{return E(a,b,c)}}var G=c(69580);async function H(a){let b;try{b=await a.json()}catch{return u.NextResponse.json({error:"Invalid JSON body"},{status:400})}let{projectName:c,description:d,appType:e,targetCustomer:f,researchReport:g,knowledgeRefs:h,discoveryContext:i}=b;if(!c?.trim())return u.NextResponse.json({error:"projectName is required"},{status:400});if(!d?.trim()||d.trim().length<15)return u.NextResponse.json({error:"description is required (min 15 characters)"},{status:400});if(!e?.trim())return u.NextResponse.json({error:"appType is required"},{status:400});if(!f?.trim())return u.NextResponse.json({error:"targetCustomer is required"},{status:400});let j=await F({projectName:c.trim(),description:d.trim(),appType:e.trim(),targetCustomer:f.trim(),researchReport:function(a){if(!a||"object"!=typeof a)return null;if(a.data&&"object"==typeof a.data){let b=a.data;return(0,G.t)(b)?b:null}return(0,G.t)(a)?a:null}(g),knowledgeRefs:Array.isArray(h)?h.filter(a=>!!a&&"object"==typeof a).map(a=>({id:String(a.id??""),domain:String(a.domain??""),title:String(a.title??"")})).filter(a=>a.id&&a.title):[],discoveryContext:i&&"object"==typeof i&&Array.isArray(i.answers)?i:null});return u.NextResponse.json(j)}let I=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/generate/product/route",pathname:"/api/generate/product",filename:"route",bundlePath:"app/api/generate/product/route"},distDir:".next-6010",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\api\\generate\\product\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:J,workUnitAsyncStorage:K,serverHooks:L}=I;function M(){return(0,g.patchFetch)({workAsyncStorage:J,workUnitAsyncStorage:K})}async function N(a,b,c){var d;let e="/api/generate/product/route";"/index"===e&&(e="/");let g=await I.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||I.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===I.isDev||!E,H=E&&!G,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>I.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>I.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!E)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await I.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await I.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await I.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},69580:(a,b,c)=>{"use strict";c.d(b,{t:()=>e});let d=["targetSegments","marketRisks","opportunities","differentiationAngles","validationPlan","recommendedNextQuestions"];function e(a){if(!a||"object"!=typeof a||"string"!=typeof a.marketSummary||!a.marketSummary.trim()||!Array.isArray(a.competitors)||0===a.competitors.length)return!1;for(let b of d)if(!Array.isArray(a[b])||0===a[b].length)return!1;for(let b of a.competitors)if(!b||"object"!=typeof b||"string"!=typeof b.name||"string"!=typeof b.type||!Array.isArray(b.strengths)||!Array.isArray(b.weaknesses))return!1;return!0}},71349:(a,b,c)=>{"use strict";c.d(b,{Gw:()=>d.Gw,_O:()=>d._O});var d=c(75052);c(98231),c(13243),c(33548),c(59411),c(51570),c(93622),c(81752),c(83811),c(84381),c(8386),c(25137),c(65080),c(78350)},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1331,1692,1120,9411,9252,5052],()=>b(b.s=62189));module.exports=c})();