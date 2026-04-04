import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET() {
  return proxyProtectedJson("/api/v1/admin/users/department_options/");
}
