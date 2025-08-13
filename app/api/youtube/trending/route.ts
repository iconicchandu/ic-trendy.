import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { categoryId } = await request.json()
    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    let apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=10&key=${apiKey}`

    // Only add category filter if it's not "all" and not "0" (which represents all categories)
    if (categoryId && categoryId !== "all" && categoryId !== "0") {
      apiUrl += `&videoCategoryId=${categoryId}`
    }

    console.log("Fetching from YouTube API:", apiUrl.replace(apiKey, "***"))

    // Fetch trending videos from YouTube API
    const response = await fetch(apiUrl)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("YouTube API Error:", response.status, errorText)
      throw new Error(`YouTube API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ trending: [] })
    }

    // Extract trending searches from video titles and generate mock search volumes
    const trending = data.items.map((video: any, index: number) => {
      // Extract main keywords from video title
      const title = video.snippet.title
      const keywords = title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(" ")
        .filter((word: string) => word.length > 3)
        .slice(0, 3)
        .join(" ")

      // Generate realistic search volumes based on video stats
      const viewCount = Number.parseInt(video.statistics.viewCount) || 0
      const searchVolume = Math.floor((viewCount / 1000) * (Math.random() * 0.5 + 0.5))

      return {
        keyword: keywords || title.substring(0, 30),
        searchVolume: Math.max(1000, Math.min(searchVolume, 500000)),
        category: video.snippet.categoryId,
      }
    })

    // Remove duplicates and sort by search volume
    const uniqueTrending = trending
      .filter(
        (item: any, index: number, self: any[]) => index === self.findIndex((t: any) => t.keyword === item.keyword),
      )
      .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
      .slice(0, 10)

    return NextResponse.json({ trending: uniqueTrending })
  } catch (error) {
    console.error("Error fetching trending searches:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trending searches",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
