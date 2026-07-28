/** Program 7000 — Community links / forum stub */

import type { CommunityChannel } from "./types";

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    id: "forum",
    name: "Foro de fundadores",
    description: "Discusiones, preguntas y showcases de ventures (próximamente).",
    href: "/community#forum",
    status: "coming-soon",
  },
  {
    id: "discord",
    name: "Discord ForgeOS",
    description: "Canal comunitario para beta y design partners.",
    href: "https://discord.gg/forgeos",
    status: "coming-soon",
  },
  {
    id: "github",
    name: "GitHub Discussions",
    description: "Feedback técnico, issues y roadmap público.",
    href: "https://github.com/forgeos/discussions",
    status: "coming-soon",
  },
  {
    id: "support",
    name: "Centro de soporte",
    description: "Artículos de ayuda, waitlist e invitaciones beta.",
    href: "/support",
    status: "live",
  },
  {
    id: "feedback",
    name: "Feedback widget",
    description: "Envía bugs, features y comentarios desde cualquier página.",
    href: "/feedback",
    status: "live",
  },
];

export function listCommunityChannels(): CommunityChannel[] {
  return COMMUNITY_CHANNELS;
}

export function getLiveCommunityChannels(): CommunityChannel[] {
  return COMMUNITY_CHANNELS.filter((c) => c.status === "live");
}
