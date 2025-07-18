"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Filter } from "lucide-react"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface StudentSearchProps {
  students: Student[]
  onFilteredStudents: (students: Student[]) => void
}

export function StudentSearch({ students, onFilteredStudents }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [gradeFilter, setGradeFilter] = useState<string>("all")
  const [schoolFilter, setSchoolFilter] = useState<string>("all")

  // Get unique values for filters
  const uniqueGrades = useMemo(() => {
    const grades = students
      .map((student) => student.grade_level)
      .filter((grade): grade is string => Boolean(grade))
      .filter((grade, index, array) => array.indexOf(grade) === index)
      .sort()
    return grades
  }, [students])

  const uniqueSchools = useMemo(() => {
    const schools = students
      .map((student) => student.school)
      .filter((school): school is string => Boolean(school))
      .filter((school, index, array) => array.indexOf(school) === index)
      .sort()
    return schools
  }, [students])

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    let filtered = students

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(term) ||
          student.last_name.toLowerCase().includes(term) ||
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(term) ||
          student.school?.toLowerCase().includes(term) ||
          student.case_manager?.toLowerCase().includes(term),
      )
    }

    // Grade filter
    if (gradeFilter !== "all") {
      filtered = filtered.filter((student) => student.grade_level === gradeFilter)
    }

    // School filter
    if (schoolFilter !== "all") {
      filtered = filtered.filter((student) => student.school === schoolFilter)
    }

    return filtered
  }, [students, searchTerm, gradeFilter, schoolFilter])

  // Update parent component when filters change
  useMemo(() => {
    onFilteredStudents(filteredStudents)
  }, [filteredStudents, onFilteredStudents])

  const clearFilters = () => {
    setSearchTerm("")
    setGradeFilter("all")
    setSchoolFilter("all")
  }

  const hasActiveFilters = searchTerm || gradeFilter !== "all" || schoolFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, school, or case manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Grade Filter */}
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {uniqueGrades.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* School Filter */}
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by school" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {uniqueSchools.map((school) => (
              <SelectItem key={school} value={school}>
                {school}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2 bg-transparent">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredStudents.length} of {students.length} student{students.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Filters active</span>
          </div>
        )}
      </div>
    </div>
  )
}
