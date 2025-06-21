export interface SupabaseConfig {
  auth?: {
    autoRefreshToken?: boolean
    persistSession?: boolean
  }
}