import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { PublicAuthLayout } from "@/components/public-auth-layout";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthLayout
      titleKey="auth.forgot.title"
      descriptionKey="auth.forgot.subtitle"
    >
      <ForgotPasswordForm />
    </PublicAuthLayout>
  );
}
