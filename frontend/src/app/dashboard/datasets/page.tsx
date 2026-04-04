import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

export default function LegacyDatasetsRedirectPage() {
  permanentRedirect(
    "/dashboard/electromagnetic/interference/datasets" as Route,
  );
}
