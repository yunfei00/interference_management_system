import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

export default function LegacyHostsRedirectPage() {
  permanentRedirect("/dashboard/electromagnetic/interference/hosts" as Route);
}
