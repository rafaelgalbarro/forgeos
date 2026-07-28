import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Iniciar sesión — ForgeOS" };

export default function LoginPage() {
  return (
    <AuthShell title="Iniciar sesión" subtitle="Accede a tu workspace ForgeOS">
      <LoginForm />
    </AuthShell>
  );
}
