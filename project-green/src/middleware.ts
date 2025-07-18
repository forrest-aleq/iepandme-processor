import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/types/database"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/students", "/billing", "/calendar", "/settings"]
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Auth routes that should redirect if already authenticated
  const authRoutes = ["/login", "/signup", "/forgot-password"]
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname)

  // Redirect to login if not authenticated and trying to access protected routes
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Redirect root to appropriate page
  if (req.nextUrl.pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    } else {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/students/:path*",
    "/billing/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
}
