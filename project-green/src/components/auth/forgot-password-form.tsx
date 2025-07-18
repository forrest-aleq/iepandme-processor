"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import { resetPassword } from "@/lib/supabase/auth"
import { useToast } from "@/components/ui/use-toast"

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true)

    try {
      await resetPassword(data.email)
      setEmailSent(true)
      toast({
        title: "Reset link sent",
        description: "Check your email for a link to reset your password.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          </div>
          <Button variant="outline" className="w-full bg-transparent" asChild>
            <a href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="Enter your email" className="pl-10" {...register("email")} />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send Reset Link
          </Button>
        </form>

        <div className="text-center">
          <Button variant="ghost" asChild>
            <a href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
