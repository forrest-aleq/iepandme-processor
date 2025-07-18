"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./use-auth"
import type { Database } from "@/types/database"

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription")
        if (response.ok) {
          const data = await response.json()
          setSubscription(data.subscription)
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [user])

  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

  return {
    subscription,
    loading,
    isProUser,
  }
}
