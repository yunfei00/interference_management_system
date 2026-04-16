import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { PublicAuthLayout } from "@/components/public-auth-layout";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthLayout
      title="Forgot Password"
      description="Request a password reset without leaking whether an account exists."
    >
      <ForgotPasswordForm />
    </PublicAuthLayout>
  );
}
