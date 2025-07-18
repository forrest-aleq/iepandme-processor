import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function createClientSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}

export { supabaseClient as supabase }
