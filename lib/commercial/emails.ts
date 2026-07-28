/** Program 6000 — Email templates stub (no real send unless configured) */

import { isEmailSendingEnabled } from "./config";

export type EmailTemplateId =
  | "welcome"
  | "trial_started"
  | "trial_ending"
  | "invoice_paid"
  | "payment_failed"
  | "upgrade_confirmed"
  | "downgrade_scheduled";

export interface EmailTemplate {
  id: EmailTemplateId;
  subject: string;
  body: string;
}

const TEMPLATES: Record<EmailTemplateId, EmailTemplate> = {
  welcome: {
    id: "welcome",
    subject: "Bienvenido a ForgeOS",
    body: "Gracias por unirte a ForgeOS. Tu workspace está listo en /os.",
  },
  trial_started: {
    id: "trial_started",
    subject: "Tu trial de ForgeOS ha comenzado",
    body: "Tienes 14 días para explorar todas las funciones de tu plan.",
  },
  trial_ending: {
    id: "trial_ending",
    subject: "Tu trial termina pronto",
    body: "Quedan 3 días de trial. Actualiza tu plan en /billing para no perder acceso.",
  },
  invoice_paid: {
    id: "invoice_paid",
    subject: "Factura pagada — ForgeOS",
    body: "Hemos recibido tu pago. Consulta tus facturas en /billing.",
  },
  payment_failed: {
    id: "payment_failed",
    subject: "Problema con tu pago — ForgeOS",
    body: "No pudimos procesar tu pago. Actualiza tu método en /billing.",
  },
  upgrade_confirmed: {
    id: "upgrade_confirmed",
    subject: "Upgrade confirmado — ForgeOS",
    body: "Tu plan ha sido actualizado. Disfruta de las nuevas funciones.",
  },
  downgrade_scheduled: {
    id: "downgrade_scheduled",
    subject: "Downgrade programado — ForgeOS",
    body: "Tu cambio de plan será efectivo al final del periodo actual.",
  },
};

export function getEmailTemplate(id: EmailTemplateId): EmailTemplate {
  return TEMPLATES[id];
}

export interface SendEmailResult {
  sent: boolean;
  mode: "dry-run" | "live";
  templateId: EmailTemplateId;
  to: string;
  message: string;
}

export async function sendCommercialEmail(
  templateId: EmailTemplateId,
  to: string,
  vars?: Record<string, string>
): Promise<SendEmailResult> {
  const template = getEmailTemplate(templateId);
  let body = template.body;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      body = body.replace(`{{${k}}}`, v);
    }
  }

  if (!isEmailSendingEnabled()) {
    return {
      sent: false,
      mode: "dry-run",
      templateId,
      to,
      message: `Dry-run: "${template.subject}" → ${to}`,
    };
  }

  return {
    sent: true,
    mode: "live",
    templateId,
    to,
    message: `Email enviado: ${template.subject}`,
  };
}
