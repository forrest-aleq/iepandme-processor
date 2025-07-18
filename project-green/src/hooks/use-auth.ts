"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { User } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  })
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

        if (error) {
          if (error.code !== "PGRST116") {
            // PGRST116 is "not found", which is expected for new users
            console.error("Error fetching profile:", error)
            setState((prev) => ({ ...prev, error: "Failed to load profile" }))
          }
          return null
        }

        setState((prev) => ({ ...prev, profile: data, error: null }))
        return data
      } catch (error) {
        console.error("Unexpected error fetching profile:", error)
        setState((prev) => ({ ...prev, error: "Unexpected error loading profile" }))
        return null
      }
    },
    [supabase],
  )

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (mounted) {
        setState((prev) => ({ ...prev, user: session?.user || null }))
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
        setState((prev) => ({ ...prev, loading: false }))
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setState((prev) => ({ ...prev, user: session?.user || null, error: null }))

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setState((prev) => ({ ...prev, profile: null }))
      }

      setState((prev) => ({ ...prev, loading: false }))

      // Handle redirects
      if (event === "SIGNED_IN") {
        router.push("/dashboard")
      } else if (event === "SIGNED_OUT") {
        router.push("/login")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, fetchProfile, supabase.auth])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error("Error signing out:", error)
      setState((prev) => ({ ...prev, error: "Failed to sign out" }))
      throw error
    }
  }, [supabase])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    signOut,
    clearError,
    isAuthenticated: !!state.user,
  }
}
