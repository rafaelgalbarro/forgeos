import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Iniciar sesión — ForgeOS Investment" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Plataforma privada — acceso restringido al Founder"
    >
      <LoginForm />
    </AuthShell>
  );
}
