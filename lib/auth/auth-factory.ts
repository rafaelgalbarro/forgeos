/** Program 3000 — Auth provider factory. */

import { getAuthProviderId } from "./config";
import type { AuthProvider } from "./provider-interface";
import { localAuthAdapter } from "./adapters/local-adapter";
import { supabaseAuthAdapter } from "./adapters/supabase-auth-adapter";
import { authJsAdapter } from "./adapters/authjs-adapter";

export function getAuthProvider(): AuthProvider {
  switch (getAuthProviderId()) {
    case "supabase":
      return supabaseAuthAdapter;
    case "authjs":
      return authJsAdapter;
    default:
      return localAuthAdapter;
  }
}
