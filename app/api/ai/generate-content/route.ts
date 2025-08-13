import { type NextRequest, NextResponse } from "next/server"

async function makeOpenAIRequest(requestBody: any, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (response.ok) {
      return response
    }

    if (response.status === 429) {
      // Rate limited - wait before retrying
      const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 1s, 2s, 4s
      console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`)

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }
    }

    // If not rate limited or final attempt, throw error
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  throw new Error("Max retries exceeded")
}

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const response = await makeOpenAIRequest({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a YouTube content optimization expert. Generate engaging, SEO-friendly video titles and descriptions that will attract viewers and rank well in search results.",
        },
        {
          role: "user",
          content: `Generate 3 optimized YouTube video titles and 1 engaging video description (around 150 words) for the keyword: "${keyword}". 

The titles should be:
- Attention-grabbing and clickable
- Include the main keyword naturally
- Be between 50-60 characters for optimal display
- Use power words and emotional triggers

The description should be:
- SEO-friendly with natural keyword integration
- Include a compelling hook in the first 2 lines
- Mention what viewers will learn/gain
- Include relevant hashtags at the end
- Be around 150 words

Format your response as JSON with "titles" array and "description" string.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    })

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      const parsedContent = JSON.parse(content)
      return NextResponse.json(parsedContent)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return NextResponse.json({
        titles: [
          `Ultimate ${keyword} Guide That Actually Works!`,
          `${keyword}: The Secret Method Nobody Talks About`,
          `I Tried ${keyword} for 30 Days - Here's What Happened`,
        ],
        description: `Discover the most effective ${keyword} strategies that top creators don't want you to know! In this comprehensive guide, you'll learn proven techniques that have helped thousands of people master ${keyword}. Whether you're a complete beginner or looking to take your skills to the next level, this video covers everything you need to know. We'll break down complex concepts into easy-to-follow steps, share real-world examples, and give you actionable tips you can implement immediately. Don't forget to subscribe for more ${keyword} content! #${keyword.replace(/\s+/g, "")} #Tutorial #Guide #Tips`,
      })
    }
  } catch (error) {
    console.error("AI content generation error:", error)

    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json(
        {
          error: "OpenAI API rate limit exceeded. Please wait a moment and try again.",
          type: "rate_limit",
        },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: "Failed to generate AI content" }, { status: 500 })
  }
}
