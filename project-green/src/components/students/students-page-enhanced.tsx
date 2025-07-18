"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { AdvancedFilters, type FilterState } from "./advanced-filters"
import { BulkActions } from "./bulk-actions"
import { formatDate } from "@/lib/utils"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface StudentsPageEnhancedProps {
  students: Student[]
}

export function StudentsPageEnhanced({ students }: StudentsPageEnhancedProps) {
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    grade: "all",
    school: "all",
    dateRange: { from: "", to: "" },
    hasDocuments: "all",
    documentType: "all",
  })

  // Apply filters to students
  const filteredStudents = useMemo(() => {
    let filtered = students

    // Text search
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(searchTerm) ||
          student.last_name.toLowerCase().includes(searchTerm) ||
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm) ||
          student.school?.toLowerCase().includes(searchTerm) ||
          student.case_manager?.toLowerCase().includes(searchTerm),
      )
    }

    // Grade filter
    if (filters.grade !== "all") {
      filtered = filtered.filter((student) => student.grade_level === filters.grade)
    }

    // School filter
    if (filters.school !== "all") {
      filtered = filtered.filter((student) => student.school === filters.school)
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((student) => {
        const createdDate = new Date(student.created_at)
        const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null
        const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null

        if (fromDate && createdDate < fromDate) return false
        if (toDate && createdDate > toDate) return false
        return true
      })
    }

    return filtered
  }, [students, filters])

  const handleStudentSelect = (student: Student, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, student])
    } else {
      setSelectedStudents((prev) => prev.filter((s) => s.id !== student.id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents)
    } else {
      setSelectedStudents([])
    }
  }

  const handleActionComplete = () => {
    // Refresh would happen here in a real app
    setSelectedStudents([])
  }

  const isStudentSelected = (student: Student) => {
    return selectedStudents.some((s) => s.id === student.id)
  }

  const allSelected = filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length
  const someSelected = selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length

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
          {/* Advanced Filters */}
          <AdvancedFilters students={students} onFilterChange={setFilters} />

          {/* Bulk Actions */}
          <BulkActions
            selectedStudents={selectedStudents}
            onActionComplete={handleActionComplete}
            onClearSelection={() => setSelectedStudents([])}
          />

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No students match your search criteria</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected
                      }}
                    />
                    Students ({filteredStudents.length})
                  </CardTitle>
                  {selectedStudents.length > 0 && (
                    <span className="text-sm text-muted-foreground">{selectedStudents.length} selected</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <Card key={student.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Checkbox
                            checked={isStudentSelected(student)}
                            onCheckedChange={(checked) => handleStudentSelect(student, checked as boolean)}
                          />
                          <CardTitle className="text-lg flex-1 ml-3">
                            {student.first_name} {student.last_name}
                          </CardTitle>
                        </div>
                        <CardDescription>
                          {student.grade_level && `Grade ${student.grade_level}`}
                          {student.school && ` • ${student.school}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {student.case_manager && <p>Case Manager: {student.case_manager}</p>}
                          {student.date_of_birth && <p>DOB: {new Date(student.date_of_birth).toLocaleDateString()}</p>}
                          <p>Created: {formatDate(student.created_at)}</p>
                        </div>
                        <Button asChild className="w-full mt-4 bg-transparent" variant="outline">
                          <Link href={`/students/${student.id}`}>View Details</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
