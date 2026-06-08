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

async function buildContext() {
  const supabase = getSupabase()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().split('T')[0]

  const [{ data: logs }, { data: workouts }, { data: measurements }] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('date, meal_type, description, estimated_calories, estimated_protein_g')
      .gte('date', dateStr)
      .order('date', { ascending: false }),
    supabase
      .from('workouts')
      .select('date, type, duration_min')
      .gte('date', dateStr)
      .order('date', { ascending: false }),
    supabase
      .from('measurements')
      .select('date, weight_kg')
      .order('date', { ascending: false })
      .limit(5),
  ])

  // Group nutrition by date
  const nutritionByDate: Record<string, { calories: number; protein: number; meals: string[] }> = {}
  for (const log of logs ?? []) {
    if (!nutritionByDate[log.date]) nutritionByDate[log.date] = { calories: 0, protein: 0, meals: [] }
    nutritionByDate[log.date].calories += log.estimated_calories
    nutritionByDate[log.date].protein += log.estimated_protein_g
    nutritionByDate[log.date].meals.push(
      `  ${log.meal_type}: ${log.description} (${log.estimated_calories} kcal)`
    )
  }

  const nutritionContext = Object.entries(nutritionByDate)
    .map(
      ([date, d]) =>
        `- ${date} Total: ${d.calories} kcal | Protein: ${Math.round(d.protein)}g\n${d.meals.join('\n')}`
    )
    .join('\n')

  const workoutContext = (workouts ?? [])
    .map((w) => `- ${w.date}: ${w.type || 'workout'}${w.duration_min ? ` (${w.duration_min} min)` : ''}`)
    .join('\n')

  const weightContext = (measurements ?? [])
    .map((m) => `- ${m.date}: ${m.weight_kg}kg`)
    .join('\n')

  return `
ATHLETE PROFILE:
25-year-old female, 5'2", ~69kg, goal 54kg. Trains 5 days/week. Predominantly Indian diet.
Calorie targets: 1,700 kcal training days / 1,450 kcal rest days. Protein target: 110–120g/day.

NUTRITION (last 7 days):
${nutritionContext || 'No logs yet.'}

WORKOUTS (last 7 days):
${workoutContext || 'No workouts logged.'}

RECENT WEIGHT:
${weightContext || 'No measurements logged.'}
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const context = await buildContext()

    const systemPrompt = `You are a knowledgeable, supportive AI fitness coach. You have access to the athlete's recent data below. Use it to give specific, relevant advice. Be direct and practical — not preachy. Keep responses concise unless depth is needed.

${context}`

    if (!anthropic) {
      const msg = 'AI coach unavailable — add your ANTHROPIC_API_KEY to .env.local to enable this feature.'
      const encoder = new TextEncoder()
      return new Response(encoder.encode(msg), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
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
    console.error('Coach error:', error)
    return NextResponse.json({ error: 'Coach unavailable' }, { status: 500 })
  }
}
