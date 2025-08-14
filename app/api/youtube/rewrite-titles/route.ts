import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function rewriteTitlesWithAI(title: string, maxRetries = 3) {
  // Using static trending context instead of dynamic fetch
  const trendingContext = `
Current trending topics in India: BGMI, Cricket World Cup, Bollywood, Tech Reviews, Gaming, Music Videos, Comedy, Food Vlogs, Travel, Education, News, Sports Highlights, Movie Trailers, Dance Videos, Fashion`

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a YouTube content optimization expert specializing in viral Indian content. Your task is to rewrite video titles to make them more engaging, clickable, and viral while maintaining the core message.

Guidelines for rewriting titles:
- Make them more engaging and clickable for Indian audience
- Use power words and emotional triggers that work in India
- Include numbers, questions, or curiosity gaps when appropriate
- Keep them under 60 characters for better visibility
- Make each variation unique and different from the others
- Focus on different angles: emotional, curiosity, benefit-driven, urgency, trending
- Consider current trending topics and incorporate relevant elements
- Use language that resonates with Indian YouTube viewers
- Ensure they're relevant to the original title's intent

Return exactly 5 rewritten title variations, each on a new line, without numbering or bullet points.${trendingContext}`,
          },
          {
            role: "user",
            content: `Rewrite this YouTube video title in 5 different ways, making them more viral and engaging for Indian audience: "${title}"`,
          },
        ],
        temperature: 0.9,
        max_tokens: 500,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      // Parse the response to extract the 5 titles
      const rewrittenTitles = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.match(/^\d+[.)]/))
        .slice(0, 5)

      if (rewrittenTitles.length < 5) {
        while (rewrittenTitles.length < 5) {
          rewrittenTitles.push(`${title} - Variation ${rewrittenTitles.length + 1}`)
        }
      }

      return rewrittenTitles
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error)

      if (error.status === 429) {
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`Rate limited, waiting ${delayMs}ms before retry...`)
          await delay(delayMs)
          continue
        }
        throw new Error("Rate limit exceeded. Please try again in a moment.")
      }

      if (error.status === 402) {
        console.log("OpenAI quota exceeded, using fallback rewrite method")
        return generateFallbackRewrites(title)
      }

      if (attempt === maxRetries) {
        throw error
      }

      await delay(1000 * attempt)
    }
  }

  throw new Error("Failed to rewrite titles after all attempts")
}

function generateFallbackRewrites(title: string): string[] {
  const powerWords = [
    "Amazing",
    "Shocking",
    "Incredible",
    "Unbelievable",
    "Secret",
    "Hidden",
    "Ultimate",
    "Best",
    "Worst",
    "Epic",
  ]
  const emotions = ["😱", "🔥", "💯", "⚡", "🚀", "💥", "🎯", "✨"]
  const patterns = [
    `${powerWords[Math.floor(Math.random() * powerWords.length)]} ${title}`,
    `${title} ${emotions[Math.floor(Math.random() * emotions.length)]}`,
    `You Won't Believe: ${title}`,
    `${title} - Must Watch!`,
    `The Truth About ${title}`,
  ]

  return patterns.slice(0, 5)
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required and must be a string" }, { status: 400 })
    }

    let rewrittenTitles: string[]
    let fallbackUsed = false

    if (!process.env.OPENAI_API_KEY) {
      console.log("OpenAI API key not configured, using fallback method")
      rewrittenTitles = generateFallbackRewrites(title)
      fallbackUsed = true
    } else {
      try {
        rewrittenTitles = await rewriteTitlesWithAI(title)
      } catch (error: any) {
        console.error("OpenAI error:", error)
        if (error.message.includes("quota exceeded") || error.message.includes("Rate limit exceeded")) {
          console.log("Using fallback due to API issues")
          rewrittenTitles = generateFallbackRewrites(title)
          fallbackUsed = true
        } else {
          return NextResponse.json({ error: "Failed to rewrite titles. Please try again." }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      rewrittenTitles,
      originalTitle: title,
      fallbackUsed,
      message: fallbackUsed ? "Generated using basic rewrite patterns (OpenAI unavailable)" : undefined,
    })
  } catch (error: any) {
    console.error("Title rewrite error:", error)

    if (error.message && error.message.includes("Rate limit exceeded")) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a moment before trying again.",
          type: "rate_limit",
        },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: "Failed to rewrite titles. Please try again." }, { status: 500 })
  }
}
