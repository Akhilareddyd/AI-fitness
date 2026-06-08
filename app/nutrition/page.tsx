'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  Type,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  BarChart3,
  Clock,
  Bot,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { supabase, type NutritionLog } from '@/lib/supabase'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type Tab = 'log' | 'today' | 'review'
type InputMode = 'text' | 'photo'

interface NutritionEstimate {
  calories_low: number
  calories_high: number
  protein_g: number
  carbs_g: number
  fat_g: number
  breakdown: string
  low_protein_flag: boolean
  low_protein_suggestion: string | null
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function MacroPill({
  label,
  value,
  unit = 'g',
  color,
}: {
  label: string
  value: number
  unit?: string
  color: string
}) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 text-center ${color}`}>
      <div className="text-lg font-bold">
        {Math.round(value)}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </div>
      <div className="text-xs opacity-75 mt-0.5">{label}</div>
    </div>
  )
}

function ProgressBar({
  value,
  max,
  color = 'bg-emerald-500',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full progress-animate transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── TAB 1: LOG MEAL ──────────────────────────────────────────────────────────

function LogMealTab() {
  const [date, setDate] = useState(today())
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [description, setDescription] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState('image/jpeg')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [adjustment, setAdjustment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setImagePreview(result)
      setImageBase64(result.split(',')[1])
      setImageMimeType(file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  const handleEstimate = async (adj?: string) => {
    setEstimating(true)
    setError(null)
    setEstimate(null)
    setSaved(false)
    try {
      const body: Record<string, unknown> = { adjustment: adj }
      if (inputMode === 'photo' && imageBase64) {
        body.imageBase64 = imageBase64
        body.mimeType = imageMimeType
      } else {
        body.description = description
      }
      const res = await fetch('/api/nutrition/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Estimate failed')
      const data: NutritionEstimate = await res.json()
      setEstimate(data)
      setShowBreakdown(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setEstimating(false)
    }
  }

  const handleLog = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      const avgCalories = Math.round((estimate.calories_low + estimate.calories_high) / 2)
      const { error: dbErr } = await supabase.from('nutrition_logs').insert({
        date,
        meal_type: mealType,
        description: inputMode === 'text' ? description : 'Photo meal',
        image_url: null,
        estimated_calories: avgCalories,
        estimated_protein_g: estimate.protein_g,
        estimated_carbs_g: estimate.carbs_g,
        estimated_fat_g: estimate.fat_g,
        claude_breakdown: estimate.breakdown,
      })
      if (dbErr) throw new Error(dbErr.message || dbErr.details || JSON.stringify(dbErr))
      setSaved(true)
      setEstimate(null)
      setDescription('')
      setImageBase64(null)
      setImagePreview(null)
      setAdjustment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Date + meal type */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Meal type</label>
          <div className="flex gap-2 flex-wrap">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={() => setMealType(mt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mealType === mt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {MEAL_LABELS[mt]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input mode toggle */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              inputMode === 'text'
                ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Type className="w-4 h-4" />
            Describe it
          </button>
          <button
            onClick={() => setInputMode('photo')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              inputMode === 'photo'
                ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Camera className="w-4 h-4" />
            Take a photo
          </button>
        </div>

        <div className="p-4">
          {inputMode === 'text' ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. 2 chapati with dal tadka and a small bowl of raita, plus a cup of chai with milk"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Meal preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      setImageBase64(null)
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    Remove photo
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-zinc-700 rounded-lg p-8 flex flex-col items-center gap-3 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm">Tap to take photo or upload from gallery</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estimate button */}
      <button
        onClick={() => handleEstimate()}
        disabled={
          estimating ||
          (inputMode === 'text' && !description.trim()) ||
          (inputMode === 'photo' && !imageBase64)
        }
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {estimating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claude is estimating...
          </>
        ) : (
          'Estimate macros'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4" />
          Logged successfully!
        </div>
      )}

      {/* Results card */}
      {estimate && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="text-lg font-bold text-zinc-100">
              {estimate.calories_low}–{estimate.calories_high}{' '}
              <span className="text-sm font-normal text-zinc-400">kcal</span>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Macro pills */}
            <div className="flex gap-2">
              <MacroPill
                label="Protein"
                value={estimate.protein_g}
                color="bg-violet-50 text-violet-700"
              />
              <MacroPill
                label="Carbs"
                value={estimate.carbs_g}
                color="bg-amber-50 text-amber-700"
              />
              <MacroPill
                label="Fat"
                value={estimate.fat_g}
                color="bg-rose-50 text-rose-700"
              />
            </div>

            {/* Protein flag */}
            {estimate.low_protein_flag && estimate.low_protein_suggestion && (
              <div className="flex items-start gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{estimate.low_protein_suggestion}</span>
              </div>
            )}

            {/* Breakdown */}
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <span>Claude&apos;s breakdown</span>
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showBreakdown && (
              <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-800 pt-2">
                {estimate.breakdown}
              </p>
            )}

            {/* Adjust estimate */}
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <label className="text-xs text-zinc-400">Adjust estimate (optional)</label>
              <div className="flex gap-2">
                <input
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="e.g. I used extra ghee, or add 2 boiled eggs"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleEstimate(adjustment)}
                  disabled={!adjustment.trim() || estimating}
                  className="px-3 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg text-zinc-100 transition-colors whitespace-nowrap"
                >
                  Re-estimate
                </button>
              </div>
            </div>
          </div>

          {/* Log button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleLog}
              disabled={saving}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Log this meal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TAB 2: TODAY'S SUMMARY ──────────────────────────────────────────────────

function TodaySummaryTab() {
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [isWorkoutDay, setIsWorkoutDay] = useState(false)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const hour = now.getHours()

  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const todayStr = today()
    const [{ data: nutritionData }, { data: workoutData }] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('*')
        .eq('date', todayStr)
        .order('created_at', { ascending: true }),
      supabase.from('workouts').select('id').eq('date', todayStr).limit(1),
    ])
    setLogs((nutritionData as NutritionLog[]) ?? [])
    setIsWorkoutDay((workoutData?.length ?? 0) > 0)
    setLoading(false)
  }, [])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('nutrition_logs').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  useEffect(() => {
    load()
  }, [load])

  const calorieTarget = isWorkoutDay ? 1700 : 1450
  const proteinTarget = 115
  const carbsTarget = 160
  const fatTarget = 55
  const totalCalories = logs.reduce((s, l) => s + l.estimated_calories, 0)
  const totalProtein = logs.reduce((s, l) => s + l.estimated_protein_g, 0)
  const totalCarbs = logs.reduce((s, l) => s + l.estimated_carbs_g, 0)
  const totalFat = logs.reduce((s, l) => s + l.estimated_fat_g, 0)
  const remaining = calorieTarget - totalCalories
  const showNudge = hour >= 20 && totalCalories < 400

  const mealOrder: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const grouped = mealOrder.reduce((acc, mt) => {
    const mealLogs = logs.filter((l) => l.meal_type === mt)
    if (mealLogs.length > 0) acc[mt] = mealLogs
    return acc
  }, {} as Record<string, NutritionLog[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading today&apos;s data...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Gentle nudge */}
      {showNudge && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm">
          You&apos;ve had less than usual today — your body needs fuel for tomorrow&apos;s session.
        </div>
      )}

      {/* Calorie summary */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <span className="text-2xl font-bold text-zinc-100">{totalCalories}</span>
            <span className="text-zinc-400 text-sm ml-1">/ {calorieTarget} kcal</span>
          </div>
          <span
            className={`text-sm font-medium ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {remaining >= 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`}
          </span>
        </div>
        <ProgressBar
          value={totalCalories}
          max={calorieTarget}
          color={totalCalories > calorieTarget ? 'bg-red-500' : 'bg-emerald-500'}
        />
        <div className="text-xs text-zinc-500">
          {isWorkoutDay ? 'Training day target' : 'Rest day target'}
        </div>
      </div>

      {/* Macros summary */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-700">Macros</h3>

        {/* Protein */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-violet-700">Protein</span>
            <span className="text-xs text-zinc-500">
              <span className="font-semibold text-violet-700">{Math.round(totalProtein)}g</span>
              {' '}/ {proteinTarget}g
            </span>
          </div>
          <ProgressBar value={totalProtein} max={proteinTarget} color="bg-violet-500" />
        </div>

        {/* Carbs */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-amber-700">Carbs</span>
            <span className="text-xs text-zinc-500">
              <span className="font-semibold text-amber-700">{Math.round(totalCarbs)}g</span>
              {' '}/ {carbsTarget}g
            </span>
          </div>
          <ProgressBar value={totalCarbs} max={carbsTarget} color="bg-amber-400" />
        </div>

        {/* Fat */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-rose-600">Fat</span>
            <span className="text-xs text-zinc-500">
              <span className="font-semibold text-rose-600">{Math.round(totalFat)}g</span>
              {' '}/ {fatTarget}g
            </span>
          </div>
          <ProgressBar value={totalFat} max={fatTarget} color="bg-rose-400" />
        </div>
      </div>

      {/* Meal timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 text-sm">
          No meals logged today yet.
          <br />
          <span className="text-zinc-600">Head to the Log tab to add your first meal.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs text-zinc-400 uppercase tracking-wider font-medium px-1">
            Today&apos;s meals
          </h3>
          {mealOrder.map((mt) => {
            const mealLogs = grouped[mt]
            if (!mealLogs) return null
            const mealCal = mealLogs.reduce((s, l) => s + l.estimated_calories, 0)
            const mealProt = mealLogs.reduce((s, l) => s + l.estimated_protein_g, 0)
            return (
              <div key={mt} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-100 capitalize flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {MEAL_LABELS[mt]}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {mealCal} kcal · {Math.round(mealProt)}g protein
                  </span>
                </div>
                {mealLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2 ml-5 group mt-1">
                    <p className="text-xs text-zinc-500 flex-1">{log.description}</p>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 disabled:opacity-50"
                      title="Delete this entry"
                    >
                      {deleting === log.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TAB 3: BUDGET REVIEW ────────────────────────────────────────────────────

function BudgetReviewTab() {
  const [weekData, setWeekData] = useState<
    { date: string; day: string; calories: number; target: number }[]
  >([])
  const [reviewing, setReviewing] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [loadingChart, setLoadingChart] = useState(true)

  const loadWeekData = useCallback(async () => {
    setLoadingChart(true)
    const days: { date: string; day: string; calories: number; target: number }[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        calories: 0,
        target: 1700,
      })
    }

    const sevenDaysAgo = days[0].date
    const [{ data: logs }, { data: workouts }] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('date, estimated_calories')
        .gte('date', sevenDaysAgo),
      supabase.from('workouts').select('date').gte('date', sevenDaysAgo),
    ])

    const workoutDates = new Set((workouts ?? []).map((w: { date: string }) => w.date))
    const caloriesByDate: Record<string, number> = {}
    for (const log of logs ?? []) {
      caloriesByDate[log.date] = (caloriesByDate[log.date] || 0) + log.estimated_calories
    }

    const enriched = days.map((d) => ({
      ...d,
      calories: caloriesByDate[d.date] || 0,
      target: workoutDates.has(d.date) ? 1700 : 1450,
    }))

    setWeekData(enriched)
    setLoadingChart(false)
  }, [])

  useEffect(() => {
    loadWeekData()
  }, [loadWeekData])

  const handleReview = async () => {
    setReviewing(true)
    setReviewText('')
    try {
      const res = await fetch('/api/nutrition/budget')
      if (!res.ok || !res.body) throw new Error('Review failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReviewText((prev) => prev + decoder.decode(value))
      }
    } catch (err) {
      setReviewText('Failed to load review. Please try again.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-100 mb-4">Calories this week</h3>
        {loadingChart ? (
          <div className="h-40 flex items-center justify-center text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
                labelStyle={{ color: '#64748B' }}
                itemStyle={{ color: '#6D28D9' }}
              />
              <ReferenceLine
                y={1700}
                stroke="#10b981"
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                label={{ value: 'Training', fill: '#10b981', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={1450}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                label={{ value: 'Rest', fill: '#f59e0b', fontSize: 10, position: 'right' }}
              />
              <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Review button */}
      <button
        onClick={handleReview}
        disabled={reviewing}
        className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {reviewing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claude is reviewing your nutrition...
          </>
        ) : (
          <>
            <Bot className="w-4 h-4" />
            Ask Claude to review my nutrition
          </>
        )}
      </button>

      {/* Streaming review */}
      {reviewText && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3 text-purple-400 text-xs font-medium">
            <Bot className="w-3.5 h-3.5" />
            Claude&apos;s analysis
          </div>
          <div
            className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap ${
              reviewing ? 'streaming-cursor' : ''
            }`}
          >
            {reviewText}
          </div>
        </div>
      )}

      {/* Link to coach */}
      <Link
        href="/coach"
        className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-sm font-medium text-zinc-100">AI Coach</div>
            <div className="text-xs text-zinc-400">Deeper workout-nutrition planning</div>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </Link>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('log')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'log', label: 'Log meal', icon: UtensilsCrossed },
    { id: 'today', label: "Today", icon: Clock },
    { id: 'review', label: 'Weekly', icon: BarChart3 },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-zinc-100 mb-5">Nutrition</h1>

      {/* Tab bar */}
      <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 mb-5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'log' && <LogMealTab />}
      {tab === 'today' && <TodaySummaryTab />}
      {tab === 'review' && <BudgetReviewTab />}
    </div>
  )
}
