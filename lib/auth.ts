import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type Role = "admin" | "employee";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role === "admin" ? "/admin" : "/pos");
  }
  return user;
}
