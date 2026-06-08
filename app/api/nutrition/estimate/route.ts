import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_PROMPT = `You are a nutrition estimator for a 25-year-old female, 5'2", 69kg current weight, goal 54kg. She eats predominantly Indian food. Her calorie target should support fat loss while fuelling her 5-day-a-week gym sessions.

Fat loss target: approximately 1,600–1,750 calories per day on training days, 1,400–1,500 on rest days.
Protein target: 110–120g per day (critical for muscle retention during fat loss).

When estimating from a description or photo:
- Be realistic with Indian food portions (a bowl of dal, 2 chapatis, a serving of sabzi etc)
- Account for cooking oil in Indian dishes — it adds up
- Give a range (e.g. 380–420 kcal) not a false single number
- Break down by ingredient so she can see what's driving calories
- Flag if a meal is very low protein and suggest a simple add-on (e.g. 'add a small bowl of curd to hit protein target')
- Never be preachy or restrictive in tone
- If she describes stress eating or a treat, estimate it neutrally without judgment`

function extractJson(text: string) {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return JSON.parse(codeBlock[1].trim())
  const bare = text.match(/\{[\s\S]*\}/)
  if (bare) return JSON.parse(bare[0])
  throw new Error('No JSON found in response')
}

export async function POST(req: NextRequest) {
  try {
    if (!anthropic) {
      return NextResponse.json({
        calories_low: 400,
        calories_high: 500,
        protein_g: 20,
        carbs_g: 50,
        fat_g: 15,
        breakdown: 'AI estimation unavailable — add your ANTHROPIC_API_KEY to .env.local to enable this feature.',
        low_protein_flag: false,
        low_protein_suggestion: null,
      })
    }

    const body = await req.json()
    const { description, imageBase64, mimeType, context, adjustment } = body

    const contextStr = context
      ? `\n\nToday's context: ${context.todayTotal || 0} kcal consumed so far. ${context.isWorkoutDay ? 'Today is a training day (target: 1,700 kcal).' : 'Today is a rest day (target: 1,450 kcal).'} Recent 7-day average: ${context.recentAverage || 'unknown'} kcal.`
      : ''

    const adjustmentStr = adjustment
      ? `\n\nUser correction: "${adjustment}" — please revise your estimate accordingly.`
      : ''

    const jsonInstruction = `

Respond with ONLY this JSON object, no other text:
{
  "calories_low": <number>,
  "calories_high": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>,
  "breakdown": "<plain English breakdown by ingredient, 2-4 sentences>",
  "low_protein_flag": <true|false>,
  "low_protein_suggestion": "<suggestion string or null>"
}`

    let messages: Anthropic.MessageParam[]

    if (imageBase64) {
      const validMime = (mimeType as string) || 'image/jpeg'
      const safeMediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(validMime)
        ? validMime
        : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: safeMediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Identify the food in this image and estimate its nutritional content.${contextStr}${adjustmentStr}${jsonInstruction}`,
            },
          ],
        },
      ]
    } else {
      messages = [
        {
          role: 'user',
          content: `Estimate the nutritional content of: ${description}${contextStr}${adjustmentStr}${jsonInstruction}`,
        },
      ]
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const nutritionData = extractJson(content.text)
    return NextResponse.json(nutritionData)
  } catch (error) {
    console.error('Nutrition estimate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to estimate nutrition' },
      { status: 500 }
    )
  }
}
