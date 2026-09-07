import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth/reset-token";
import { sendPasswordResetEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC_OK =
  "Si el email existe en ForgeOS, recibirás un enlace para restablecer tu contraseña.";

/**
 * POST { email } — sends Resend password-reset email (1h token).
 * Always returns a generic success message (no user enumeration on server).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email no válido." }, { status: 400 });
    }

    const token = createPasswordResetToken(email);
    const sent = await sendPasswordResetEmail({ to: email, token });

    if (!sent.ok) {
      console.warn("[auth/forgot-password] Resend failed:", sent.error);
      return NextResponse.json(
        {
          success: false,
          message: "No se pudo enviar el email ahora. Inténtalo de nuevo en unos minutos.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: GENERIC_OK });
  } catch (error) {
    console.warn(
      "[auth/forgot-password] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, message: "Error al procesar la solicitud." },
      { status: 500 },
    );
  }
}
