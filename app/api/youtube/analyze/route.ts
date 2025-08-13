import { type NextRequest, NextResponse } from "next/server"

interface YouTubeSearchResult {
  items: Array<{
    id: { videoId: string }
    snippet: {
      title: string
      description: string
      publishedAt: string
      channelTitle: string
    }
  }>
  pageInfo: {
    totalResults: number
  }
}

interface YouTubeVideoStats {
  items: Array<{
    statistics: {
      viewCount: string
      likeCount: string
      commentCount: string
    }
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json()

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    // Generate related keywords
    const relatedKeywords = generateRelatedKeywords(keyword)

    // Analyze each keyword
    const keywordAnalysis = await Promise.all(
      relatedKeywords.map(async (kw) => {
        try {
          // Search for videos with this keyword
          const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(kw)}&type=video&maxResults=50&order=relevance&publishedAfter=${getDateOneMonthAgo()}&key=${apiKey}`,
          )

          if (!searchResponse.ok) {
            throw new Error(`YouTube API error: ${searchResponse.status}`)
          }

          const searchData: YouTubeSearchResult = await searchResponse.json()

          if (!searchData.items || searchData.items.length === 0) {
            return null
          }

          // Get video statistics for the first 10 videos
          const videoIds = searchData.items
            .slice(0, 10)
            .map((item) => item.id.videoId)
            .join(",")
          const statsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`,
          )

          const statsData: YouTubeVideoStats = await statsResponse.json()

          // Calculate metrics
          const totalVideos = searchData.pageInfo.totalResults
          const avgViews = calculateAverageViews(statsData.items)
          const competitionScore = calculateCompetitionScore(totalVideos, searchData.items)
          const trendDirection = calculateTrendDirection(searchData.items)

          return {
            keyword: kw,
            searchVolume: Math.min(avgViews * 10, 1000000), // Approximate search volume
            competitionScore,
            trendDirection,
            videoCount: totalVideos,
            avgViews,
          }
        } catch (error) {
          console.error(`Error analyzing keyword "${kw}":`, error)
          return null
        }
      }),
    )

    // Filter out null results and sort by opportunity (high volume, low competition)
    const validResults = keywordAnalysis
      .filter((result) => result !== null)
      .sort((a, b) => {
        const aScore = a.searchVolume / (a.competitionScore + 1)
        const bScore = b.searchVolume / (b.competitionScore + 1)
        return bScore - aScore
      })

    return NextResponse.json({ keywords: validResults })
  } catch (error) {
    console.error("YouTube analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze keywords" }, { status: 500 })
  }
}

function generateRelatedKeywords(seed: string): string[] {
  const variations = [
    seed,
    `${seed} tutorial`,
    `${seed} tips`,
    `${seed} guide`,
    `${seed} review`,
    `${seed} 2024`,
    `${seed} for beginners`,
    `${seed} advanced`,
    `how to ${seed}`,
    `best ${seed}`,
    `${seed} explained`,
    `${seed} secrets`,
    `${seed} mistakes`,
    `${seed} vs`,
    `${seed} comparison`,
  ]

  return variations.slice(0, 10) // Limit to 10 keywords to avoid API limits
}

function getDateOneMonthAgo(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString()
}

function calculateAverageViews(videos: Array<{ statistics: { viewCount: string } }>): number {
  if (!videos.length) return 0

  const totalViews = videos.reduce((sum, video) => {
    return sum + Number.parseInt(video.statistics.viewCount || "0")
  }, 0)

  return Math.floor(totalViews / videos.length)
}

function calculateCompetitionScore(totalVideos: number, recentVideos: any[]): number {
  // Higher total videos = higher competition
  // More recent uploads = higher competition
  const baseScore = Math.min((totalVideos / 10000) * 100, 100)
  const recentUploads = recentVideos.length
  const recencyBonus = Math.min((recentUploads / 50) * 20, 20)

  return Math.min(Math.floor(baseScore + recencyBonus), 100)
}

function calculateTrendDirection(videos: any[]): "up" | "down" | "stable" {
  if (videos.length < 5) return "stable"

  // Sort by publish date
  const sortedVideos = videos.sort(
    (a, b) => new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime(),
  )

  const recentVideos = sortedVideos.slice(0, Math.floor(videos.length / 2))
  const olderVideos = sortedVideos.slice(Math.floor(videos.length / 2))

  if (recentVideos.length > olderVideos.length * 1.5) return "up"
  if (recentVideos.length < olderVideos.length * 0.7) return "down"
  return "stable"
}
