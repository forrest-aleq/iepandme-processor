import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Upload } from "lucide-react"
import Link from "next/link"

interface UsageCardProps {
  currentUploads: number
  uploadLimit: number
  isProUser: boolean
}

export function UsageCard({ currentUploads, uploadLimit, isProUser }: UsageCardProps) {
  const usagePercentage = isProUser ? 0 : (currentUploads / uploadLimit) * 100
  const uploadsRemaining = isProUser ? "Unlimited" : Math.max(0, uploadLimit - currentUploads)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Usage
          {isProUser && <Crown className="h-4 w-4 text-yellow-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProUser ? (
          <div className="text-center space-y-2">
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pro Plan</Badge>
            <p className="text-2xl font-bold text-green-600">Unlimited</p>
            <p className="text-sm text-muted-foreground">Uploads this month: {currentUploads}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used this month</span>
                <span>
                  {currentUploads} / {uploadLimit}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                {uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining
              </p>
              {currentUploads >= uploadLimit && (
                <p className="text-sm text-destructive">You've reached your monthly limit</p>
              )}
            </div>

            <Button asChild className="w-full" variant={currentUploads >= uploadLimit ? "default" : "outline"}>
              <Link href="/billing">{currentUploads >= uploadLimit ? "Upgrade Now" : "Upgrade to Pro"}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
