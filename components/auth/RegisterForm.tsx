"use client";

import Link from "next/link";
import { founderPrivatePlatformMessage } from "@/lib/auth/founder";

/** Public registration disabled — private Founder platform. */
export function RegisterForm() {
  return (
    <div className="fhis-auth-form">
      <p className="fhis-auth-error" role="status">
        {founderPrivatePlatformMessage()}
      </p>
      <p className="fhis-auth-subtitle">El registro público está deshabilitado.</p>
      <p className="fhis-auth-links">
        <Link href="/login">Ir a iniciar sesión</Link>
      </p>
    </div>
  );
}
