import "server-only";

import { Resend } from "resend";
import { passwordResetTtlMinutes } from "@/lib/auth/reset-token";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "noreply@forgeos.trade";
}

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.FORGEOS_PUBLIC_URL?.trim() ||
    "https://forgeos.trade";
  return raw.replace(/\/$/, "");
}

export function buildPasswordResetUrl(token: string): string {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function resetEmailHtml(params: { resetUrl: string; email: string }): string {
  const minutes = passwordResetTtlMinutes();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recupera tu contraseña — ForgeOS</title>
</head>
<body style="margin:0;padding:0;background:#0b1220;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;">ForgeOS</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#f9fafb;">Recupera tu contraseña</h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#9ca3af;">
                Hemos recibido una solicitud para restablecer la contraseña de <strong style="color:#e5e7eb;">${params.email}</strong>.
              </p>
              <p style="margin:0 0 22px;">
                <a href="${params.resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:8px;">
                  Restablecer contraseña
                </a>
              </p>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#9ca3af;">
                Este enlace caduca en <strong style="color:#e5e7eb;">${minutes} minutos</strong>. Si no has solicitado este cambio, puedes ignorar este correo.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all;">
                Si el botón no funciona, copia este enlace:<br />${params.resetUrl}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#4b5563;">ForgeOS · forgeos.trade</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type SendPasswordResetResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/** Sends password-reset email via Resend. */
export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
}): Promise<SendPasswordResetResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY no configurada" };
  }

  const resetUrl = buildPasswordResetUrl(params.token);
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: params.to.trim().toLowerCase(),
      subject: "Recupera tu contraseña — ForgeOS",
      html: resetEmailHtml({ resetUrl, email: params.to.trim().toLowerCase() }),
      text: [
        "Recupera tu contraseña — ForgeOS",
        "",
        `Abre este enlace para elegir una nueva contraseña (válido ${passwordResetTtlMinutes()} minutos):`,
        resetUrl,
        "",
        "Si no has solicitado este cambio, ignora este correo.",
      ].join("\n"),
    });

    if (error) {
      return { ok: false, error: error.message || "Resend error" };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Resend send failed" };
  }
}

/** Lists Resend domains (for verification checks). Never logs API key. */
export async function listResendDomains(): Promise<{
  ok: boolean;
  domains: Array<{ name: string; status: string }>;
  error?: string;
}> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, domains: [], error: "RESEND_API_KEY missing" };
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, domains: [], error: `Resend domains HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      data?: Array<{ name?: string; status?: string }>;
    };
    const domains = (body.data ?? []).map((d) => ({
      name: String(d.name ?? ""),
      status: String(d.status ?? "unknown"),
    }));
    return { ok: true, domains };
  } catch (err) {
    return { ok: false, domains: [], error: err instanceof Error ? err.message : "domains failed" };
  }
}
