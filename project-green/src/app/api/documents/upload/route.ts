import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentMonthUploadCount, isUserPro } from "@/lib/supabase/database"
import { trackUsage } from "@/lib/stripe/usage"

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is pro or within upload limits
    const [userIsProUser, currentUploads] = await Promise.all([
      isUserPro(session.user.id),
      getCurrentMonthUploadCount(session.user.id),
    ])

    if (!userIsProUser && currentUploads >= 3) {
      return NextResponse.json(
        { error: "Upload limit exceeded. Upgrade to Pro for unlimited uploads." },
        { status: 403 },
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const studentId = formData.get("studentId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload PDF, DOC, or DOCX files." }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    // If studentId is provided, validate that the student belongs to the user
    if (studentId) {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("user_id", session.user.id)
        .single()

      if (studentError || !student) {
        return NextResponse.json({ error: "Invalid student ID" }, { status: 400 })
      }
    }

    // Convert file to buffer for storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique file path
    const fileExtension = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
    const filePath = `${session.user.id}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("documents").upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 })
    }

    // Determine document type based on filename
    const documentType = file.name.toLowerCase().includes("iep")
      ? "iep"
      : file.name.toLowerCase().includes("504")
        ? "504"
        : "other"

    // Save document record to database
    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: session.user.id,
        student_id: studentId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        document_type: documentType,
        processing_status: "pending",
        storage_path: filePath,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("documents").remove([filePath])
      return NextResponse.json({ error: "Failed to save document record" }, { status: 500 })
    }

    // Track usage
    await trackUsage(session.user.id, "document_upload", 0, {
      document_id: document.id,
      file_name: file.name,
      file_size: file.size,
      document_type: documentType,
      student_id: studentId,
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status,
        document_type: document.document_type,
        student_id: document.student_id,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
