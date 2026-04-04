import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

export default function LegacyToolsRedirectPage() {
  permanentRedirect("/dashboard/electromagnetic/interference/tools" as Route);
}
