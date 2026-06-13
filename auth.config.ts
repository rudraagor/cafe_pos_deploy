import type { NextAuthConfig } from "next-auth";

// Edge-safe configuration shared between the Node runtime (auth.ts) and the
// middleware. Must NOT import the database or bcrypt (those are Node-only).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "employee";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
