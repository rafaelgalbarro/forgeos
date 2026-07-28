/** Product Hunt launch checklist. */

import type { GTMContext, ProductHuntTask } from "./types";

export function generateProductHuntChecklist(ctx: GTMContext): ProductHuntTask[] {
  const name = ctx.ventureName;

  return [
    { id: "ph-1", phase: "pre-launch", title: "Crear cuenta Product Hunt", description: "Perfil de maker verificado", completed: false },
    { id: "ph-2", phase: "pre-launch", title: "Preparar tagline (60 chars)", description: `Tagline para ${name}`, completed: false },
    { id: "ph-3", phase: "pre-launch", title: "Galería: logo, screenshots, video", description: "Mínimo 3 imágenes + GIF demo", completed: false },
    { id: "ph-4", phase: "pre-launch", title: "Coordinar hunter o self-launch", description: "Confirmar fecha martes/jueves", completed: false },
    { id: "ph-5", phase: "pre-launch", title: "Lista de supporters (50+)", description: "Early users, inversores, comunidad", completed: false },
    { id: "ph-6", phase: "launch-day", title: "Publicar a las 00:01 PST", description: "Primer comentario del maker listo", completed: false },
    { id: "ph-7", phase: "launch-day", title: "Responder todos los comentarios", description: "Engagement cada 30 min", completed: false },
    { id: "ph-8", phase: "launch-day", title: "Cross-post LinkedIn + Twitter/X", description: "CTA directo al PH listing", completed: false },
    { id: "ph-9", phase: "launch-day", title: "Email blast a waitlist", description: "Pedir upvote + feedback honesto", completed: false },
    { id: "ph-10", phase: "post-launch", title: "Recopilar badge y testimonios", description: "Añadir a landing y press kit", completed: false },
    { id: "ph-11", phase: "post-launch", title: "Analizar tráfico y conversiones", description: "UTM tracking PH → signup", completed: false },
    { id: "ph-12", phase: "post-launch", title: "Follow-up con comentaristas", description: "Convertir curiosos en usuarios", completed: false },
  ];
}
