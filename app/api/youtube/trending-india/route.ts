import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { categoryId } = await request.json()

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    const baseUrl = "https://www.googleapis.com/youtube/v3/videos"
    const params = new URLSearchParams({
      part: "snippet,statistics",
      chart: "mostPopular",
      regionCode: "IN", // India region code
      maxResults: "50",
      key: process.env.YOUTUBE_API_KEY,
    })

    // Only add videoCategoryId if not "all" or "0"
    if (categoryId && categoryId !== "all" && categoryId !== "0") {
      params.append("videoCategoryId", categoryId)
    }

    const response = await fetch(`${baseUrl}?${params}`)

    if (!response.ok) {
      const errorData = await response.text()
      console.error("YouTube API Error:", response.status, errorData)
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({
        trending: [],
        hashtags: [],
      })
    }

    const trending = data.items.slice(0, 10).map((video: any) => {
      const title = video.snippet.title
      const viewCount = Number.parseInt(video.statistics.viewCount || "0")

      // Extract main keyword from title (first few words)
      const keyword = title.split(" ").slice(0, 3).join(" ")

      return {
        keyword,
        searchVolume: Math.floor(viewCount / 1000), // Approximate search volume
        category: video.snippet.categoryId,
      }
    })

    const categoryHashtags = getCategoryHashtags(categoryId)

    return NextResponse.json({
      trending,
      hashtags: categoryHashtags,
    })
  } catch (error) {
    console.error("Error fetching India trending videos:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trending videos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function getCategoryHashtags(categoryId: string): string[] {
  const hashtagMap: Record<string, string[]> = {
    "20": [
      // Gaming
      "#BGMI",
      "#Gaming",
      "#PUBGMobile",
      "#FreeFire",
      "#CallOfDuty",
      "#Esports",
      "#GamingIndia",
      "#MobileGaming",
      "#LiveGaming",
      "#ProGamer",
    ],
    "10": [
      // Music
      "#BollyWood",
      "#Music",
      "#Song",
      "#Dance",
      "#Singer",
      "#MusicVideo",
      "#IndianMusic",
      "#Trending",
      "#Viral",
      "#NewSong",
    ],
    "17": [
      // Sports
      "#Cricket",
      "#Football",
      "#Sports",
      "#IPL",
      "#IndianSports",
      "#Fitness",
      "#Workout",
      "#Match",
      "#Tournament",
      "#Champion",
    ],
    "24": [
      // Entertainment
      "#Entertainment",
      "#Comedy",
      "#Funny",
      "#Viral",
      "#Trending",
      "#Bollywood",
      "#Drama",
      "#Movie",
      "#Celebrity",
      "#Fun",
    ],
    "27": [
      // Education
      "#Education",
      "#Learning",
      "#Study",
      "#Tutorial",
      "#Knowledge",
      "#School",
      "#College",
      "#Exam",
      "#Tips",
      "#Guide",
    ],
    "28": [
      // Science & Technology
      "#Technology",
      "#Tech",
      "#Innovation",
      "#Science",
      "#AI",
      "#Mobile",
      "#Gadgets",
      "#Review",
      "#Latest",
      "#Future",
    ],
    "25": [
      // News & Politics
      "#News",
      "#Politics",
      "#India",
      "#Current",
      "#Breaking",
      "#Update",
      "#Government",
      "#Election",
      "#Policy",
      "#Nation",
    ],
  }

  return (
    hashtagMap[categoryId] || [
      "#Trending",
      "#Viral",
      "#India",
      "#Popular",
      "#Latest",
      "#Hot",
      "#New",
      "#Top",
      "#Best",
      "#Amazing",
    ]
  )
}
