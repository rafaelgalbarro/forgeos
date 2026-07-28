(()=>{var a={};a.id=300,a.ids=[300,9351],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},2208:(a,b,c)=>{Promise.resolve().then(c.bind(c,20918))},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},20918:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>d});let d=(0,c(97954).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\RafaelGalbarroBarba\\\\Projects\\\\ForgeOS_App_Factory\\\\ForgeOS_App_Factory_v0_1\\\\app\\\\venture\\\\[id]\\\\print\\\\page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\venture\\[id]\\print\\page.tsx","default")},26713:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/is-bot")},28354:a=>{"use strict";a.exports=require("util")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},41025:a=>{"use strict";a.exports=require("next/dist/server/app-render/dynamic-access-async-storage.external.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},70284:(a,b,c)=>{"use strict";c.d(b,{$:()=>f});var d=c(21124),e=c(83851);function f({variant:a="primary",size:b="md",loading:c,className:f,children:g,disabled:h,...i}){return(0,d.jsx)("button",{className:(0,e.cn)("fhis-btn",`fhis-btn-${a}`,`fhis-btn-${b}`,f),disabled:h||c,...i,children:c?"…":g})}},75434:(a,b,c)=>{"use strict";c.d(b,{Dg:()=>h,Sj:()=>l,XS:()=>k,e7:()=>m,eG:()=>d,gH:()=>i,g_:()=>n,mK:()=>g,rn:()=>e,vv:()=>j});let d="*Pendiente de completar*";function e(a){return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"venture"}let f={project_brief:"project-brief",investor_pack:"investor-pack",prd:"prd",research:"research",simulator:"simulator-report",roadmap:"roadmap",build_plan:"build-plan"};function g(a,b){let c=e(a.name),d=new Date().toISOString().slice(0,10);return`forgeos-${c}-${f[b]}-${d}.md`}function h(a,b){let c=a.sections.find(a=>a.id===b);return c?.content?.trim()?c.content.trim():d}function i(a){try{return new Date(a).toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"})}catch{return a}}function j(a){return a>=1e6?`€${(a/1e6).toFixed(2)}M`:a>=1e3?`€${Math.round(a/1e3)}K`:`€${a}`}function k(a,b){return a?.length?(b?a.slice(0,b):a).map(a=>`- ${a}`).join("\n"):d}function l(a){return null!=a&&("string"!=typeof a||a.trim())?String(a):d}function m(a,b){return`# ${a}

**Proyecto:** ${b.name}  
**Generado por:** ForgeOS App Factory  
**Fecha:** ${i(new Date().toISOString())}  
**Venture ID:** ${b.id}

---

`}function n(a,b){}},79947:(a,b,c)=>{"use strict";c.d(b,{vl:()=>g,QB:()=>h});var d=c(75434),e=c(54287);function f(a){return a?.trim()&&a.trim()!==d.eG.replace(/\*/g,"")?a.trim():d.eG}function g(a){let b=a.intelligenceReport,c=a.productPRD,g=a.researchReport,h=a.ventureSimulatorResult??(0,e.zL)((0,e.tf)(a)),i=(0,d.Dg)(a,"resumen"),j=f(c?.executiveSummary??(i!==d.eG?i.replace(/^#.*\n+/m,""):void 0)??a.ideaText),k=h?`Venture Score: ${h.ventureScore}/100
Startup Score: ${h.startupScore}/100
Recomendaci\xf3n: ${h.recommendationLabel}
Confianza: ${h.confidence}`:b?`Startup Score: ${b.startupScore}/100
${d.eG}`:d.eG,l=h?.scenarios.length?h.scenarios.map(a=>`${a.scenario.toUpperCase()}
  Usuarios A1/A2: ${a.year1Users.toLocaleString("es-ES")} / ${a.year2Users.toLocaleString("es-ES")}
  Ingresos A1/A2: ${(0,d.vv)(a.year1Revenue)} / ${(0,d.vv)(a.year2Revenue)}
  CAC: ${(0,d.vv)(a.estimatedCAC)} \xb7 LTV: ${(0,d.vv)(a.estimatedLTV)}
  Conversi\xf3n: ${a.estimatedConversion}% \xb7 Churn: ${a.estimatedChurn}%
  Break-even: ${a.breakEvenMonths?`${a.breakEvenMonths} meses`:"No alcanzado"}
  Riesgo: ${a.primaryRisk}`).join("\n\n"):d.eG,m=g?`RESUMEN DE MERCADO
${g.marketSummary}

SEGMENTOS
${g.targetSegments.map(a=>`• ${a}`).join("\n")}

COMPETIDORES
${g.competitors.map(a=>`• ${a.name} (${a.type})`).join("\n")}

OPORTUNIDADES
${g.opportunities.map(a=>`• ${a}`).join("\n")}

DIFERENCIACI\xd3N
${g.differentiationAngles.map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"mercado"))+"\n\n"+f((0,d.Dg)(a,"competidores")),n=c?`PROBLEMA
${c.problemStatement}

SOLUCI\xd3N / PROPUESTA DE VALOR
${c.valueProposition}

CLIENTE
${c.targetCustomer}

MVP SCOPE
${c.mvpScope.map(a=>`• ${a}`).join("\n")}

USER STORIES
${c.userStories.slice(0,8).map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"prd")),o=c?`30 D\xcdAS
${c.roadmap30_60_90.day30.map(a=>`• ${a}`).join("\n")}

60 D\xcdAS
${c.roadmap30_60_90.day60.map(a=>`• ${a}`).join("\n")}

90 D\xcdAS
${c.roadmap30_60_90.day90.map(a=>`• ${a}`).join("\n")}`:f((0,d.Dg)(a,"roadmap")),p=f((0,d.Dg)(a,"kpis")),q=f(h?.suggestedNextAction??b?.founderAdvisor.recommendations.map(a=>a.text).join("\n")),r=[{id:"resumen",title:"Resumen ejecutivo",body:j,isPending:j===d.eG},{id:"scores",title:"Venture Score y recomendaci\xf3n",body:k,isPending:k.includes(d.eG)},{id:"escenarios",title:"Escenarios econ\xf3micos",body:l,isPending:l===d.eG},{id:"research",title:"Research",body:m,isPending:m.includes(d.eG)},{id:"prd",title:"PRD",body:n,isPending:n===d.eG},{id:"roadmap",title:"Roadmap",body:o,isPending:o===d.eG},{id:"kpis",title:"KPIs",body:p,isPending:p===d.eG},{id:"next-steps",title:"Pr\xf3ximos pasos",body:q,isPending:q===d.eG}].map((a,b)=>({...a,number:b+1}));return{ventureName:a.name,ventureId:a.id,generatedAt:new Date().toISOString(),category:a.category,targetAudience:a.targetAudience,ventureScore:h?`${h.ventureScore}/100`:b?`${b.startupScore}/100`:d.eG,recommendation:h?.recommendationLabel??d.eG,confidence:h?.confidence??d.eG,sections:r,toc:r.map(a=>({number:a.number,title:a.title,id:a.id}))}}function h(){}},81742:(a,b,c)=>{"use strict";c.r(b),c.d(b,{GlobalError:()=>E.a,__next_app__:()=>K,handler:()=>M,pages:()=>J,routeModule:()=>L,tree:()=>I});var d=c(49754),e=c(9117),f=c(46595),g=c(32324),h=c(39326),i=c(38928),j=c(20175),k=c(12),l=c(54290),m=c(12696),n=c(52574),o=c(82802),p=c(77533),q=c(45229),r=c(32822),s=c(261),t=c(26453),u=c(52474),v=c(26713),w=c(51356),x=c(62685),y=c(36225),z=c(63446),A=c(2762),B=c(45742),C=c(86439),D=c(81170),E=c.n(D),F=c(62506),G=c(91203),H={};for(let a in F)0>["default","tree","pages","GlobalError","__next_app__","routeModule","handler"].indexOf(a)&&(H[a]=()=>F[a]);c.d(b,H);let I={children:["",{children:["venture",{children:["[id]",{children:["print",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(c.bind(c,20918)),"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\venture\\[id]\\print\\page.tsx"]}]},{}]},{}]},{}]},{layout:[()=>Promise.resolve().then(c.bind(c,16953)),"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\layout.tsx"],error:[()=>Promise.resolve().then(c.bind(c,41697)),"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\error.tsx"],loading:[()=>Promise.resolve().then(c.bind(c,90391)),"C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\loading.tsx"],"global-error":[()=>Promise.resolve().then(c.t.bind(c,81170,23)),"next/dist/client/components/builtin/global-error.js"],"not-found":[()=>Promise.resolve().then(c.t.bind(c,87028,23)),"next/dist/client/components/builtin/not-found.js"],forbidden:[()=>Promise.resolve().then(c.t.bind(c,90461,23)),"next/dist/client/components/builtin/forbidden.js"],unauthorized:[()=>Promise.resolve().then(c.t.bind(c,32768,23)),"next/dist/client/components/builtin/unauthorized.js"]}]}.children,J=["C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\app\\venture\\[id]\\print\\page.tsx"],K={require:c,loadChunk:()=>Promise.resolve()},L=new d.AppPageRouteModule({definition:{kind:e.RouteKind.APP_PAGE,page:"/venture/[id]/print/page",pathname:"/venture/[id]/print",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:I},distDir:".next-6010",relativeProjectDir:""});async function M(a,b,d){var D;let H="/venture/[id]/print/page";"/index"===H&&(H="/");let N=(0,h.getRequestMeta)(a,"postponed"),O=(0,h.getRequestMeta)(a,"minimalMode"),P=await L.prepare(a,b,{srcPage:H,multiZoneDraftMode:!1});if(!P)return b.statusCode=400,b.end("Bad Request"),null==d.waitUntil||d.waitUntil.call(d,Promise.resolve()),null;let{buildId:Q,query:R,params:S,parsedUrl:T,pageIsDynamic:U,buildManifest:V,nextFontManifest:W,reactLoadableManifest:X,serverActionsManifest:Y,clientReferenceManifest:Z,subresourceIntegrityManifest:$,prerenderManifest:_,isDraftMode:aa,resolvedPathname:ab,revalidateOnlyGenerated:ac,routerServerContext:ad,nextConfig:ae,interceptionRoutePatterns:af}=P,ag=T.pathname||"/",ah=(0,s.normalizeAppPath)(H),{isOnDemandRevalidate:ai}=P,aj=L.match(ag,_),ak=!!_.routes[ab],al=!!(aj||ak||_.routes[ah]),am=a.headers["user-agent"]||"",an=(0,v.getBotType)(am),ao=(0,q.isHtmlBotRequest)(a),ap=(0,h.getRequestMeta)(a,"isPrefetchRSCRequest")??"1"===a.headers[u.NEXT_ROUTER_PREFETCH_HEADER],aq=(0,h.getRequestMeta)(a,"isRSCRequest")??(0,n.f)(a.headers[u.RSC_HEADER]),ar=(0,t.getIsPossibleServerAction)(a),as=(0,m.checkIsAppPPREnabled)(ae.experimental.ppr)&&(null==(D=_.routes[ah]??_.dynamicRoutes[ah])?void 0:D.renderingMode)==="PARTIALLY_STATIC",at=!1,au=!1,av=as?N:void 0,aw=as&&aq&&!ap,ax=(0,h.getRequestMeta)(a,"segmentPrefetchRSCRequest"),ay=!am||(0,q.shouldServeStreamingMetadata)(am,ae.htmlLimitedBots);ao&&as&&(al=!1,ay=!1);let az=!0===L.isDev||!al||"string"==typeof N||aw,aA=ao&&as,aB=null;aa||!al||az||ar||av||aw||(aB=ab);let aC=aB;!aC&&L.isDev&&(aC=ab),L.isDev||aa||!al||!aq||aw||(0,k.d)(a.headers);let aD={...F,tree:I,pages:J,GlobalError:E(),handler:M,routeModule:L,__next_app__:K};Y&&Z&&(0,p.setReferenceManifestsSingleton)({page:H,clientReferenceManifest:Z,serverActionsManifest:Y,serverModuleMap:(0,r.createServerModuleMap)({serverActionsManifest:Y})});let aE=a.method||"GET",aF=(0,g.getTracer)(),aG=aF.getActiveScopeSpan();try{let f=L.getVaryHeader(ab,af);b.setHeader("Vary",f);let k=async(c,d)=>{let e=new l.NodeNextRequest(a),f=new l.NodeNextResponse(b);return L.render(e,f,d).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=aF.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==i.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${aE} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${aE} ${a.url}`)})},m=async({span:e,postponed:f,fallbackRouteParams:g})=>{let i={query:R,params:S,page:ah,sharedContext:{buildId:Q},serverComponentsHmrCache:(0,h.getRequestMeta)(a,"serverComponentsHmrCache"),fallbackRouteParams:g,renderOpts:{App:()=>null,Document:()=>null,pageConfig:{},ComponentMod:aD,Component:(0,j.T)(aD),params:S,routeModule:L,page:H,postponed:f,shouldWaitOnAllReady:aA,serveStreamingMetadata:ay,supportsDynamicResponse:"string"==typeof f||az,buildManifest:V,nextFontManifest:W,reactLoadableManifest:X,subresourceIntegrityManifest:$,serverActionsManifest:Y,clientReferenceManifest:Z,setIsrStatus:null==ad?void 0:ad.setIsrStatus,dir:c(33873).join(process.cwd(),L.relativeProjectDir),isDraftMode:aa,isRevalidate:al&&!f&&!aw,botType:an,isOnDemandRevalidate:ai,isPossibleServerAction:ar,assetPrefix:ae.assetPrefix,nextConfigOutput:ae.output,crossOrigin:ae.crossOrigin,trailingSlash:ae.trailingSlash,previewProps:_.preview,deploymentId:ae.deploymentId,enableTainting:ae.experimental.taint,htmlLimitedBots:ae.htmlLimitedBots,devtoolSegmentExplorer:ae.experimental.devtoolSegmentExplorer,reactMaxHeadersLength:ae.reactMaxHeadersLength,multiZoneDraftMode:!1,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:ae.experimental.cacheLife,basePath:ae.basePath,serverActions:ae.experimental.serverActions,...at?{nextExport:!0,supportsDynamicResponse:!1,isStaticGeneration:!0,isRevalidate:!0,isDebugDynamicAccesses:at}:{},experimental:{isRoutePPREnabled:as,expireTime:ae.expireTime,staleTimes:ae.experimental.staleTimes,cacheComponents:!!ae.experimental.cacheComponents,clientSegmentCache:!!ae.experimental.clientSegmentCache,clientParamParsing:!!ae.experimental.clientParamParsing,dynamicOnHover:!!ae.experimental.dynamicOnHover,inlineCss:!!ae.experimental.inlineCss,authInterrupts:!!ae.experimental.authInterrupts,clientTraceMetadata:ae.experimental.clientTraceMetadata||[]},waitUntil:d.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:()=>{},onInstrumentationRequestError:(b,c,d)=>L.onRequestError(a,b,d,ad),err:(0,h.getRequestMeta)(a,"invokeError"),dev:L.isDev}},l=await k(e,i),{metadata:m}=l,{cacheControl:n,headers:o={},fetchTags:p}=m;if(p&&(o[z.NEXT_CACHE_TAGS_HEADER]=p),a.fetchMetrics=m.fetchMetrics,al&&(null==n?void 0:n.revalidate)===0&&!L.isDev&&!as){let a=m.staticBailoutInfo,b=Object.defineProperty(Error(`Page changed from static to dynamic at runtime ${ab}${(null==a?void 0:a.description)?`, reason: ${a.description}`:""}
see more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`),"__NEXT_ERROR_CODE",{value:"E132",enumerable:!1,configurable:!0});if(null==a?void 0:a.stack){let c=a.stack;b.stack=b.message+c.substring(c.indexOf("\n"))}throw b}return{value:{kind:w.CachedRouteKind.APP_PAGE,html:l,headers:o,rscData:m.flightData,postponed:m.postponed,status:m.statusCode,segmentData:m.segmentData},cacheControl:n}},n=async({hasResolved:c,previousCacheEntry:f,isRevalidating:g,span:i})=>{let j,k=!1===L.isDev,l=c||b.writableEnded;if(ai&&ac&&!f&&!O)return(null==ad?void 0:ad.render404)?await ad.render404(a,b):(b.statusCode=404,b.end("This page could not be found")),null;if(aj&&(j=(0,x.parseFallbackField)(aj.fallback)),j===x.FallbackMode.PRERENDER&&(0,v.isBot)(am)&&(!as||ao)&&(j=x.FallbackMode.BLOCKING_STATIC_RENDER),(null==f?void 0:f.isStale)===-1&&(ai=!0),ai&&(j!==x.FallbackMode.NOT_FOUND||f)&&(j=x.FallbackMode.BLOCKING_STATIC_RENDER),!O&&j!==x.FallbackMode.BLOCKING_STATIC_RENDER&&aC&&!l&&!aa&&U&&(k||!ak)){let b;if((k||aj)&&j===x.FallbackMode.NOT_FOUND)throw new C.NoFallbackError;if(as&&!aq){let c="string"==typeof(null==aj?void 0:aj.fallback)?aj.fallback:k?ah:null;if(b=await L.handleResponse({cacheKey:c,req:a,nextConfig:ae,routeKind:e.RouteKind.APP_PAGE,isFallback:!0,prerenderManifest:_,isRoutePPREnabled:as,responseGenerator:async()=>m({span:i,postponed:void 0,fallbackRouteParams:k||au?(0,o.u)(ah):null}),waitUntil:d.waitUntil}),null===b)return null;if(b)return delete b.cacheControl,b}}let n=ai||g||!av?void 0:av;if(at&&void 0!==n)return{cacheControl:{revalidate:1,expire:void 0},value:{kind:w.CachedRouteKind.PAGES,html:y.default.EMPTY,pageData:{},headers:void 0,status:void 0}};let p=U&&as&&((0,h.getRequestMeta)(a,"renderFallbackShell")||au)?(0,o.u)(ag):null;return m({span:i,postponed:n,fallbackRouteParams:p})},p=async c=>{var f,g,i,j,k;let l,o=await L.handleResponse({cacheKey:aB,responseGenerator:a=>n({span:c,...a}),routeKind:e.RouteKind.APP_PAGE,isOnDemandRevalidate:ai,isRoutePPREnabled:as,req:a,nextConfig:ae,prerenderManifest:_,waitUntil:d.waitUntil});if(aa&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate"),L.isDev&&b.setHeader("Cache-Control","no-store, must-revalidate"),!o){if(aB)throw Object.defineProperty(Error("invariant: cache entry required but not generated"),"__NEXT_ERROR_CODE",{value:"E62",enumerable:!1,configurable:!0});return null}if((null==(f=o.value)?void 0:f.kind)!==w.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant app-page handler received invalid cache entry ${null==(i=o.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E707",enumerable:!1,configurable:!0});let p="string"==typeof o.value.postponed;al&&!aw&&(!p||ap)&&(O||b.setHeader("x-nextjs-cache",ai?"REVALIDATED":o.isMiss?"MISS":o.isStale?"STALE":"HIT"),b.setHeader(u.NEXT_IS_PRERENDER_HEADER,"1"));let{value:q}=o;if(av)l={revalidate:0,expire:void 0};else if(O&&aq&&!ap&&as)l={revalidate:0,expire:void 0};else if(!L.isDev)if(aa)l={revalidate:0,expire:void 0};else if(al){if(o.cacheControl)if("number"==typeof o.cacheControl.revalidate){if(o.cacheControl.revalidate<1)throw Object.defineProperty(Error(`Invalid revalidate configuration provided: ${o.cacheControl.revalidate} < 1`),"__NEXT_ERROR_CODE",{value:"E22",enumerable:!1,configurable:!0});l={revalidate:o.cacheControl.revalidate,expire:(null==(j=o.cacheControl)?void 0:j.expire)??ae.expireTime}}else l={revalidate:z.CACHE_ONE_YEAR,expire:void 0}}else b.getHeader("Cache-Control")||(l={revalidate:0,expire:void 0});if(o.cacheControl=l,"string"==typeof ax&&(null==q?void 0:q.kind)===w.CachedRouteKind.APP_PAGE&&q.segmentData){b.setHeader(u.NEXT_DID_POSTPONE_HEADER,"2");let c=null==(k=q.headers)?void 0:k[z.NEXT_CACHE_TAGS_HEADER];O&&al&&c&&"string"==typeof c&&b.setHeader(z.NEXT_CACHE_TAGS_HEADER,c);let d=q.segmentData.get(ax);return void 0!==d?(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.fromStatic(d,u.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl}):(b.statusCode=204,(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.EMPTY,cacheControl:o.cacheControl}))}let r=(0,h.getRequestMeta)(a,"onCacheEntry");if(r&&await r({...o,value:{...o.value,kind:"PAGE"}},{url:(0,h.getRequestMeta)(a,"initURL")}))return null;if(p&&av)throw Object.defineProperty(Error("Invariant: postponed state should not be present on a resume request"),"__NEXT_ERROR_CODE",{value:"E396",enumerable:!1,configurable:!0});if(q.headers){let a={...q.headers};for(let[c,d]of(O&&al||delete a[z.NEXT_CACHE_TAGS_HEADER],Object.entries(a)))if(void 0!==d)if(Array.isArray(d))for(let a of d)b.appendHeader(c,a);else"number"==typeof d&&(d=d.toString()),b.appendHeader(c,d)}let s=null==(g=q.headers)?void 0:g[z.NEXT_CACHE_TAGS_HEADER];if(O&&al&&s&&"string"==typeof s&&b.setHeader(z.NEXT_CACHE_TAGS_HEADER,s),!q.status||aq&&as||(b.statusCode=q.status),!O&&q.status&&G.RedirectStatusCode[q.status]&&aq&&(b.statusCode=200),p&&b.setHeader(u.NEXT_DID_POSTPONE_HEADER,"1"),aq&&!aa){if(void 0===q.rscData){if(q.postponed)throw Object.defineProperty(Error("Invariant: Expected postponed to be undefined"),"__NEXT_ERROR_CODE",{value:"E372",enumerable:!1,configurable:!0});return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:q.html,cacheControl:aw?{revalidate:0,expire:void 0}:o.cacheControl})}return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:y.default.fromStatic(q.rscData,u.RSC_CONTENT_TYPE_HEADER),cacheControl:o.cacheControl})}let t=q.html;if(!p||O||aq)return(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:o.cacheControl});if(at)return t.push(new ReadableStream({start(a){a.enqueue(A.ENCODED_TAGS.CLOSED.BODY_AND_HTML),a.close()}})),(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}});let v=new TransformStream;return t.push(v.readable),m({span:c,postponed:q.postponed,fallbackRouteParams:null}).then(async a=>{var b,c;if(!a)throw Object.defineProperty(Error("Invariant: expected a result to be returned"),"__NEXT_ERROR_CODE",{value:"E463",enumerable:!1,configurable:!0});if((null==(b=a.value)?void 0:b.kind)!==w.CachedRouteKind.APP_PAGE)throw Object.defineProperty(Error(`Invariant: expected a page response, got ${null==(c=a.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E305",enumerable:!1,configurable:!0});await a.value.html.pipeTo(v.writable)}).catch(a=>{v.writable.abort(a).catch(a=>{console.error("couldn't abort transformer",a)})}),(0,B.sendRenderResult)({req:a,res:b,generateEtags:ae.generateEtags,poweredByHeader:ae.poweredByHeader,result:t,cacheControl:{revalidate:0,expire:void 0}})};if(!aG)return await aF.withPropagatedContext(a.headers,()=>aF.trace(i.BaseServerSpan.handleRequest,{spanName:`${aE} ${a.url}`,kind:g.SpanKind.SERVER,attributes:{"http.method":aE,"http.target":a.url}},p));await p(aG)}catch(b){throw b instanceof C.NoFallbackError||await L.onRequestError(a,b,{routerKind:"App Router",routePath:H,routeType:"render",revalidateReason:(0,f.c)({isRevalidate:al,isOnDemandRevalidate:ai})},ad),b}}},83906:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>o});var d=c(21124),e=c(38301),f=c(42378),g=c(3991),h=c.n(g),i=c(79947);let j=`
  @page {
    margin: 18mm 16mm;
    size: A4;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #f8f9fb;
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-doc {
    max-width: 210mm;
    margin: 0 auto;
    background: #ffffff;
  }

  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 56px;
    page-break-after: always;
    background: linear-gradient(160deg, #f0fdf4 0%, #ffffff 45%, #f8fafc 100%);
    border-bottom: 4px solid #84cc16;
  }

  .cover-brand {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #65a30d;
    margin-bottom: 32px;
  }

  .cover h1 {
    font-size: 32pt;
    line-height: 1.15;
    margin: 0 0 16px;
    color: #0f172a;
  }

  .cover-meta {
    font-family: system-ui, sans-serif;
    font-size: 10pt;
    color: #64748b;
    margin-top: 24px;
  }

  .cover-meta p {
    margin: 4px 0;
  }

  .cover-score {
    margin-top: 32px;
    padding: 16px 20px;
    border-left: 4px solid #84cc16;
    background: rgba(132, 204, 22, 0.08);
    font-family: system-ui, sans-serif;
  }

  .cover-score strong {
    display: block;
    font-size: 22pt;
    color: #0f172a;
  }

  .toc {
    padding: 40px 56px;
    page-break-after: always;
  }

  .toc h2 {
    font-family: system-ui, sans-serif;
    font-size: 14pt;
    margin: 0 0 20px;
    color: #0f172a;
  }

  .toc ol {
    margin: 0;
    padding-left: 24px;
    font-family: system-ui, sans-serif;
    font-size: 11pt;
  }

  .toc li {
    margin-bottom: 8px;
  }

  .toc a {
    color: #334155;
    text-decoration: none;
  }

  .section {
    padding: 32px 56px;
    page-break-inside: avoid;
  }

  .section + .section {
    border-top: 1px solid #e2e8f0;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-num {
    font-family: system-ui, sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #84cc16;
    min-width: 28px;
  }

  .section h2 {
    font-family: system-ui, sans-serif;
    font-size: 14pt;
    margin: 0;
    color: #0f172a;
  }

  .section-body {
    white-space: pre-wrap;
    color: #334155;
  }

  .pending {
    color: #94a3b8;
    font-style: italic;
  }

  .footer {
    padding: 24px 56px 40px;
    font-family: system-ui, sans-serif;
    font-size: 9pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    page-break-before: always;
  }

  .no-print {
    display: block;
  }

  @media print {
    html, body {
      background: #ffffff;
    }

    .print-doc {
      max-width: none;
      box-shadow: none;
    }

    .no-print {
      display: none !important;
    }

    .cover {
      min-height: auto;
      padding-top: 80px;
      padding-bottom: 80px;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
  }
`;var k=c(75434),l=c(70284),m=c(83851);function n({venture:a}){let b=(0,i.vl)(a),c=(0,k.gH)(b.generatedAt);return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("style",{dangerouslySetInnerHTML:{__html:j}}),(0,d.jsxs)("div",{className:"no-print print-toolbar",style:{display:"flex",gap:"var(--fhis-space-3)",padding:"var(--fhis-space-4)",alignItems:"center"},children:[(0,d.jsx)(h(),{href:`/venture/${a.id}`,className:(0,m.cn)("fhis-btn","fhis-btn-ghost","fhis-btn-sm"),children:"← Volver al workspace"}),(0,d.jsx)(l.$,{type:"button",variant:"primary",size:"sm",onClick:()=>(0,i.QB)(),children:"Imprimir / Guardar como PDF"})]}),(0,d.jsxs)("div",{className:"print-doc",children:[(0,d.jsxs)("header",{className:"cover",children:[(0,d.jsx)("div",{className:"cover-brand",children:"ForgeOS \xb7 Investor Pack"}),(0,d.jsx)("h1",{children:b.ventureName}),(0,d.jsxs)("p",{children:[a.ideaText.slice(0,280),a.ideaText.length>280?"…":""]}),(0,d.jsxs)("div",{className:"cover-meta",children:[(0,d.jsxs)("p",{children:[(0,d.jsx)("strong",{children:"Categor\xeda:"})," ",b.category]}),(0,d.jsxs)("p",{children:[(0,d.jsx)("strong",{children:"Cliente objetivo:"})," ",b.targetAudience]}),(0,d.jsxs)("p",{children:[(0,d.jsx)("strong",{children:"Generado:"})," ",c]})]}),(0,d.jsxs)("div",{className:"cover-score",children:[(0,d.jsx)("span",{children:"Venture Score"}),(0,d.jsx)("strong",{children:b.ventureScore}),(0,d.jsxs)("p",{children:["Recomendaci\xf3n: ",b.recommendation," \xb7 Confianza: ",b.confidence]})]})]}),(0,d.jsxs)("nav",{className:"toc",children:[(0,d.jsx)("h2",{children:"\xcdndice"}),(0,d.jsx)("ol",{children:b.toc.map(a=>(0,d.jsx)("li",{children:(0,d.jsxs)("a",{href:`#section-${a.id}`,children:[a.number,". ",a.title]})},a.id))})]}),b.sections.map(a=>(0,d.jsxs)("section",{className:"section",id:`section-${a.id}`,children:[(0,d.jsxs)("div",{className:"section-header",children:[(0,d.jsx)("span",{className:"section-num",children:String(a.number).padStart(2,"0")}),(0,d.jsx)("h2",{children:a.title})]}),a.isPending?(0,d.jsx)("p",{className:"pending",children:"Pendiente de completar"}):(0,d.jsx)("div",{className:"section-body",children:a.body})]},a.id)),(0,d.jsxs)("footer",{className:"footer",children:["Documento generado por ForgeOS App Factory \xb7 ",c," \xb7 Venture ID ",b.ventureId,(0,d.jsx)("br",{}),"Simulaci\xf3n heur\xedstica — no constituye asesoramiento financiero."]})]})]})}function o(){let a=(0,f.useParams)();(0,f.useRouter)(),a?.id;let[b,c]=(0,e.useState)(null);return b?(0,d.jsx)(n,{venture:b}):(0,d.jsx)("div",{style:{padding:48,textAlign:"center",fontFamily:"system-ui, sans-serif"},children:"Cargando documento imprimible…"})}c(99351)},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},89056:(a,b,c)=>{Promise.resolve().then(c.bind(c,83906))},99351:(a,b,c)=>{"use strict";c.d(b,{$N:()=>l,kk:()=>k,zM:()=>i,Xq:()=>j});var d=c(49268),e=c(83638),f=c(22938);let g=()=>(0,d.o_)();function h(a){}function i(){return[]}function j(a){let b=[],c=b.findIndex(b=>b.id===a.id),d={...a,updatedAt:new Date().toISOString()};return c>=0?b[c]=d:b.unshift(d),h(b),g().save(d),(0,e.G7)(`venture:${a.id}`,async()=>{await g().save(d)}),(0,f.If)("venture",a.id,d),d}function k(a){return[].find(b=>b.id===a)}function l(a){[].filter(b=>b.id!==a),g().delete(a)}}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1331,5482,5127],()=>b(b.s=81742));module.exports=c})();