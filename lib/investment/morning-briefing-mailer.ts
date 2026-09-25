/**
 * Morning Briefing mailer.
 *
 * Real SMTP path when SMTP_HOST (+ credentials) are present and
 * INVESTMENT_BRIEFING_EMAIL_ENABLED=true.
 * Otherwise writes the intended payload and returns QUEUED / SKIPPED_NO_SMTP
 * without failing the briefing run.
 *
 * Never hardcodes secrets — only the default recipient address is OK.
 */

import type {
  MorningBriefingDocument,
  MorningBriefingEmailPayload,
  MorningBriefingEmailStatus,
} from "./morning-briefing.types";
import {
  renderMorningBriefingHtml,
  renderMorningBriefingPlainText,
} from "./morning-briefing-pdf";

export const DEFAULT_BRIEFING_EMAIL_TO = "rafaelgalbarro@gmail.com";

export type MorningBriefingMailConfig = {
  readonly enabled: boolean;
  readonly to: string;
  readonly from: string;
  readonly smtpHost: string | null;
  readonly smtpPort: number;
  readonly smtpUser: string | null;
  readonly smtpPass: string | null;
  readonly smtpSecure: boolean;
};

export function resolveMorningBriefingMailConfig(
  env: NodeJS.ProcessEnv = process.env,
): MorningBriefingMailConfig {
  const enabled =
    String(env.INVESTMENT_BRIEFING_EMAIL_ENABLED ?? "").toLowerCase() === "true";
  const to =
    (env.INVESTMENT_BRIEFING_EMAIL_TO ?? "").trim() || DEFAULT_BRIEFING_EMAIL_TO;
  const from =
    (env.INVESTMENT_BRIEFING_EMAIL_FROM ?? env.SMTP_FROM ?? "").trim() ||
    "forgeos-briefing@localhost";
  const smtpHost = (env.SMTP_HOST ?? "").trim() || null;
  const smtpPort = Number(env.SMTP_PORT ?? "587") || 587;
  const smtpUser = (env.SMTP_USER ?? "").trim() || null;
  const smtpPass = (env.SMTP_PASS ?? env.SMTP_PASSWORD ?? "").trim() || null;
  const smtpSecure =
    String(env.SMTP_SECURE ?? "").toLowerCase() === "true" || smtpPort === 465;

  return { enabled, to, from, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure };
}

export function buildMorningBriefingEmailPayload(
  doc: MorningBriefingDocument,
  pdfRelativePath: string,
  config: MorningBriefingMailConfig = resolveMorningBriefingMailConfig(),
): MorningBriefingEmailPayload {
  return {
    to: config.to,
    from: config.from,
    subject: `ForgeOS Morning Briefing — ${doc.briefingDate}`,
    text: renderMorningBriefingPlainText(doc),
    html: renderMorningBriefingHtml(doc),
    attachmentRelativePath: pdfRelativePath,
    briefingId: doc.id,
    generatedAt: doc.generatedAt,
  };
}

export type SendMorningBriefingEmailResult = {
  readonly status: MorningBriefingEmailStatus;
  readonly payload: MorningBriefingEmailPayload;
  readonly detail: string;
};

/**
 * Attempt SMTP send when configured; otherwise stub (payload still returned for disk).
 * Never throws — email failure must not fail the briefing.
 */
export async function sendMorningBriefingEmail(options: {
  readonly document: MorningBriefingDocument;
  readonly pdfRelativePath: string;
  readonly pdfBytes: Uint8Array;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<SendMorningBriefingEmailResult> {
  const config = resolveMorningBriefingMailConfig(options.env);
  const payload = buildMorningBriefingEmailPayload(
    options.document,
    options.pdfRelativePath,
    config,
  );

  if (!config.enabled) {
    return {
      status: "SKIPPED_DISABLED",
      payload,
      detail: "INVESTMENT_BRIEFING_EMAIL_ENABLED is not true — payload recorded only",
    };
  }

  if (!config.smtpHost) {
    return {
      status: "SKIPPED_NO_SMTP",
      payload,
      detail: "SMTP_HOST missing — payload recorded as QUEUED/SKIPPED_NO_SMTP",
    };
  }

  try {
    const sent = await trySmtpSend({
      config,
      payload,
      pdfBytes: options.pdfBytes,
      pdfFileName: "morning-briefing.pdf",
    });
    if (sent.ok) {
      return { status: "SENT", payload, detail: sent.detail };
    }
    return {
      status: "QUEUED",
      payload,
      detail: `SMTP unavailable (${sent.detail}) — payload queued on disk`,
    };
  } catch (error) {
    return {
      status: "FAILED",
      payload,
      detail: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

/**
 * Lightweight SMTP client (AUTH LOGIN + DATA) — no nodemailer dependency.
 * Falls back gracefully when connection/auth fails.
 */
async function trySmtpSend(args: {
  readonly config: MorningBriefingMailConfig;
  readonly payload: MorningBriefingEmailPayload;
  readonly pdfBytes: Uint8Array;
  readonly pdfFileName: string;
}): Promise<{ ok: boolean; detail: string }> {
  const net = await import("node:net");
  const tls = await import("node:tls");
  const { config, payload, pdfBytes, pdfFileName } = args;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({ ok, detail });
    };

    const socket = config.smtpSecure
      ? tls.connect({ host: config.smtpHost!, port: config.smtpPort, servername: config.smtpHost! })
      : net.connect({ host: config.smtpHost!, port: config.smtpPort });

    const timeout = setTimeout(() => finish(false, "SMTP timeout"), 15_000);
    let buffer = "";
    let step:
      | "greet"
      | "ehlo"
      | "starttls"
      | "auth"
      | "user"
      | "pass"
      | "mail"
      | "rcpt"
      | "data"
      | "body"
      | "quit" = "greet";

    const boundary = `forgeos_${Date.now()}`;
    const pdfB64 = Buffer.from(pdfBytes).toString("base64").replace(/(.{76})/g, "$1\r\n");

    const mime = [
      `From: ${payload.from}`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      payload.text,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      payload.html,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFileName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${pdfFileName}"`,
      "",
      pdfB64,
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const write = (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    };

    socket.setEncoding("utf8");
    socket.on("error", (err) => {
      clearTimeout(timeout);
      finish(false, err.message);
    });

    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!/^\d{3}/.test(line)) continue;
        const code = Number(line.slice(0, 3));

        if (step === "greet" && code === 220) {
          write(`EHLO forgeos-briefing`);
          step = "ehlo";
          continue;
        }
        if (step === "ehlo" && code >= 200 && code < 400) {
          // wait for final EHLO line (not hyphen-continued) — simple: proceed on first 250
          if (line.startsWith("250-")) continue;
          if (config.smtpUser && config.smtpPass) {
            write("AUTH LOGIN");
            step = "auth";
          } else {
            write(`MAIL FROM:<${payload.from}>`);
            step = "mail";
          }
          continue;
        }
        if (step === "auth" && code === 334) {
          write(Buffer.from(config.smtpUser ?? "").toString("base64"));
          step = "user";
          continue;
        }
        if (step === "user" && code === 334) {
          write(Buffer.from(config.smtpPass ?? "").toString("base64"));
          step = "pass";
          continue;
        }
        if (step === "pass" && code === 235) {
          write(`MAIL FROM:<${payload.from}>`);
          step = "mail";
          continue;
        }
        if (step === "pass" && code >= 400) {
          clearTimeout(timeout);
          finish(false, `AUTH failed: ${line}`);
          continue;
        }
        if (step === "mail" && code === 250) {
          write(`RCPT TO:<${payload.to}>`);
          step = "rcpt";
          continue;
        }
        if (step === "rcpt" && (code === 250 || code === 251)) {
          write("DATA");
          step = "data";
          continue;
        }
        if (step === "data" && code === 354) {
          socket.write(`${mime}\r\n.\r\n`);
          step = "body";
          continue;
        }
        if (step === "body" && code === 250) {
          write("QUIT");
          step = "quit";
          clearTimeout(timeout);
          finish(true, "SMTP accepted message");
          continue;
        }
        if (code >= 400) {
          clearTimeout(timeout);
          finish(false, line);
        }
      }
    });

    // STARTTLS not fully implemented — ports 465 (implicit TLS) or open relay / AUTH on 587 without STARTTLS upgrade.
    // If STARTTLS is required and AUTH fails, status becomes QUEUED with payload on disk.
    void step === "starttls";
  });
}
