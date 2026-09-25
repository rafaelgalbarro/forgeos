import { NextResponse } from "next/server";
import { verifyPasswordResetToken } from "@/lib/auth/reset-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { token } — validates reset token and returns the email for client-side password update.
 * POST { token, password } — validates only (password update is local-auth client store).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      password?: string;
    };
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ success: false, message: "Token requerido." }, { status: 400 });
    }

    const verified = verifyPasswordResetToken(token);
    if (!verified.ok) {
      return NextResponse.json({ success: false, message: verified.error }, { status: 400 });
    }

    if (body.password != null && String(body.password).length > 0 && String(body.password).length < 8) {
      return NextResponse.json(
        { success: false, message: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      email: verified.email,
      message: "Token válido. Puedes establecer una nueva contraseña.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "No se pudo validar el token.",
      },
      { status: 500 },
    );
  }
}
