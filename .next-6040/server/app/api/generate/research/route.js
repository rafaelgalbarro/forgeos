(()=>{var a={};a.id=2601,a.ids=[2601],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},14666:(a,b,c)=>{"use strict";c.d(b,{lC:()=>d.l,wS:()=>d.w});var d=c(46076)},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},20376:(a,b,c)=>{"use strict";function d(a,b){return b.some(b=>b.test(a))}function e(a){return a&&0!==a.answers.length?`DECISIONES EXPL\xcdCITAS DEL USUARIO (prioridad sobre heur\xedsticas):
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

${b.join("\n\n")}`}function l(a){let b=k(a);return b.trim().length>0?b:""}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},69580:(a,b,c)=>{"use strict";c.d(b,{t:()=>e});let d=["targetSegments","marketRisks","opportunities","differentiationAngles","validationPlan","recommendedNextQuestions"];function e(a){if(!a||"object"!=typeof a||"string"!=typeof a.marketSummary||!a.marketSummary.trim()||!Array.isArray(a.competitors)||0===a.competitors.length)return!1;for(let b of d)if(!Array.isArray(a[b])||0===a[b].length)return!1;for(let b of a.competitors)if(!b||"object"!=typeof b||"string"!=typeof b.name||"string"!=typeof b.type||!Array.isArray(b.strengths)||!Array.isArray(b.weaknesses))return!1;return!0}},71349:(a,b,c)=>{"use strict";c.d(b,{Gw:()=>d.Gw,_O:()=>d._O});var d=c(75052);c(98231),c(13243),c(33548),c(59411),c(51570),c(93622),c(81752),c(83811),c(84381),c(8386),c(25137),c(65080),c(78350)},78335:()=>{},81945:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>M,patchFetch:()=>L,routeModule:()=>H,serverHooks:()=>K,workAsyncStorage:()=>I,workUnitAsyncStorage:()=>J});var d={};c.r(d),c.d(d,{POST:()=>G});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(10641),v=c(508),w=c(32115),x=c(14666),y=c(20376);let z=`{
  "marketSummary": "string",
  "targetSegments": ["string"],
  "competitors": [
    {
      "name": "string",
      "type": "string",
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "marketRisks": ["string"],
  "opportunities": ["string"],
  "differentiationAngles": ["string"],
  "validationPlan": ["string"],
  "recommendedNextQuestions": ["string"]
}`;var A=c(69580),B=c(71349),C=c(40662),D=c(33548);function E(a,b,c,d){return{data:function(a,b=[]){let c=a.knowledgeRefs??[],d=a.appType??"SaaS",e=a.targetCustomer??"usuarios objetivo";return{marketSummary:`Hip\xf3tesis de mercado para **${a.projectName}** (${d}): existe demanda entre ${e} por resolver el problema descrito. El tama\xf1o exacto del mercado requiere validaci\xf3n con entrevistas y datos primarios. Contexto basado en ${c.length} referencias del Knowledge Engine y an\xe1lisis heur\xedstico previo.`,targetSegments:[e,`Early adopters en ${d}`,"Equipos peque\xf1os con dolor operativo recurrente (hip\xf3tesis)"],competitors:function(a,b){let c=a.filter(a=>"competitors"===a.domain);return c.length>0?c.slice(0,5).map(a=>({name:a.title,type:a.category,strengths:a.strengths,weaknesses:a.weaknesses})):b.length>0?b.slice(0,3).map(a=>({name:a.title,type:a.domain,strengths:["Referencia del Knowledge Engine (por validar)"],weaknesses:["Datos no verificados en esta fase"]})):[{name:"Incumbente horizontal",type:"SaaS generalista",strengths:["Distribuci\xf3n","Marca"],weaknesses:["Poca especializaci\xf3n vertical (hip\xf3tesis)"]}]}(b,c),marketRisks:["Competencia de incumbentes con mayor distribuci\xf3n","Adopci\xf3n lenta si el dolor no es frecuente","CAC elevado sin wedge claro (por validar)"],opportunities:["Especializaci\xf3n vertical vs. soluciones horizontales","Mejor UX en el job-to-be-done principal","Modelo h\xedbrido SaaS + servicios para ingresos tempranos"],differentiationAngles:[`Enfoque laser en ${e}`,"Time-to-value m\xe1s corto que alternativas gen\xe9ricas","Integraci\xf3n nativa con el flujo de trabajo existente (hip\xf3tesis)"],validationPlan:["10 entrevistas con usuarios potenciales en 2 semanas","Landing con waitlist y propuesta de valor A/B","Prototipo clickable del flujo core","An\xe1lisis de 5 competidores directos e indirectos"],recommendedNextQuestions:["\xbfQui\xe9n paga y cu\xe1nto estar\xeda dispuesto a pagar?","\xbfCu\xe1l es la alternativa actual (Excel, WhatsApp, incumbente)?","\xbfQu\xe9 m\xe9trica mejorar\xeda el cliente en 30 d\xedas si el producto funciona?"]}}(a,b),source:"mock",usedKnowledgeRefs:c,fallbackUsed:d}}async function F(a){let b=a.knowledgeRefs??[],c=function(a=[]){let b=[];for(let c of a){let a=v._.getById(c.id);a&&b.push(a)}return b}(b);if(!(0,D.rN)().some(a=>"mock"!==a))return E(a,c,b,!0);try{let{system:d,user:e}=function(a,b=[]){let c=w.l.find(a=>"prompt-research"===a.id);return{system:`Eres el Research Worker de ForgeOS. Tu trabajo es investigar mercado y competencia para una idea de startup.

REGLAS OBLIGATORIAS:
- No inventes datos precisos no verificados (TAM exacto, market share, funding rounds espec\xedficos).
- Se\xf1ala incertidumbre cuando no tengas evidencia ("hip\xf3tesis", "por validar", "estimaci\xf3n cualitativa").
- Trabaja con hip\xf3tesis razonables basadas en el contexto proporcionado.
- Prioriza insights accionables para un fundador que va a construir un MVP.
- Usa knowledgeRefs como contexto orientativo, NO como verdad absoluta.
- Usa Discovery Context como decisiones expl\xedcitas del usuario. Tiene m\xe1s prioridad que las heur\xedsticas.
- Brain Context define c\xf3mo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.
- Responde \xdaNICAMENTE con JSON v\xe1lido en espa\xf1ol, sin markdown ni texto adicional.
- El JSON debe seguir exactamente este esquema:
${z}

${c?`Plantilla base del cat\xe1logo:
${c.template}`:""}

---
${(0,x.wS)("research")}`,user:`Proyecto: ${a.projectName}
Tipo de aplicaci\xf3n: ${a.appType??"No especificado"}
Cliente objetivo: ${a.targetCustomer??"No especificado"}

Idea:
${a.ideaText}

Referencias del Knowledge Engine (contexto, no verdad absoluta):
${0===b.length?"Sin entradas adicionales del Knowledge Engine.":b.map(a=>`- [${a.domain}] ${a.title}: ${a.description} (tags: ${a.tags.join(", ")})`).join("\n")}

Referencias resumidas enviadas por el orchestrator:
${(a.knowledgeRefs??[]).map(a=>`- ${a.title} (${a.domain})`).join("\n")||"Ninguna"}

---
DISCOVERY CONTEXT (decisiones del usuario — prioridad sobre heur\xedsticas):
${(0,y.s1)(a.discoveryContext)}`}}(a,c),f=await (0,B._O)({task:"research",system:d,user:e,context:{sources:["research","knowledge","memory"],knowledgeRefs:b}}),g=JSON.parse((0,C.O)(f.output));if(!(0,A.t)(g))throw Error("Invalid research structure from AI provider");let h=function(a){if("anthropic"===a||"openai"===a)return a}(f.provider);return{data:g,source:"ai",provider:h,usedKnowledgeRefs:b,fallbackUsed:f.fallbackUsed||"mock"===f.provider}}catch{return E(a,c,b,!0)}}async function G(a){let b;try{b=await a.json()}catch{return u.NextResponse.json({error:"Invalid JSON body"},{status:400})}let{projectName:c,ideaText:d,appType:e,targetCustomer:f,knowledgeRefs:g,discoveryContext:h}=b;if(!c?.trim())return u.NextResponse.json({error:"projectName is required"},{status:400});if(!d?.trim()||d.trim().length<15)return u.NextResponse.json({error:"ideaText is required (min 15 characters)"},{status:400});let i=await F({projectName:c.trim(),ideaText:d.trim(),appType:e?.trim()||void 0,targetCustomer:f?.trim()||void 0,knowledgeRefs:Array.isArray(g)?g.filter(a=>!!a&&"object"==typeof a).map(a=>({id:String(a.id??""),domain:String(a.domain??""),title:String(a.title??"")})).filter(a=>a.id&&a.title):[],discoveryContext:h&&"object"==typeof h&&Array.isArray(h.answers)?h:null});return u.NextResponse.json(i)}let H=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/generate/research/route",pathname:"/api/generate/research",filename:"route",bundlePath:"app/api/generate/research/route"},distDir:".next-6040",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\api\\generate\\research\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:I,workUnitAsyncStorage:J,serverHooks:K}=H;function L(){return(0,g.patchFetch)({workAsyncStorage:I,workUnitAsyncStorage:J})}async function M(a,b,c){var d;let e="/api/generate/research/route";"/index"===e&&(e="/");let g=await H.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||H.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===H.isDev||!E,I=E&&!G,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>H.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>H.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!E)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await H.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await H.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await H.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1331,1692,1120,9411,9252,5052],()=>b(b.s=81945));module.exports=c})();