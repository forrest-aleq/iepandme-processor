import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "@/types/database"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
