"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { StudentSearch } from "./student-search"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface StudentsPageClientProps {
  students: Student[]
}

export function StudentsPageClient({ students }: StudentsPageClientProps) {
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage your student profiles and their IEP documents</p>
        </div>
        <Button asChild>
          <Link href="/students/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Students Yet</CardTitle>
            <CardDescription>Get started by adding your first student profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You haven't added any students yet</p>
              <Button asChild>
                <Link href="/students/new">Add Your First Student</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Search and Filters */}
          <StudentSearch students={students} onFilteredStudents={setFilteredStudents} />

          {/* Students Grid */}
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No students match your search criteria</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {student.first_name} {student.last_name}
                    </CardTitle>
                    <CardDescription>
                      {student.grade_level && `Grade ${student.grade_level}`}
                      {student.school && ` • ${student.school}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {student.case_manager && <p>Case Manager: {student.case_manager}</p>}
                      {student.date_of_birth && <p>DOB: {new Date(student.date_of_birth).toLocaleDateString()}</p>}
                    </div>
                    <Button asChild className="w-full mt-4 bg-transparent" variant="outline">
                      <Link href={`/students/${student.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
