import { Suspense } from "react";

import { PublicAuthLayout } from "@/components/public-auth-layout";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <PublicAuthLayout
      title="Reset Password"
      description="Reset your password using the one-time token delivered through the configured email backend."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </PublicAuthLayout>
  );
}
