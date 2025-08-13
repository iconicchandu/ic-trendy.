import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    // Extract keywords from the title for search
    const keywords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word: string) => word.length > 2)
      .slice(0, 3)
      .join(" ")

    // Search for related videos
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&q=${encodeURIComponent(keywords)}&` +
        `type=video&order=relevance&maxResults=20&key=${apiKey}`,
    )

    if (!searchResponse.ok) {
      throw new Error("Failed to fetch related videos")
    }

    const searchData = await searchResponse.json()
    const videos = searchData.items || []

    // Extract trending titles (filter out exact matches and similar)
    const relatedTitles = videos
      .map((video: any) => video.snippet.title)
      .filter((videoTitle: string) => {
        const similarity = calculateSimilarity(title.toLowerCase(), videoTitle.toLowerCase())
        return similarity < 0.7 && videoTitle.length > 20 // Not too similar, not too short
      })
      .slice(0, 8)

    // Generate trending hashtags based on the title and related content
    const hashtags = generateTrendingHashtags(title, videos)

    // Generate optimization suggestions
    const suggestions = generateOptimizationSuggestions(title, relatedTitles)

    return NextResponse.json({
      relatedTitles,
      hashtags,
      suggestions,
    })
  } catch (error) {
    console.error("Title analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze title", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/)
  const words2 = str2.split(/\s+/)
  const commonWords = words1.filter((word) => words2.includes(word))
  return commonWords.length / Math.max(words1.length, words2.length)
}

function generateTrendingHashtags(title: string, videos: any[]): string[] {
  const commonHashtags = ["#viral", "#trending", "#youtube", "#shorts", "#fyp", "#subscribe", "#like", "#share"]

  // Extract keywords from title
  const titleKeywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => `#${word}`)

  // Gaming-specific hashtags if gaming content detected
  const gamingKeywords = ["bgmi", "gaming", "game", "pubg", "mobile", "tips", "tricks", "gameplay"]
  const isGaming = titleKeywords.some((tag) => gamingKeywords.some((keyword) => tag.includes(keyword)))

  const gamingHashtags = isGaming
    ? ["#gaming", "#mobilegaming", "#bgmi", "#pubgmobile", "#gamingcommunity", "#esports"]
    : []

  // Music-specific hashtags if music content detected
  const musicKeywords = ["song", "music", "cover", "remix", "beat", "lyrics"]
  const isMusic = titleKeywords.some((tag) => musicKeywords.some((keyword) => tag.includes(keyword)))

  const musicHashtags = isMusic ? ["#music", "#song", "#cover", "#remix", "#musician", "#newmusic"] : []

  // Combine and deduplicate
  const allHashtags = [...titleKeywords.slice(0, 3), ...gamingHashtags, ...musicHashtags, ...commonHashtags]

  return [...new Set(allHashtags)].slice(0, 12)
}

function generateOptimizationSuggestions(title: string, relatedTitles: string[]): string[] {
  const suggestions: string[] = []

  // Check title length
  if (title.length < 30) {
    suggestions.push("Consider making your title longer (30-60 characters) for better SEO")
  } else if (title.length > 100) {
    suggestions.push("Your title might be too long. Consider shortening it to under 60 characters")
  }

  // Check for numbers
  if (!/\d/.test(title)) {
    suggestions.push("Adding numbers (like '2024', 'Top 10', '5 Tips') can increase click-through rates")
  }

  // Check for emotional words
  const emotionalWords = ["amazing", "incredible", "shocking", "unbelievable", "epic", "insane", "crazy"]
  if (!emotionalWords.some((word) => title.toLowerCase().includes(word))) {
    suggestions.push("Consider adding emotional words like 'Amazing', 'Epic', or 'Incredible' to boost engagement")
  }

  // Check for trending patterns in related titles
  const commonWords = relatedTitles
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)

  const wordCount: { [key: string]: number } = {}
  commonWords.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  const trendingWords = Object.entries(wordCount)
    .filter(([_, count]) => count >= 3)
    .map(([word]) => word)
    .slice(0, 3)

  if (trendingWords.length > 0) {
    suggestions.push(`Trending words in your niche: ${trendingWords.join(", ")}. Consider incorporating them.`)
  }

  return suggestions.slice(0, 4)
}
