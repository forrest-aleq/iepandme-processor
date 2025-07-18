"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LayoutDashboard, Users, Calendar, CreditCard, Settings, FileText, Upload, Crown } from "lucide-react"
import type { Database } from "@/types/database"

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

interface DashboardNavProps {
  subscription: Subscription | null
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Students",
    href: "/students",
    icon: Users,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    proOnly: true,
  },
  {
    name: "Upload",
    href: "/upload",
    icon: Upload,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function DashboardNav({ subscription }: DashboardNavProps) {
  const pathname = usePathname()
  const isProUser = subscription?.status === "active" || subscription?.status === "trialing"

  return (
    <div className="space-y-4">
      {/* Pro Status Card */}
      <Card className={cn("border-2", isProUser ? "border-yellow-200 bg-yellow-50" : "border-gray-200")}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            {isProUser ? (
              <>
                <Crown className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">Pro Plan</p>
                  <p className="text-sm text-yellow-600">Unlimited uploads</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-5 w-5 rounded-full bg-gray-300" />
                <div>
                  <p className="font-semibold text-gray-700">Free Plan</p>
                  <p className="text-sm text-gray-500">3 uploads/month</p>
                </div>
              </>
            )}
          </div>
          {!isProUser && (
            <Link
              href="/billing"
              className="mt-3 block w-full text-center bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Upgrade to Pro
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Navigation Links */}
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const isDisabled = item.proOnly && !isProUser

          return (
            <Link
              key={item.name}
              href={isDisabled ? "/billing" : item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDisabled
                    ? "text-gray-400 hover:text-gray-500 cursor-not-allowed"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary-foreground" : isDisabled ? "text-gray-400" : "text-gray-500",
                )}
              />
              {item.name}
              {item.proOnly && !isProUser && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Pro
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
