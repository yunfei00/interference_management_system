import { AuthGate } from "@/components/auth-gate";

export default function RegisterPage() {
  return <AuthGate defaultTab="register" />;
}
