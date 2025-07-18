import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/types/database"

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(ip: string, limit = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `rate_limit:${ip}`

  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count++
  return true
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Rate limiting
  const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown"
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "900" } })
  }

  // CSRF Protection for state-changing operations
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.headers.get("origin")
    const host = req.headers.get("host")

    if (origin && !origin.includes(host || "")) {
      return NextResponse.json({ error: "CSRF protection: Invalid origin" }, { status: 403 })
    }
  }

  const supabase = createMiddlewareClient<Database>({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/students", "/billing", "/calendar", "/settings", "/upload"]
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
    "/upload/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/api/:path*",
  ],
}
