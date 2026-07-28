import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Crear cuenta — ForgeOS" };

export default function RegisterPage() {
  return (
    <AuthShell title="Crear cuenta" subtitle="User · Workspace · Organization">
      <RegisterForm />
    </AuthShell>
  );
}
