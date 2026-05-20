import { withAuth } from "next-auth/middleware"

export const proxy = withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - api/health (health check)
     * - login (custom login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|api/health|login|_next/static|_next/image|favicon.ico).*)",
  ],
}
