import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const dateStr = fourWeeksAgo.toISOString().split('T')[0]

    const [{ data: logs }, { data: workouts }, { data: measurements }] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('date, meal_type, description, estimated_calories, estimated_protein_g, estimated_carbs_g, estimated_fat_g')
        .gte('date', dateStr)
        .order('date', { ascending: true }),
      supabase
        .from('workouts')
        .select('date, type')
        .gte('date', dateStr)
        .order('date', { ascending: true }),
      supabase
        .from('measurements')
        .select('date, weight_kg')
        .gte('date', dateStr)
        .order('date', { ascending: true }),
    ])

    // Group nutrition logs by date
    const byDate: Record<string, { calories: number; protein: number; meals: string[] }> = {}
    for (const log of logs ?? []) {
      if (!byDate[log.date]) byDate[log.date] = { calories: 0, protein: 0, meals: [] }
      byDate[log.date].calories += log.estimated_calories
      byDate[log.date].protein += log.estimated_protein_g
      byDate[log.date].meals.push(`${log.meal_type}: ${log.description} (${log.estimated_calories} kcal)`)
    }

    const workoutDates = new Set((workouts ?? []).map((w) => w.date))

    const nutritionSummary = Object.entries(byDate)
      .map(([date, data]) => {
        const isWorkout = workoutDates.has(date)
        const target = isWorkout ? 1700 : 1450
        return `${date} [${isWorkout ? 'training' : 'rest'}] — ${data.calories} kcal / target ${target} | Protein: ${Math.round(data.protein)}g\n  ${data.meals.join('\n  ')}`
      })
      .join('\n\n')

    const weightSummary = (measurements ?? [])
      .map((m) => `${m.date}: ${m.weight_kg}kg`)
      .join(', ')

    const prompt = `Here is nutrition data for the last 4 weeks for a 25-year-old female, 5'2", current weight ~69kg, goal 54kg, training 5 days/week.

NUTRITION LOGS:
${nutritionSummary || 'No logs yet.'}

WEIGHT MEASUREMENTS:
${weightSummary || 'No measurements yet.'}

TARGETS:
- Training days: 1,700 kcal, 115g protein
- Rest days: 1,450 kcal, 115g protein

Please provide:
1. Average daily intake vs target (training vs rest days separately)
2. Protein consistency — is she hitting 110–120g?
3. Key patterns you notice (undereating, overeating, timing, consistency)
4. Whether to adjust targets based on weight trend (dropping / stalling / dropping too fast)
5. Meal timing recommendation for her schedule: wakes 9am, gym at 10am, first real meal at 2pm, dinner around 10pm
6. Two or three specific, actionable suggestions for next week

Be direct, warm, and practical. No preamble. Start with the numbers.`

    if (!anthropic) {
      const msg = 'AI analysis unavailable — add your ANTHROPIC_API_KEY to .env.local to enable weekly budget reviews.'
      const encoder = new TextEncoder()
      return new Response(encoder.encode(msg), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Budget review error:', error)
    return NextResponse.json({ error: 'Failed to generate budget review' }, { status: 500 })
  }
}
