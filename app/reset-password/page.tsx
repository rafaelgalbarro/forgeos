import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Restablecer contraseña — ForgeOS" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña nueva para tu cuenta ForgeOS"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
