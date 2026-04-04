import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

export default function LegacyCommandsRedirectPage() {
  permanentRedirect(
    "/dashboard/electromagnetic/interference/commands" as Route,
  );
}
