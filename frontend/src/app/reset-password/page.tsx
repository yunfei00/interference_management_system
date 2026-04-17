import { Suspense } from "react";

import { PublicAuthLayout } from "@/components/public-auth-layout";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <PublicAuthLayout
      titleKey="auth.reset.title"
      descriptionKey="auth.reset.subtitle"
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </PublicAuthLayout>
  );
}
