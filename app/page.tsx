'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Dumbbell,
  Sparkles,
  ArrowRight,
  Flame,
  TrendingUp,
  Apple,
  Scale,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const DAILY_PLANS: Record<string, { name: string; duration: string; burned: string; emoji: string }> = {
  monday:    { name: 'Glutes & Hamstrings', duration: '60 min', burned: '~380 kcal', emoji: '🍑' },
  tuesday:   { name: 'Upper Body',          duration: '55 min', burned: '~320 kcal', emoji: '💪' },
  wednesday: { name: 'Quads & Legs',        duration: '65 min', burned: '~420 kcal', emoji: '🦵' },
  thursday:  { name: 'HIIT + Core',         duration: '50 min', burned: '~450 kcal', emoji: '⚡' },
  friday:    { name: 'Full Body Metabolic', duration: '60 min', burned: '~400 kcal', emoji: '🔥' },
  saturday:  { name: 'Rest Day',            duration: '—',      burned: 'Recovery',  emoji: '🧘' },
  sunday:    { name: 'Rest Day',            duration: '—',      burned: 'Recovery',  emoji: '🌿' },
}

const WEIGHT_START = 69
const WEIGHT_GOAL  = 54
const CAL_TARGET   = 1700
const PROTEIN_TARGET = 115
const CARBS_TARGET   = 160
const FAT_TARGET     = 55

// ─── Sub-components ──────────────────────────────────────────────────────────

function Ring({
  value, max, color, size = 80, stroke = 7,
}: { value: number; max: number; color: string; size?: number; stroke?: number }) {
  const r     = (size - stroke * 2) / 2
  const circ  = 2 * Math.PI * r
  const pct   = Math.min(Math.max(value / max, 0), 1)
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s ease-out' }}
      />
    </svg>
  )
}

function Bar({
  pct, color, height = 6,
}: { pct: number; color: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden w-full" style={{ height, background: '#F1F5F9' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(pct, 100)}%`,
          background: color,
          transition: 'width 0.8s ease-out',
        }}
      />
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

type NutritionTotals = { calories: number; protein: number; carbs: number; fat: number }

const CARD = {
  background: '#FFFFFF',
  border: '1px solid #F3F4F6',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
}

export default function Dashboard() {
  const now     = new Date()
  const dayName = DAY_NAMES[now.getDay()]
  const todayStr = now.toISOString().split('T')[0]
  const hour    = now.getHours()
  const greeting =
    hour < 5  ? 'Good night'
    : hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : 'Good evening'
  const isRestDay = dayName === 'saturday' || dayName === 'sunday'
  const todayPlan = DAILY_PLANS[dayName]

  const [loading, setLoading]         = useState(true)
  const [nutrition, setNutrition]     = useState<NutritionTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [weekData, setWeekData]       = useState<{ day: string; cal: number }[]>([])
  const [workoutDays, setWorkoutDays] = useState<string[]>([])
  const [workedOutToday, setWorkedOut] = useState(false)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [streak, setStreak]           = useState(0)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const sevenAgo  = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7)
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)

    const [{ data: nutLogs }, { data: exLogs }, { data: measurements }] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('date, estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g')
        .gte('date', sevenAgo.toISOString().split('T')[0]),
      supabase
        .from('exercise_logs')
        .select('date')
        .gte('date', thirtyAgo.toISOString().split('T')[0]),
      supabase
        .from('measurements')
        .select('weight_kg')
        .order('date', { ascending: false })
        .limit(1),
    ])

    if (nutLogs) {
      const today = nutLogs.filter(l => l.date === todayStr)
      setNutrition(
        today.reduce(
          (a, l) => ({
            calories: a.calories + l.estimated_calories,
            protein:  a.protein  + l.estimated_protein_g,
            carbs:    a.carbs    + l.estimated_carbs_g,
            fat:      a.fat      + l.estimated_fat_g,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
      )

      const byDate: Record<string, number> = {}
      for (const l of nutLogs) byDate[l.date] = (byDate[l.date] || 0) + l.estimated_calories
      const week = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        week.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), cal: byDate[ds] || 0 })
      }
      setWeekData(week)
    }

    if (exLogs) {
      const dates = Array.from(new Set(exLogs.map((l: { date: string }) => l.date)))
      setWorkoutDays(dates)
      setWorkedOut(dates.includes(todayStr))

      const s = new Set(dates)
      let count = 0
      const d = new Date(); d.setDate(d.getDate() - 1)
      for (let i = 0; i < 30; i++) {
        const dow = d.getDay()
        if (dow !== 0 && dow !== 6) {
          if (!s.has(d.toISOString().split('T')[0])) break
          count++
        }
        d.setDate(d.getDate() - 1)
      }
      setStreak(count)
    }

    if (measurements && measurements.length > 0) setCurrentWeight(measurements[0].weight_kg)
    setLoading(false)
  }

  const calLeft      = Math.max(0, CAL_TARGET - Math.round(nutrition.calories))
  const proteinLeft  = Math.max(0, PROTEIN_TARGET - Math.round(nutrition.protein))
  const weightPct    = currentWeight
    ? Math.max(0, Math.min(100, ((WEIGHT_START - currentWeight) / (WEIGHT_START - WEIGHT_GOAL)) * 100))
    : 0

  const aiTip =
    !workedOutToday && !isRestDay
      ? `${todayPlan.emoji} Today is ${todayPlan.name} day — ${todayPlan.duration} of work awaits. Let's get it done!`
      : proteinLeft > 25
      ? `You're ${proteinLeft}g away from your protein goal. Add a bowl of curd or some paneer to your next meal to catch up.`
      : proteinLeft > 0
      ? `Just ${proteinLeft}g of protein left to hit today's target. A small glass of milk will do it! 🥛`
      : streak >= 3
      ? `🔥 ${streak}-day streak! Consistency is your superpower — keep this momentum going strong.`
      : workedOutToday
      ? `Great job completing today's workout! Rest, recover, and fuel well — your muscles are growing right now. 💪`
      : `Every healthy choice today brings you closer to your 54 kg goal. You've got this, Akhila.`

  const activityDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return {
      label:    d.toLocaleDateString('en', { weekday: 'short' }),
      date:     ds,
      done:     workoutDays.includes(ds),
      isToday:  i === 6,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-6">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            {greeting}, Akhila
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#64748B' }}>
            {isRestDay
              ? 'Rest day — recover, hydrate, and come back stronger.'
              : workedOutToday
              ? "Workout done. You're absolutely crushing it today."
              : `${todayPlan.name} day — let's make every rep count.`}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-0.5">
          <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
            {now.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          {streak > 0 && (
            <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#B45309' }}>
              <Flame className="w-3 h-3" /> {streak} day streak
            </span>
          )}
        </div>
      </div>

      {/* ── Hero Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Calories */}
        <div className="rounded-2xl p-4 sm:p-5 card-hover" style={CARD}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Calories</p>
              <p className="text-2xl font-bold leading-none" style={{ color: '#0F172A' }}>
                {loading ? '—' : Math.round(nutrition.calories).toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>of {CAL_TARGET.toLocaleString()} kcal</p>
            </div>
            <div className="relative shrink-0">
              <Ring value={nutrition.calories} max={CAL_TARGET} color="#8B5CF6" size={64} stroke={6} />
              <div
                className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                style={{ color: '#6D28D9' }}
              >
                {loading ? '—' : `${Math.round((nutrition.calories / CAL_TARGET) * 100)}%`}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs" style={{ color: '#94A3B8' }}>
            {loading ? '' : calLeft > 0 ? `${calLeft} kcal remaining` : '🎯 Goal reached!'}
          </p>
        </div>

        {/* Protein */}
        <div className="rounded-2xl p-4 sm:p-5 card-hover" style={CARD}>
          <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Protein</p>
          <p className="text-2xl font-bold leading-none mb-0.5" style={{ color: '#0F172A' }}>
            {loading ? '—' : `${Math.round(nutrition.protein)}g`}
          </p>
          <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>of {PROTEIN_TARGET}g goal</p>
          <Bar pct={(nutrition.protein / PROTEIN_TARGET) * 100} color="#8B5CF6" />
          <p className="mt-2 text-xs font-medium" style={{ color: '#6D28D9' }}>
            {loading ? '' : proteinLeft > 0 ? `${proteinLeft}g to go` : '✓ Hit!'}
          </p>
        </div>

        {/* Workout Status */}
        <div className="rounded-2xl p-4 sm:p-5 card-hover" style={CARD}>
          <p className="text-xs font-medium mb-3" style={{ color: '#94A3B8' }}>Workout</p>
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: workedOutToday
                  ? 'rgba(5,150,105,0.08)'
                  : isRestDay
                  ? 'rgba(180,83,9,0.06)'
                  : '#F8FAFC',
              }}
            >
              {workedOutToday ? (
                <span className="text-lg">✓</span>
              ) : isRestDay ? (
                <span className="text-lg">🧘</span>
              ) : (
                <Dumbbell className="w-4 h-4" style={{ color: '#CBD5E1' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: '#0F172A' }}>
                {loading ? '—' : workedOutToday ? 'Completed!' : isRestDay ? 'Rest day' : 'Not yet'}
              </p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>{todayPlan.name}</p>
            </div>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: '#B45309' }} />
              <span className="text-xs font-medium" style={{ color: '#B45309' }}>
                {streak} day streak
              </span>
            </div>
          )}
        </div>

        {/* Weight Goal */}
        <div className="rounded-2xl p-4 sm:p-5 card-hover" style={CARD}>
          <div className="flex items-center gap-1.5 mb-1">
            <Scale className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
            <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>Weight Goal</p>
          </div>
          <div className="flex items-end gap-2 mb-0.5">
            <p className="text-2xl font-bold leading-none" style={{ color: '#0F172A' }}>
              {loading ? '—' : currentWeight ? `${currentWeight}` : '—'}
            </p>
            <p className="text-sm pb-0.5" style={{ color: '#94A3B8' }}>kg now</p>
          </div>
          <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>Target: {WEIGHT_GOAL} kg</p>
          <Bar pct={weightPct} color="#F97373" />
          <p className="mt-2 text-xs font-medium" style={{ color: '#DC2626' }}>
            {loading ? '' : currentWeight
              ? `${Math.round(weightPct)}% — ${(currentWeight - WEIGHT_GOAL).toFixed(1)}kg to go`
              : 'Log your weight →'}
          </p>
        </div>
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calorie Trend */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={CARD}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Calorie Trend</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Last 7 days · target {CAL_TARGET} kcal</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(109,40,217,0.08)' }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: '#6D28D9' }} />
            </div>
          </div>
          {loading ? (
            <div className="h-32 rounded-xl animate-pulse" style={{ background: '#F1F5F9' }} />
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={weekData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: '#64748B' }}
                  formatter={(v: number) => [`${Math.round(v)} kcal`, 'Calories']}
                  itemStyle={{ color: '#6D28D9' }}
                />
                <Area
                  type="monotone"
                  dataKey="cal"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fill="url(#calGrad)"
                  dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Workout Activity */}
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Activity</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>This week</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.08)' }}
            >
              <Dumbbell className="w-4 h-4" style={{ color: '#2563EB' }} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            {activityDays.map(({ label, date, done, isToday, isWeekend }) => (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={
                    done
                      ? { background: 'rgba(37,99,235,0.1)', border: '2px solid #60A5FA' }
                      : isWeekend
                      ? { background: 'transparent', border: '1.5px dashed #E2E8F0' }
                      : { background: '#F8FAFC', border: '1.5px solid #F1F5F9' }
                  }
                >
                  {done ? (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#60A5FA' }} />
                  ) : isWeekend ? (
                    <span style={{ color: '#E2E8F0', fontSize: 11, lineHeight: 1 }}>–</span>
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#E2E8F0' }} />
                  )}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isToday ? '#2563EB' : '#94A3B8' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#94A3B8' }}>Completed</span>
              <span style={{ color: '#2563EB', fontWeight: 600 }}>
                {activityDays.filter(d => d.done).length} / 5 days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Today's Plan */}
        <div className="rounded-2xl p-5 card-hover" style={CARD}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'rgba(109,40,217,0.08)' }}
            >
              {todayPlan.emoji}
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>Today&apos;s Plan</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: '#0F172A' }}>
                {todayPlan.name}
              </p>
            </div>
          </div>

          {!isRestDay && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#94A3B8' }}>Duration</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{todayPlan.duration}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#94A3B8' }}>Est. burn</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{todayPlan.burned}</span>
              </div>
            </div>
          )}

          <Link
            href="/workouts"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={
              workedOutToday
                ? { background: 'rgba(109,40,217,0.08)', color: '#6D28D9' }
                : { background: '#8B5CF6', color: '#FFFFFF' }
            }
          >
            {workedOutToday ? (
              <><span>✓</span> View Workout</>
            ) : (
              <><Dumbbell className="w-3.5 h-3.5" /> {isRestDay ? 'Optional workout' : 'Start Workout'}</>
            )}
          </Link>
        </div>

        {/* Nutrition Summary */}
        <div className="rounded-2xl p-5 card-hover" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Apple className="w-4 h-4 shrink-0" style={{ color: '#B45309' }} />
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Nutrition</p>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(180,83,9,0.08)', color: '#B45309' }}
            >
              {calLeft > 0 ? `${calLeft} kcal left` : '🎯 Nailed it!'}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { label: 'Protein', value: nutrition.protein,  max: PROTEIN_TARGET, color: '#8B5CF6' },
              { label: 'Carbs',   value: nutrition.carbs,    max: CARBS_TARGET,   color: '#F59E0B' },
              { label: 'Fat',     value: nutrition.fat,      max: FAT_TARGET,     color: '#F97373' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#64748B' }}>{label}</span>
                  <span style={{ color: '#0F172A', fontWeight: 500 }}>
                    {Math.round(value)}g&nbsp;
                    <span style={{ color: '#94A3B8', fontWeight: 400 }}>/ {max}g</span>
                  </span>
                </div>
                <Bar pct={(value / max) * 100} color={color} height={5} />
              </div>
            ))}
          </div>

          <Link
            href="/nutrition"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(180,83,9,0.08)', color: '#B45309' }}
          >
            Log a meal <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* AI Coach Tip */}
        <div className="rounded-2xl p-5 card-hover flex flex-col" style={CARD}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'rgba(37,99,235,0.08)' }}
            >
              ✦
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>AI Coach</p>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Daily Insight</p>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 space-y-2.5">
              <div className="h-2.5 rounded-full animate-pulse" style={{ background: '#F1F5F9', width: '90%' }} />
              <div className="h-2.5 rounded-full animate-pulse" style={{ background: '#F1F5F9', width: '75%' }} />
              <div className="h-2.5 rounded-full animate-pulse" style={{ background: '#F1F5F9', width: '82%' }} />
            </div>
          ) : (
            <p className="flex-1 text-sm leading-relaxed mb-4" style={{ color: '#64748B' }}>
              {aiTip}
            </p>
          )}

          <Link
            href="/coach"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 mt-auto"
            style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}
          >
            <Sparkles className="w-3 h-3" />
            Chat with AI Coach
          </Link>
        </div>
      </div>

    </div>
  )
}
