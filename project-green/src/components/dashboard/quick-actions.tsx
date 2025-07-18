import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Calendar, FileText } from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  studentCount: number
}

export function QuickActions({ studentCount }: QuickActionsProps) {
  const actions = [
    {
      title: "Add Student",
      description: "Create a new student profile",
      icon: Plus,
      href: "/students/new",
      variant: "default" as const,
    },
    {
      title: "View Students",
      description: `Manage ${studentCount} student${studentCount !== 1 ? "s" : ""}`,
      icon: Users,
      href: "/students",
      variant: "outline" as const,
    },
    {
      title: "Calendar",
      description: "View upcoming dates",
      icon: Calendar,
      href: "/calendar",
      variant: "outline" as const,
    },
    {
      title: "All Documents",
      description: "Browse all documents",
      icon: FileText,
      href: "/documents",
      variant: "outline" as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <Button key={action.title} asChild variant={action.variant} className="w-full justify-start h-auto p-3">
            <Link href={action.href}>
              <div className="flex items-center space-x-3">
                <action.icon className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-xs opacity-70">{action.description}</p>
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
