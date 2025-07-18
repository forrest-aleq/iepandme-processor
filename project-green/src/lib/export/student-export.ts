import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]
type Document = Database["public"]["Tables"]["documents"]["Row"]

interface StudentWithStats extends Student {
  document_count: number
  latest_document_date: string | null
  document_types: string[]
}

export async function exportStudentsToCSV(userId: string): Promise<string> {
  const supabase = createServerSupabaseClient()

  // Get students with document statistics
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      *,
      documents (
        id,
        document_type,
        created_at
      )
    `)
    .eq("user_id", userId)
    .order("last_name", { ascending: true })

  if (error) {
    throw new Error("Failed to fetch students for export")
  }

  // Transform data for CSV
  const csvData = students.map((student: any) => {
    const documents = student.documents || []
    const documentTypes = [...new Set(documents.map((d: any) => d.document_type).filter(Boolean))]
    const latestDoc = documents.length > 0 
      ? new Date(Math.max(...documents.map((d: any) => new Date(d.created_at).getTime())))
      : null

    return {
      "First Name": student.first_name,
      "Last Name": student.last_name,
      "Date of Birth": student.date_of_birth || "",
      "Grade Level": student.grade_level || "",
      "School": student.school || "",
      "Case Manager": student.case_manager || "",
      "Document Count": documents.length,
      "Document Types": documentTypes.join(", "),
      "Latest Document": latestDoc ? latestDoc.toLocaleDateString() : "",
      "Created Date": new Date(student.created_at).toLocaleDateString(),
    }
  })

  // Convert to CSV
  if (csvData.length === 0) {
    return "No students to export"
  }

  const headers = Object.keys(csvData[0])
  const csvContent = [
    headers.join(","),
    ...csvData.map(row => 
      headers.map(header => {
        const value = row[header as keyof typeof row]
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(",")
    )
  ].join("\n")

  return csvContent
}

export async function exportStudentDetailToPDF(studentId: string, userId: string): Promise<Buffer> {
  const supabase = createServerSupabaseClient()

  // Get student with full document details
  const { data: student, error } = await supabase
    .from("students")
    .select(`
      *,
      documents (
        id,
        file_name,
        document_type,
        processing_status,
        created_at,
        extraction_data
      )
    `)
    .eq("id", studentId)
    .eq("user_id", userId)
    .single()

  if (error || !student) {
    throw new Error("Student not found")
  }

  // Generate HTML content for PDF
  const htmlContent = generateStudentReportHTML(student)
  
  // In a real implementation, you'd use a library like puppeteer or jsPDF
  // For now, we'll return a placeholder buffer
  return Buffer.from(htmlContent, 'utf-8')
}

function generateStudentReportHTML(student: any): string {
  const documents = student.documents || []
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Report - ${student.first_name} ${student.last_name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .document-list { margin-top: 20px; }
        .document-item { padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Student Report</h1>
        <h2>${student.first_name} ${student.last_name}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h3>Student Information</h3>
        <table>
          <tr><td><strong>Name:</strong></td><td>${student.first_name} ${student.last_name}</td></tr>
          <tr><td><strong>Date of Birth:</strong></td><td>${student.date_of_birth || 'Not provided'}</td></tr>
          <tr><td><strong>Grade Level:</strong></td><td>${student.grade_level || 'Not provided'}</td></tr>
          <tr><td><strong>School:</strong></td><td>${student.school || 'Not provided'}</td></tr>
          <tr><td><strong>Case Manager:</strong></td><td>${student.case_manager || 'Not provided'}</td></tr>
          <tr><td><strong>Profile Created:</strong></td><td>${new Date(student.created_at).toLocaleDateString()}</td></tr>
        </table>
      </div>
      
      <div class="section">
        <h3>Documents (${documents.length})</h3>
        ${documents.length === 0 ? '<p>No documents uploaded yet.</p>' : `
          <div class="document-list">
            ${documents.map((doc: any) => `
              <div class="document-item">
                <h4>${doc.file_name}</h4>
                <p><strong>Type:</strong> ${doc.document_type?.toUpperCase() || 'Other'}</p>
                <p><strong>Status:</strong> ${doc.processing_status}</p>
                <p><strong>Uploaded:</strong> ${new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </body>
    </html>
  `
}
