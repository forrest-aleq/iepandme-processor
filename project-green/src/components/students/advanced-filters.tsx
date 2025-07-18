"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Filter, X, Save, Clock } from "lucide-react"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]

interface AdvancedFiltersProps {
  students: Student[]
  onFilterChange: (filters: FilterState) => void
  className?: string
}

export interface FilterState {
  search: string
  grade: string
  school: string
  dateRange: {
    from: string
    to: string
  }
  hasDocuments: string
  documentType: string
}

const initialFilters: FilterState = {
  search: "",
  grade: "all",
  school: "all",
  dateRange: { from: "", to: "" },
  hasDocuments: "all",
  documentType: "all",
}

export function AdvancedFilters({ students, onFilterChange, className }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [savedFilters, setSavedFilters] = useState<{ name: string; filters: FilterState }[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get unique values for dropdowns
  const uniqueGrades = [...new Set(students.map((s) => s.grade_level).filter(Boolean))].sort()
  const uniqueSchools = [...new Set(students.map((s) => s.school).filter(Boolean))].sort()

  // Apply filters whenever they change
  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const saveCurrentFilters = () => {
    const name = `Filter ${new Date().toLocaleString()}`
    setSavedFilters((prev) => [...prev, { name, filters }])
  }

  const loadSavedFilter = (savedFilter: { name: string; filters: FilterState }) => {
    setFilters(savedFilter.filters)
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "dateRange") {
      return value.from || value.to
    }
    return value !== "all" && value !== ""
  })

  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "dateRange") {
      return count + (value.from ? 1 : 0) + (value.to ? 1 : 0)
    }
    return count + (value !== "all" && value !== "" ? 1 : 0)
  }, 0)

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
              {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} active</Badge>}
            </CardTitle>
            <CardDescription>Filter and search students with advanced criteria</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="bg-transparent">
            {showAdvanced ? "Hide" : "Show"} Advanced
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="space-y-2">
          <Label>Search Students</Label>
          <Input
            placeholder="Search by name, school, or case manager..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade Level</Label>
            <Select value={filters.grade} onValueChange={(value) => updateFilter("grade", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All grades" />
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
          </div>

          <div className="space-y-2">
            <Label>School</Label>
            <Select value={filters.school} onValueChange={(value) => updateFilter("school", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All schools" />
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
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Created Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.dateRange.from}
                      onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, from: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={filters.dateRange.to}
                      onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, to: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Document Status</Label>
                  <Select value={filters.hasDocuments} onValueChange={(value) => updateFilter("hasDocuments", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="with">With Documents</SelectItem>
                      <SelectItem value="without">Without Documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map((saved, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => loadSavedFilter(saved)}
                        className="bg-transparent"
                      >
                        <Clock className="mr-2 h-3 w-3" />
                        {saved.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Filter Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="sm" className="bg-transparent">
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
          {hasActiveFilters && (
            <Button variant="outline" onClick={saveCurrentFilters} size="sm" className="bg-transparent">
              <Save className="mr-2 h-4 w-4" />
              Save Filter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
