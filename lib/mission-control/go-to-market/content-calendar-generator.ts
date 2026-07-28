/** 4-week content calendar generator. */

import type { ContentCalendarEntry, GTMContext } from "./types";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export function generateContentCalendar(ctx: GTMContext): ContentCalendarEntry[] {
  const entries: ContentCalendarEntry[] = [];
  let id = 0;

  const topics = [
    { w: 1, channel: "blog" as const, title: "Por qué existe " + ctx.ventureName, topic: "Problema y visión", cta: "Suscríbete a la waitlist" },
    { w: 1, channel: "social" as const, title: "Teaser del producto", topic: "Behind the scenes", cta: "Comenta qué te gustaría ver" },
    { w: 1, channel: "email" as const, title: "Bienvenida a early adopters", topic: "Historia del fundador", cta: "Completa tu perfil" },
    { w: 2, channel: "blog" as const, title: "Guía: " + ctx.industry + " en 2026", topic: "Thought leadership", cta: "Descarga el checklist" },
    { w: 2, channel: "social" as const, title: "Caso de uso #1", topic: ctx.idea.slice(0, 80), cta: "DM para acceso beta" },
    { w: 2, channel: "email" as const, title: "Lo que aprendimos esta semana", topic: "Update semanal", cta: "Responde con feedback" },
    { w: 3, channel: "blog" as const, title: "Cómo funciona " + ctx.ventureName, topic: "Product walkthrough", cta: "Prueba gratis" },
    { w: 3, channel: "social" as const, title: "Testimonial beta user", topic: "Prueba social", cta: "Únete al beta" },
    { w: 3, channel: "email" as const, title: "Invitación launch day", topic: "Countdown", cta: "Reserva tu plaza" },
    { w: 4, channel: "blog" as const, title: "Lanzamiento oficial", topic: "Launch post", cta: "Empieza ahora" },
    { w: 4, channel: "social" as const, title: "🚀 Estamos live", topic: "Launch announcement", cta: "Link en bio" },
    { w: 4, channel: "email" as const, title: "Ya disponible — empieza hoy", topic: "Launch email", cta: "Activar cuenta" },
  ];

  for (const t of topics) {
    const day = DAYS[id % DAYS.length];
    entries.push({
      id: `cc-${++id}`,
      week: t.w,
      day,
      channel: t.channel,
      title: t.title,
      topic: t.topic,
      cta: t.cta,
    });
  }

  return entries;
}
