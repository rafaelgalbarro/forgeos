import { redirect } from "next/navigation";

export const metadata = { title: "Registro deshabilitado — ForgeOS" };

/** Public registration is disabled — private Founder platform. */
export default function RegisterPage() {
  redirect("/login?notice=private");
}
