"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Settings, CreditCard, LogOut, Crown } from "lucide-react"
import { signOut } from "@/lib/supabase/auth"
import { getInitials } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type { User as SupabaseUser } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

interface UserMenuProps {
  user: SupabaseUser
  profile: Profile | null
  subscription: Subscription | null
}

export function UserMenu({ user, profile, subscription }: UserMenuProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"
  const displayName = profile?.full_name || user.email?.split("@")[0] || "User"

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      })
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {isProUser && <Crown className="h-4 w-4 text-yellow-600" />}
            </div>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            {subscription && (
              <Badge variant={isProUser ? "default" : "secondary"} className="w-fit">
                {isProUser ? "Pro" : "Free"}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/billing" className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={loading} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
