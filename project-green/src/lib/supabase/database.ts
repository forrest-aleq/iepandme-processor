import { createServerSupabaseClient } from "./server"
import type { Database } from "@/types/database"

type Student = Database["public"]["Tables"]["students"]["Row"]
type StudentInsert = Database["public"]["Tables"]["students"]["Insert"]
type StudentUpdate = Database["public"]["Tables"]["students"]["Update"]

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"]

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]
type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

export async function getUser(userId: string) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch subscription: ${error.message}`)
  }

  return data
}

export async function createSubscription(subscription: SubscriptionInsert): Promise<Subscription> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("subscriptions").insert(subscription).select().single()

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`)
  }

  return data
}

export async function updateSubscription(userId: string, updates: SubscriptionUpdate): Promise<Subscription> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("subscriptions").update(updates).eq("user_id", userId).select().single()

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`)
  }

  return data
}

export async function getStudents(userId: string): Promise<Student[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data || []
}

export async function getStudent(studentId: string, userId: string): Promise<Student | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("students").select("*").eq("id", studentId).eq("user_id", userId).single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return data
}

export async function createStudent(student: StudentInsert): Promise<Student> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("students").insert(student).select().single()

  if (error) {
    throw new Error(`Failed to create student: ${error.message}`)
  }

  return data
}

export async function updateStudent(studentId: string, updates: StudentUpdate): Promise<Student> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("students").update(updates).eq("id", studentId).select().single()

  if (error) {
    throw new Error(`Failed to update student: ${error.message}`)
  }

  return data
}

export async function deleteStudent(studentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("students").delete().eq("id", studentId)

  if (error) {
    throw new Error(`Failed to delete student: ${error.message}`)
  }
}

export async function getDocuments(userId: string): Promise<Document[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("documents")
    .select(`
      *,
      students (
        first_name,
        last_name
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`)
  }

  return data || []
}

export async function getDocument(documentId: string, userId: string): Promise<Document | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch document: ${error.message}`)
  }

  return data
}

export async function createDocument(document: DocumentInsert): Promise<Document> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("documents").insert(document).select().single()

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`)
  }

  return data
}

export async function updateDocument(documentId: string, updates: DocumentUpdate): Promise<Document> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("documents").update(updates).eq("id", documentId).select().single()

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`)
  }

  return data
}

export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("documents").delete().eq("id", documentId)

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`)
  }
}

export async function getUserUsageStats(userId: string) {
  const supabase = createServerSupabaseClient()

  // Get current month's upload count
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, created_at, processing_cost")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())

  if (documentsError) {
    throw new Error(`Failed to fetch usage stats: ${documentsError.message}`)
  }

  const currentMonthUploads = documents?.length || 0
  const totalCost = documents?.reduce((sum, doc) => sum + (doc.processing_cost || 0), 0) || 0

  return {
    currentMonthUploads,
    totalCost,
  }
}
