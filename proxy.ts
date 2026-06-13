import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Kitchen Display is a fixed public URL meant for a shared kitchen screen.
  if (path === "/kds" || path.startsWith("/kds/")) {
    return;
  }

  const isAuthRoute = path === "/login" || path === "/signup";
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/pos", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  if (path.startsWith("/admin") && role !== "admin") {
    return Response.redirect(new URL("/pos", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
