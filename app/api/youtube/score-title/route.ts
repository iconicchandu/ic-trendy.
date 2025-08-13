import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface TitleScore {
  overall: number
  breakdown: {
    length: number
    keywords: number
    engagement: number
    clarity: number
    trending: number
  }
  improvements: string[]
  strengths: string[]
}

// Helper function to implement retry logic with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error?.status === 429 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Rate limited, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error("Max retries exceeded")
}

function calculateFallbackScore(title: string): TitleScore {
  const breakdown = {
    length: calculateLengthScore(title),
    keywords: calculateKeywordScore(title),
    engagement: calculateEngagementScore(title),
    clarity: calculateClarityScore(title),
    trending: calculateTrendingScore(title),
  }

  const overall = Math.round(
    (breakdown.length + breakdown.keywords + breakdown.engagement + breakdown.clarity + breakdown.trending) / 5,
  )

  const improvements = generateImprovements(title, breakdown)
  const strengths = generateStrengths(title, breakdown)

  return { overall, breakdown, improvements, strengths }
}

function calculateLengthScore(title: string): number {
  const length = title.length
  if (length >= 50 && length <= 60) return 100
  if (length >= 40 && length <= 70) return 80
  if (length >= 30 && length <= 80) return 60
  return 40
}

function calculateKeywordScore(title: string): number {
  const keywords = ["how to", "best", "top", "guide", "tutorial", "review", "vs", "tips", "tricks", "secrets"]
  const trendingWords = ["2024", "2025", "new", "latest", "update", "viral", "trending"]

  let score = 50
  const lowerTitle = title.toLowerCase()

  keywords.forEach((keyword) => {
    if (lowerTitle.includes(keyword)) score += 10
  })

  trendingWords.forEach((word) => {
    if (lowerTitle.includes(word)) score += 5
  })

  return Math.min(score, 100)
}

function calculateEngagementScore(title: string): number {
  const powerWords = ["amazing", "incredible", "shocking", "unbelievable", "secret", "hidden", "ultimate", "perfect"]
  const numbers = /\d+/.test(title)
  const questions = title.includes("?")
  const exclamation = title.includes("!")
  const caps = /[A-Z]{2,}/.test(title)

  let score = 40
  const lowerTitle = title.toLowerCase()

  powerWords.forEach((word) => {
    if (lowerTitle.includes(word)) score += 8
  })

  if (numbers) score += 15
  if (questions) score += 10
  if (exclamation) score += 5
  if (caps) score += 10

  return Math.min(score, 100)
}

function calculateClarityScore(title: string): number {
  let score = 70

  // Penalize excessive punctuation
  const punctuationCount = (title.match(/[!?.,;:]/g) || []).length
  if (punctuationCount > 3) score -= 20

  // Reward clear structure
  if (title.includes(":") || title.includes("-")) score += 10

  // Penalize too many capital letters
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length
  if (capsRatio > 0.3) score -= 15

  return Math.max(score, 20)
}

function calculateTrendingScore(title: string): number {
  const trendingFormats = ["vs", "reaction", "review", "unboxing", "first time", "trying", "challenge"]
  const currentYear = new Date().getFullYear().toString()

  let score = 50
  const lowerTitle = title.toLowerCase()

  trendingFormats.forEach((format) => {
    if (lowerTitle.includes(format)) score += 10
  })

  if (title.includes(currentYear)) score += 15

  return Math.min(score, 100)
}

function generateImprovements(title: string, breakdown: any): string[] {
  const improvements = []

  if (breakdown.length < 70) {
    if (title.length < 40) improvements.push("Consider making your title longer (40-60 characters is optimal)")
    if (title.length > 70) improvements.push("Try shortening your title for better visibility")
  }

  if (breakdown.keywords < 70) {
    improvements.push("Add relevant keywords like 'how to', 'best', or 'guide' to improve searchability")
  }

  if (breakdown.engagement < 70) {
    improvements.push("Include numbers or power words to make your title more engaging")
  }

  if (breakdown.clarity < 70) {
    improvements.push("Make your title clearer and more specific about the video content")
  }

  if (breakdown.trending < 70) {
    improvements.push("Consider adding current year or trending formats to boost discoverability")
  }

  return improvements.slice(0, 4)
}

function generateStrengths(title: string, breakdown: any): string[] {
  const strengths = []

  if (breakdown.length >= 80) strengths.push("Great title length for optimal visibility")
  if (breakdown.keywords >= 80) strengths.push("Good use of searchable keywords")
  if (breakdown.engagement >= 80) strengths.push("Engaging and attention-grabbing")
  if (breakdown.clarity >= 80) strengths.push("Clear and easy to understand")
  if (breakdown.trending >= 80) strengths.push("Uses trending formats effectively")

  return strengths.slice(0, 3)
}

export async function POST(request: NextRequest) {
  let title: string | undefined
  try {
    const { title: receivedTitle } = await request.json()
    title = receivedTitle

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log("OpenAI API key not configured, using fallback scoring")
      const fallbackScore = calculateFallbackScore(title)
      return NextResponse.json(fallbackScore)
    }

    try {
      // Use AI to analyze and score the title
      const { text } = await retryWithBackoff(async () => {
        return await generateText({
          model: openai("gpt-4o"),
          system: `You are a YouTube title optimization expert. Analyze the given title and provide a detailed score breakdown and improvement suggestions.

Return your response as a JSON object with this exact structure:
{
  "overall": number (0-100),
  "breakdown": {
    "length": number (0-100),
    "keywords": number (0-100), 
    "engagement": number (0-100),
    "clarity": number (0-100),
    "trending": number (0-100)
  },
  "improvements": ["improvement suggestion 1", "improvement suggestion 2", ...],
  "strengths": ["strength 1", "strength 2", ...]
}

Scoring criteria:
- Length: Optimal 50-60 characters, penalize if too short (<30) or too long (>70)
- Keywords: Presence of searchable, relevant keywords and trending terms
- Engagement: Use of power words, numbers, emotional triggers, urgency
- Clarity: Clear value proposition, easy to understand, not clickbait
- Trending: Use of current trends, popular formats, viral elements

Provide 3-5 specific, actionable improvement suggestions and 2-4 strengths.`,
          prompt: `Analyze this YouTube title: "${title}"

Provide a comprehensive score breakdown and specific suggestions for improvement.`,
        })
      })

      let scoreData: TitleScore
      try {
        scoreData = JSON.parse(text)
      } catch (parseError) {
        console.error("Failed to parse AI response:", text)
        console.log("Using fallback scoring due to parse error")
        return NextResponse.json(calculateFallbackScore(title))
      }

      // Validate the response structure
      if (!scoreData.overall || !scoreData.breakdown || !scoreData.improvements || !scoreData.strengths) {
        console.error("Invalid AI response structure:", scoreData)
        console.log("Using fallback scoring due to invalid structure")
        return NextResponse.json(calculateFallbackScore(title))
      }

      return NextResponse.json(scoreData)
    } catch (aiError: any) {
      console.error("AI scoring error:", aiError)

      if (aiError?.status === 402 || aiError?.message?.includes("quota") || aiError?.message?.includes("billing")) {
        console.log("OpenAI quota exceeded, using fallback scoring")
        const fallbackScore = calculateFallbackScore(title)
        return NextResponse.json({
          ...fallbackScore,
          fallbackUsed: true,
          message: "AI analysis unavailable due to quota limits. Using rule-based scoring.",
        })
      }

      if (aiError?.status === 429) {
        console.log("Rate limited, using fallback scoring")
        const fallbackScore = calculateFallbackScore(title)
        return NextResponse.json({
          ...fallbackScore,
          fallbackUsed: true,
          message: "AI analysis temporarily unavailable. Using rule-based scoring.",
        })
      }

      // For any other AI errors, use fallback
      console.log("AI error occurred, using fallback scoring")
      const fallbackScore = calculateFallbackScore(title)
      return NextResponse.json(fallbackScore)
    }
  } catch (error: any) {
    console.error("Title scoring error:", error)

    try {
      const fallbackScore = calculateFallbackScore(title || "")
      return NextResponse.json(fallbackScore)
    } catch (fallbackError) {
      return NextResponse.json({ error: "Failed to score title. Please try again." }, { status: 500 })
    }
  }
}
