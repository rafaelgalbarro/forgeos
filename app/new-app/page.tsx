import { redirect } from "next/navigation";

/** Legacy / broken link from templates — route to home */
export default function NewAppPage() {
  redirect("/");
}
