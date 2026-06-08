'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Home, Plus, Loader2, Check, X } from 'lucide-react'
import { supabase, type ExerciseLog } from '@/lib/supabase'

type Exercise = {
  name: string
  target: string
  hasWeight: boolean
  isCardio?: boolean
}

type DayRoutine = {
  name: string
  exercises: Exercise[]
}

const GYM_ROUTINE: Record<string, DayRoutine> = {
  monday: {
    name: 'Glutes & Hamstrings',
    exercises: [
      { name: 'Glute Ham Raise Machine', target: '4×10–12', hasWeight: true },
      { name: 'Hip Thrust', target: '5×10–12', hasWeight: true },
      { name: 'Leg Curl', target: '4×12–15', hasWeight: true },
      { name: 'Hip Abductor Machine', target: '3×15–20', hasWeight: true },
      { name: 'Donkey Kicks', target: '3×15 each', hasWeight: false },
    ],
  },
  tuesday: {
    name: 'Upper Body',
    exercises: [
      { name: 'Lat Pulldown', target: '4×10–12', hasWeight: true },
      { name: 'Seated Cable Row', target: '4×10–12', hasWeight: true },
      { name: 'Dumbbell Bench Press', target: '3×10–12', hasWeight: true },
      { name: 'Overhead Press', target: '3×10–12', hasWeight: true },
      { name: 'Lateral Raises', target: '3×12–15', hasWeight: true },
    ],
  },
  wednesday: {
    name: 'Quads & Legs',
    exercises: [
      { name: 'Barbell Squat', target: '4×10–12', hasWeight: true },
      { name: 'Leg Press', target: '4×12–15', hasWeight: true },
      { name: 'Leg Extension', target: '4×15–20', hasWeight: true },
      { name: 'Hip Thrust', target: '3×12–15', hasWeight: true },
      { name: 'Walking Lunge', target: '3×12 each', hasWeight: true },
    ],
  },
  thursday: {
    name: 'HIIT + Core',
    exercises: [
      { name: 'Treadmill HIIT', target: '20 min (30s sprint / 60s walk)', hasWeight: false, isCardio: true },
      { name: 'Stairmaster', target: '15 min steady', hasWeight: false, isCardio: true },
      { name: 'Cable Crunch', target: '3×15–20', hasWeight: true },
      { name: 'Leg Raises', target: '3×15', hasWeight: false },
      { name: 'Plank', target: '3×45 sec', hasWeight: false },
    ],
  },
  friday: {
    name: 'Full Body Metabolic',
    exercises: [
      { name: 'Goblet Squat', target: '4×15', hasWeight: true },
      { name: 'Glute Ham Raise Machine', target: '4×10–12', hasWeight: true },
      { name: 'DB Shoulder Press', target: '3×12', hasWeight: true },
      { name: 'Seated Row', target: '3×12', hasWeight: true },
      { name: 'Hip Thrust', target: '3×15', hasWeight: true },
    ],
  },
}

const DESK_ROUTINE: Record<string, DayRoutine> = {
  monday: {
    name: 'Glutes & Hamstrings (Desk)',
    exercises: [
      { name: 'Glute Bridges', target: '4×20', hasWeight: false },
      { name: 'Standing Hip Extension', target: '3×15 each', hasWeight: false },
      { name: 'Chair Squats', target: '3×15', hasWeight: false },
      { name: 'Standing Side Kick', target: '3×15 each', hasWeight: false },
      { name: 'Wall Sit', target: '3×45 sec', hasWeight: false },
    ],
  },
  tuesday: {
    name: 'Upper Body (Desk)',
    exercises: [
      { name: 'Desk Push-Ups', target: '4×15', hasWeight: false },
      { name: 'Chair Dips', target: '3×12', hasWeight: false },
      { name: 'Arm Circles', target: '3×30 sec', hasWeight: false },
      { name: 'Shoulder Shrugs', target: '3×20', hasWeight: false },
      { name: 'Overhead Press (water bottle)', target: '3×15', hasWeight: false },
    ],
  },
  wednesday: {
    name: 'Quads & Legs (Desk)',
    exercises: [
      { name: 'Bodyweight Squats', target: '4×20', hasWeight: false },
      { name: 'Reverse Lunges', target: '3×15 each', hasWeight: false },
      { name: 'Calf Raises', target: '4×20', hasWeight: false },
      { name: 'Chair Step-Ups', target: '3×12 each', hasWeight: false },
      { name: 'Wall Sit', target: '3×45 sec', hasWeight: false },
    ],
  },
  thursday: {
    name: 'Cardio + Core (Desk)',
    exercises: [
      { name: 'Brisk Walk', target: '20 min', hasWeight: false, isCardio: true },
      { name: 'Chair Crunches', target: '3×20', hasWeight: false },
      { name: 'Seated Leg Raises', target: '3×15', hasWeight: false },
      { name: 'Standing Oblique Crunch', target: '3×15 each', hasWeight: false },
      { name: 'Plank', target: '3×30 sec', hasWeight: false },
    ],
  },
  friday: {
    name: 'Full Body (Desk)',
    exercises: [
      { name: 'Bodyweight Squats', target: '3×20', hasWeight: false },
      { name: 'Desk Push-Ups', target: '3×15', hasWeight: false },
      { name: 'Reverse Lunges', target: '3×12 each', hasWeight: false },
      { name: 'Glute Bridges', target: '3×20', hasWeight: false },
      { name: 'Mountain Climbers', target: '3×30 sec', hasWeight: false },
    ],
  },
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

type SetEntry = { weight: string; reps: string }

export default function WorkoutsPage() {
  const today = new Date()
  const dayName = DAY_NAMES[today.getDay()]
  const isRestDay = dayName === 'saturday' || dayName === 'sunday'

  const [workoutType, setWorkoutType] = useState<'gym' | 'desk'>('gym')
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({})
  const [inputs, setInputs] = useState<Record<string, SetEntry>>({})
  const [prevBests, setPrevBests] = useState<Record<string, { weight: number; reps: number }>>({})
  const [history, setHistory] = useState<Array<{ date: string; exercises: ExerciseLog[] }>>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const routine = !isRestDay
    ? (workoutType === 'gym' ? GYM_ROUTINE[dayName] : DESK_ROUTINE[dayName])
    : null

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .gte('date', startDate)
      .order('created_at', { ascending: false })

    if (data) {
      // Most recent weight used per exercise (excluding today)
      const bests: Record<string, { weight: number; reps: number }> = {}
      for (const log of data as ExerciseLog[]) {
        if (log.date !== todayStr && log.weight_kg != null && !bests[log.exercise_name]) {
          bests[log.exercise_name] = { weight: log.weight_kg, reps: log.reps || 0 }
        }
      }
      setPrevBests(bests)

      // Pre-fill today's sets if already saved
      const todayLogs = (data as ExerciseLog[]).filter(l => l.date === todayStr)
      if (todayLogs.length > 0) {
        const existingSets: Record<string, SetEntry[]> = {}
        for (const log of todayLogs) {
          if (!existingSets[log.exercise_name]) existingSets[log.exercise_name] = []
          existingSets[log.exercise_name].push({
            weight: log.weight_kg?.toString() ?? '',
            reps: log.reps?.toString() ?? '',
          })
        }
        setSets(existingSets)
        setWorkoutType((todayLogs[0].workout_type as 'gym' | 'desk') || 'gym')
        setSaved(true)
      }

      // History grouped by date, excluding today
      const byDate: Record<string, ExerciseLog[]> = {}
      for (const log of data as ExerciseLog[]) {
        if (log.date !== todayStr) {
          if (!byDate[log.date]) byDate[log.date] = []
          byDate[log.date].push(log)
        }
      }
      setHistory(
        Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 5)
          .map(([date, exercises]) => ({ date, exercises }))
      )
    }
    setLoading(false)
  }

  const updateInput = (name: string, field: 'weight' | 'reps', value: string) => {
    setInputs(prev => ({ ...prev, [name]: { ...(prev[name] || { weight: '', reps: '' }), [field]: value } }))
  }

  const addSet = (name: string) => {
    const input = inputs[name] || { weight: '', reps: '' }
    if (!input.reps) return
    setSets(prev => ({
      ...prev,
      [name]: [...(prev[name] || []), { weight: input.weight, reps: input.reps }],
    }))
    // Keep weight pre-filled for next set, clear reps
    setInputs(prev => ({ ...prev, [name]: { weight: prev[name]?.weight || '', reps: '' } }))
    setSaved(false)
  }

  const markDone = (name: string) => {
    setSets(prev => ({ ...prev, [name]: [{ weight: '', reps: 'done' }] }))
    setSaved(false)
  }

  const removeSet = (name: string, idx: number) => {
    setSets(prev => {
      const updated = prev[name].filter((_, i) => i !== idx)
      const next = { ...prev }
      if (updated.length === 0) delete next[name]
      else next[name] = updated
      return next
    })
    setSaved(false)
  }

  const switchType = (type: 'gym' | 'desk') => {
    setWorkoutType(type)
    setSets({})
    setInputs({})
    setSaved(false)
  }

  const saveWorkout = async () => {
    if (Object.keys(sets).length === 0) return
    setSaving(true)
    const todayStr = today.toISOString().split('T')[0]

    await supabase.from('exercise_logs').delete().eq('date', todayStr)

    const rows: object[] = []
    for (const [exerciseName, exerciseSets] of Object.entries(sets)) {
      exerciseSets.forEach((s, idx) => {
        rows.push({
          date: todayStr,
          workout_type: workoutType,
          routine_day: dayName,
          exercise_name: exerciseName,
          set_number: idx + 1,
          reps: s.reps === 'done' ? null : s.reps ? parseInt(s.reps) : null,
          weight_kg: s.weight ? parseFloat(s.weight) : null,
        })
      })
    }

    await supabase.from('exercise_logs').insert(rows)
    setSaving(false)
    setSaved(true)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-blue-400" />
          Workouts
        </h1>
        <div className="text-right">
          <div className="text-xs text-zinc-500 capitalize">{dayName}</div>
          <div className="text-sm font-medium text-zinc-300">
            {isRestDay ? 'Rest Day' : routine?.name}
          </div>
        </div>
      </div>

      {isRestDay ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <div className="text-3xl mb-2">🧘</div>
          <div className="text-zinc-300 font-medium mb-1">Rest & Recovery</div>
          <div className="text-zinc-500 text-sm">Weekends are for recharging. See you Monday!</div>
        </div>
      ) : (
        <>
          {/* Gym / Desk toggle */}
          <div className="flex rounded-xl overflow-hidden border border-zinc-700">
            <button
              onClick={() => switchType('gym')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                workoutType === 'gym'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Gym Session
            </button>
            <button
              onClick={() => switchType('desk')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                workoutType === 'desk'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Desk Alternative
            </button>
          </div>

          {workoutType === 'desk' && (
            <p className="text-xs text-orange-700 text-center -mt-1">
              Busy during the 10am–1pm gym window? These can be done at your desk.
            </p>
          )}

          {/* Exercise cards */}
          {routine?.exercises.map(exercise => {
            const exerciseSets = sets[exercise.name] || []
            const input = inputs[exercise.name] || { weight: '', reps: '' }
            const best = prevBests[exercise.name]

            return (
              <div key={exercise.name} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{exercise.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Target: {exercise.target}</div>
                  </div>
                  {best && exercise.hasWeight && (
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs text-zinc-500">Last time</div>
                      <div className="text-xs text-blue-400 font-medium">{best.weight}kg × {best.reps}</div>
                    </div>
                  )}
                </div>

                {/* Logged sets */}
                {exerciseSets.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {exerciseSets.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 w-9 shrink-0">Set {idx + 1}</span>
                        <span className="text-emerald-400 font-medium">
                          {s.reps === 'done'
                            ? '✓ Done'
                            : s.weight
                            ? `${s.weight}kg × ${s.reps}`
                            : `${s.reps} reps`}
                        </span>
                        <button
                          onClick={() => removeSet(exercise.name, idx)}
                          className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input row */}
                {exercise.isCardio ? (
                  <button
                    onClick={() => markDone(exercise.name)}
                    className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                      exerciseSets.length > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {exerciseSets.length > 0 ? '✓ Completed' : 'Mark as Done'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {exercise.hasWeight && (
                      <input
                        type="number"
                        placeholder="kg"
                        value={input.weight}
                        onChange={e => updateInput(exercise.name, 'weight', e.target.value)}
                        className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 text-center focus:outline-none focus:border-blue-500"
                      />
                    )}
                    <input
                      type="number"
                      placeholder="reps"
                      value={input.reps}
                      onChange={e => updateInput(exercise.name, 'reps', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSet(exercise.name)}
                      className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 text-center focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => addSet(exercise.name)}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Set
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Save */}
          <button
            onClick={saveWorkout}
            disabled={saving || Object.keys(sets).length === 0}
            className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                {saved ? 'Workout Saved' : 'Save Workout'}
              </>
            )}
          </button>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent</h2>
          <div className="space-y-3">
            {history.map(({ date, exercises }) => {
              const uniqueExercises = Array.from(new Set(exercises.map(e => e.exercise_name)))
              const wType = exercises[0]?.workout_type || 'gym'
              const rDay = exercises[0]?.routine_day || ''
              const routineName = wType === 'gym' ? GYM_ROUTINE[rDay]?.name : DESK_ROUTINE[rDay]?.name

              return (
                <div key={date} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{routineName || 'Workout'}</div>
                      <div className="text-xs text-zinc-500">{date} · {exercises.length} sets</div>
                    </div>
                    {wType === 'desk' && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full shrink-0">
                        Desk
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {uniqueExercises.slice(0, 4).map(name => {
                      const exSets = exercises.filter(e => e.exercise_name === name)
                      const maxWeight = Math.max(...exSets.map(e => e.weight_kg || 0))
                      return (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">{name}</span>
                          <span className="text-zinc-500">
                            {maxWeight > 0
                              ? `${exSets.length} sets · up to ${maxWeight}kg`
                              : `${exSets.length} sets`}
                          </span>
                        </div>
                      )
                    })}
                    {uniqueExercises.length > 4 && (
                      <div className="text-xs text-zinc-600">+{uniqueExercises.length - 4} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
