import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type NutritionLog = {
  id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  image_url: string | null
  estimated_calories: number
  estimated_protein_g: number
  estimated_carbs_g: number
  estimated_fat_g: number
  claude_breakdown: string
  created_at: string
}

export type Workout = {
  id: string
  date: string
  type: string | null
  duration_min: number | null
  notes: string | null
  created_at: string
}

export type Measurement = {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  notes: string | null
  created_at: string
}

export type ExerciseLog = {
  id: string
  date: string
  workout_type: 'gym' | 'desk'
  routine_day: string
  exercise_name: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  created_at: string
}
