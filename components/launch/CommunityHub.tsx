"use client";

import Link from "next/link";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listCommunityChannels, getLegalHubLinks, LEGAL_HUB_INTRO } from "@/lib/forgeos-launch";
import { submitContactForm, CONTACT_CHANNELS } from "@/lib/forgeos-launch/contact";
import { NewsletterSignup } from "./NewsletterSignup";

export function CommunityHub() {
  const channels = listCommunityChannels();
  const legalLinks = getLegalHubLinks();

  function handleContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    submitContactForm({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      subject: String(data.get("subject") ?? ""),
      message: String(data.get("message") ?? ""),
    });
    form.reset();
  }

  return (
    <Stack gap="lg">
      <SectionHeader
        title="Comunidad ForgeOS"
        description="Canales comunitarios, soporte y contacto"
      />

      <Grid cols={2} gap="md">
        {channels.map((channel) => (
          <Panel key={channel.id} className="fhis-community-channel">
            <div className="fhis-community-channel-header">
              <h3>{channel.name}</h3>
              <Badge variant={channel.status === "live" ? "accent" : "default"}>
                {channel.status === "live" ? "Activo" : "Próximamente"}
              </Badge>
            </div>
            <p>{channel.description}</p>
            <Link href={channel.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Ir →
            </Link>
          </Panel>
        ))}
      </Grid>

      <SectionHeader title="Contacto" description="Formulario stub — datos en localStorage" />
      <Panel>
        <form onSubmit={handleContact} className="fhis-contact-form">
          <Stack gap="sm">
            <input name="name" placeholder="Nombre" className="fhis-input" required />
            <input name="email" type="email" placeholder="Email" className="fhis-input" required />
            <input name="subject" placeholder="Asunto" className="fhis-input" required />
            <textarea name="message" placeholder="Mensaje" className="fhis-input" rows={4} required />
            <button type="submit" className="fhis-btn fhis-btn-primary fhis-btn-sm">
              Enviar
            </button>
          </Stack>
        </form>
        <div className="fhis-contact-channels">
          {CONTACT_CHANNELS.map((c) => (
            <Link key={c.id} href={c.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              {c.label}
            </Link>
          ))}
        </div>
      </Panel>

      <NewsletterSignup />

      <SectionHeader title="Legal" description={LEGAL_HUB_INTRO} />
      <Grid cols={2} gap="md">
        {legalLinks.map((doc) => (
          <Panel key={doc.id} className="fhis-legal-link-card">
            <Badge variant={doc.status === "ready" ? "accent" : "default"}>
              {doc.status === "ready" ? "Disponible" : "Placeholder"}
            </Badge>
            <h3>{doc.title}</h3>
            <p>{doc.summary}</p>
            <Link href={doc.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Leer →
            </Link>
          </Panel>
        ))}
      </Grid>
    </Stack>
  );
}
