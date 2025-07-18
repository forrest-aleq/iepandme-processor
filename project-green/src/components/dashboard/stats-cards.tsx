import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, Upload, TrendingUp } from "lucide-react"

interface StatsCardsProps {
  totalStudents: number
  totalDocuments: number
  currentMonthUploads: number
  isProUser: boolean
}

export function StatsCards({ totalStudents, totalDocuments, currentMonthUploads, isProUser }: StatsCardsProps) {
  const stats = [
    {
      title: "Total Students",
      value: totalStudents,
      icon: Users,
      description: "Students in your system",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Documents",
      value: totalDocuments,
      icon: FileText,
      description: "Documents processed",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "This Month",
      value: currentMonthUploads,
      icon: Upload,
      description: isProUser ? "Uploads this month" : `${currentMonthUploads}/3 uploads used`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Plan Status",
      value: isProUser ? "Pro" : "Free",
      icon: TrendingUp,
      description: isProUser ? "Unlimited uploads" : "Upgrade for more",
      color: isProUser ? "text-yellow-600" : "text-gray-600",
      bgColor: isProUser ? "bg-yellow-50" : "bg-gray-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className={`p-2 rounded-md ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </div>
              {stat.title === "Plan Status" && (
                <Badge variant={isProUser ? "default" : "secondary"}>{stat.value}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
