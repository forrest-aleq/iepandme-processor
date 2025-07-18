"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

const studentSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  date_of_birth: z.string().optional(),
  grade_level: z.string().optional(),
  school: z.string().max(100, "School name must be less than 100 characters").optional(),
  case_manager: z.string().max(100, "Case manager name must be less than 100 characters").optional(),
})

type StudentFormData = z.infer<typeof studentSchema>

interface StudentFormProps {
  student?: Student
  mode: "create" | "edit"
}

const gradeOptions = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "Post-Secondary",
]

export function StudentForm({ student, mode }: StudentFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth || "",
          grade_level: student.grade_level || "",
          school: student.school || "",
          case_manager: student.case_manager || "",
        }
      : {},
  })

  const gradeLevel = watch("grade_level")

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true)

    try {
      const url = mode === "create" ? "/api/students" : `/api/students/${student?.id}`
      const method = mode === "create" ? "POST" : "PUT"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          date_of_birth: data.date_of_birth || null,
          grade_level: data.grade_level || null,
          school: data.school || null,
          case_manager: data.case_manager || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${mode} student`)
      }

      const result = await response.json()

      toast({
        title: mode === "create" ? "Student created!" : "Student updated!",
        description: `${data.first_name} ${data.last_name} has been ${mode === "create" ? "added" : "updated"} successfully.`,
      })

      if (mode === "create") {
        router.push(`/students/${result.student.id}`)
      } else {
        router.push(`/students/${student?.id}`)
      }
    } catch (error) {
      console.error(`${mode} student error:`, error)
      toast({
        title: `Failed to ${mode} student`,
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "create" ? "Add New Student" : `Edit ${student?.first_name} ${student?.last_name}`}
          </h1>
          <p className="text-muted-foreground">
            {mode === "create" ? "Create a new student profile" : "Update student information"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Enter the student's basic information to create their profile"
              : "Update the student's information below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="Enter first name"
                  {...register("first_name")}
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Enter last name"
                  {...register("last_name")}
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
              {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>}
            </div>

            {/* Grade Level */}
            <div className="space-y-2">
              <Label htmlFor="grade_level">Grade Level</Label>
              <Select value={gradeLevel} onValueChange={(value) => setValue("grade_level", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade_level && <p className="text-sm text-destructive">{errors.grade_level.message}</p>}
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input id="school" placeholder="Enter school name" {...register("school")} />
              {errors.school && <p className="text-sm text-destructive">{errors.school.message}</p>}
            </div>

            {/* Case Manager */}
            <div className="space-y-2">
              <Label htmlFor="case_manager">Case Manager</Label>
              <Input id="case_manager" placeholder="Enter case manager name" {...register("case_manager")} />
              {errors.case_manager && <p className="text-sm text-destructive">{errors.case_manager.message}</p>}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {mode === "create" ? "Create Student" : "Update Student"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
