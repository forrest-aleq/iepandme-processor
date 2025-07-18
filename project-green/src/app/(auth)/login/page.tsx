import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">IEPandMe</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <a href="/signup" className="font-medium text-primary hover:text-primary/80">
              create a new account
            </a>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
