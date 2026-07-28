import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Recuperar contraseña — ForgeOS" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recuperar acceso" subtitle="Restablecer contraseña o verificar email">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
