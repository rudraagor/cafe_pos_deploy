"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type AuthState = { error?: string } | undefined;

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
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
