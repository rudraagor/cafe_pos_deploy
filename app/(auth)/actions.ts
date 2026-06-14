"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import {
  checkRateLimit,
  clientIpFromServerAction,
} from "@/lib/security/rate-limit";

export type AuthState = { error?: string } | undefined;

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIpFromServerAction();
  const ipLimit = checkRateLimit({
    scope: "auth:login:ip",
    identifier: ip,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const emailLimit = checkRateLimit({
    scope: "auth:login:email",
    identifier: email || ip,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!ipLimit.ok || !emailLimit.ok) {
    return { error: "Too many login attempts. Try again in a few minutes." };
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      // Land on the role-aware home route, which sends admins to the
      // dashboard (/admin) and employees to the POS terminal (/pos).
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success; rethrow so Next can handle it.
    throw error;
  }
}
