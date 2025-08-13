"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, TrendingUp, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface TrendingSearch {
  keyword: string
  searchVolume: number
  category: string
}

interface TitleAnalysis {
  relatedTitles: string[]
  hashtags: string[]
  suggestions: string[]
}

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
  fallbackUsed?: boolean
  message?: string
}

const categories = [
  { id: "all", name: "All Categories", categoryId: "0" },
  { id: "gaming", name: "Gaming", categoryId: "20" },
  { id: "music", name: "Music", categoryId: "10" },
  { id: "sports", name: "Sports", categoryId: "17" },
  { id: "entertainment", name: "Entertainment", categoryId: "24" },
  { id: "education", name: "Education", categoryId: "27" },
  { id: "tech", name: "Science & Technology", categoryId: "28" },
  { id: "news", name: "News & Politics", categoryId: "25" },
]

export function YouTubeAnalyzer() {
  const [titleInput, setTitleInput] = useState("")
  const [titleAnalysis, setTitleAnalysis] = useState<TitleAnalysis | null>(null)
  const [titleScore, setTitleScore] = useState<TitleScore | null>(null)
  const [analyzingTitle, setAnalyzingTitle] = useState(false)
  const [scoringTitle, setScoringTitle] = useState(false)
  const [indiaTrendingSearches, setIndiaTrendingSearches] = useState<TrendingSearch[]>([])
  const [loadingIndiaTrending, setLoadingIndiaTrending] = useState(false)
  const [selectedIndiaCategory, setSelectedIndiaCategory] = useState("all")
  const [indiaTrendingHashtags, setIndiaTrendingHashtags] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadIndiaTrendingSearches("all")
  }, [])

  const analyzeTitleTrends = async () => {
    if (!titleInput.trim()) return

    setAnalyzingTitle(true)
    try {
      const response = await fetch("/api/youtube/analyze-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze title")
      }

      const data = await response.json()
      setTitleAnalysis(data)
      toast({
        title: "Title Analysis Complete",
        description: `Found ${data.relatedTitles.length} related titles and ${data.hashtags.length} trending hashtags`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze title. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAnalyzingTitle(false)
    }
  }

  const scoreTitleWithAI = async () => {
    if (!titleInput.trim()) return

    setScoringTitle(true)
    try {
      const response = await fetch("/api/youtube/score-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.type === "rate_limit") {
          throw new Error("Rate limit exceeded. Please wait a moment before trying again.")
        }
        throw new Error(errorData.error || "Failed to score title")
      }

      const data = await response.json()
      setTitleScore(data)

      if (data.fallbackUsed && data.message) {
        toast({
          title: "Title Scored (Basic Mode)",
          description: data.message,
          variant: "default",
        })
      } else {
        toast({
          title: "Title Scored Successfully",
          description: `Your title scored ${data.overall}/100 with ${data.improvements.length} improvement suggestions`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to score title. Please try again.",
        variant: "destructive",
      })
    } finally {
      setScoringTitle(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const loadIndiaTrendingSearches = async (categoryId: string) => {
    setLoadingIndiaTrending(true)
    try {
      const category = categories.find((cat) => cat.id === categoryId)
      const youtubeCategory = category?.categoryId || "0"

      const response = await fetch("/api/youtube/trending-india", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: youtubeCategory }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to load India trending searches")
      }

      const data = await response.json()
      setIndiaTrendingSearches(data.trending)
      setIndiaTrendingHashtags(data.hashtags || [])
    } catch (error) {
      console.error("Error loading India trending searches:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load India trending searches. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingIndiaTrending(false)
    }
  }

  const handleIndiaCategoryChange = (categoryId: string) => {
    setSelectedIndiaCategory(categoryId)
    loadIndiaTrendingSearches(categoryId)
  }

  const handleIndiaTrendingClick = (keyword: string) => {
    setTitleInput(keyword)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Needs Improvement"
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IC%20Trendy-XCuvSySQewPUSPScRicKdOHS44eFMd.png"
            alt="IC Trendy Logo"
            className="h-12 w-auto"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">YouTube Content Analyzer</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Analyze your video titles to get trending related titles and viral hashtags
        </p>
      </div>

      {/* Title Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Title Trend Analysis</CardTitle>
          <CardDescription>Analyze your video title to get trending related titles and viral hashtags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Enter your YouTube video title (e.g., 'BGMI Best Tips and Tricks 2024')"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && analyzeTitleTrends()}
              className="flex-1"
            />
            <Button onClick={analyzeTitleTrends} disabled={analyzingTitle}>
              {analyzingTitle ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Analyze Title
            </Button>
            <Button onClick={scoreTitleWithAI} disabled={scoringTitle} variant="outline">
              {scoringTitle ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
              Score Title
            </Button>
          </div>

          {titleScore && (
            <div className="mb-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Title Score Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(titleScore.overall)}`}>
                        {titleScore.overall}/100
                      </div>
                      <div className="text-lg font-medium text-muted-foreground">
                        {getScoreLabel(titleScore.overall)}
                      </div>
                      <Progress value={titleScore.overall} className="mt-2 h-3" />
                    </div>

                    {/* Score Breakdown */}
                    <div>
                      <h4 className="font-semibold mb-3">Score Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {Object.entries(titleScore.breakdown).map(([category, score]) => (
                          <div key={category} className="text-center">
                            <div className="text-2xl font-bold text-primary">{score}</div>
                            <div className="text-sm text-muted-foreground capitalize">{category}</div>
                            <Progress value={score} className="mt-1 h-2" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    {titleScore.strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-green-600">✅ Strengths</h4>
                        <div className="space-y-2">
                          {titleScore.strengths.map((strength, index) => (
                            <div
                              key={index}
                              className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border-l-4 border-green-500"
                            >
                              <p className="text-sm">{strength}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvements */}
                    {titleScore.improvements.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-orange-600">🚀 AI-Powered Improvement Suggestions</h4>
                        <div className="space-y-2">
                          {titleScore.improvements.map((improvement, index) => (
                            <div
                              key={index}
                              className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border-l-4 border-orange-500"
                            >
                              <p className="text-sm">{improvement}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* India Trending Searches section */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3 text-lg">🇮🇳 Top 10 Trending Searches in India</h4>

            {/* Category Filters for India */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedIndiaCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIndiaCategoryChange(category.id)}
                  disabled={loadingIndiaTrending}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* India Trending Keywords */}
            {loadingIndiaTrending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading India trending searches...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {indiaTrendingSearches.map((trend, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="h-auto p-3 text-left justify-start border border-dashed hover:border-solid hover:bg-primary/5"
                      onClick={() => handleIndiaTrendingClick(trend.keyword)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{trend.keyword}</div>
                        <div className="text-xs text-muted-foreground">
                          {trend.searchVolume.toLocaleString()} searches
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Trending Hashtags for Selected Category */}
                {indiaTrendingHashtags.length > 0 && selectedIndiaCategory !== "all" && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2 text-sm">
                      📈 Trending Hashtags for {categories.find((c) => c.id === selectedIndiaCategory)?.name}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {indiaTrendingHashtags.map((hashtag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => copyToClipboard(hashtag, "Hashtag")}
                        >
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 bg-transparent"
                      onClick={() => copyToClipboard(indiaTrendingHashtags.join(" "), "All trending hashtags")}
                    >
                      Copy All Hashtags
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {titleAnalysis && (
            <div className="space-y-6">
              {/* Related Trending Titles */}
              <div>
                <h4 className="font-semibold mb-3 text-lg">🔥 Top Trending Related Titles</h4>
                <div className="grid gap-3">
                  {titleAnalysis.relatedTitles.map((title, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium flex-1">{title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(title, "Title")}
                        className="ml-2"
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Hashtags */}
              <div>
                <h4 className="font-semibold mb-3 text-lg">📈 Viral Hashtags</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {titleAnalysis.hashtags.map((hashtag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => copyToClipboard(hashtag, "Hashtag")}
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(titleAnalysis.hashtags.join(" "), "All hashtags")}
                >
                  Copy All Hashtags
                </Button>
              </div>

              {/* Additional Suggestions */}
              {titleAnalysis.suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-lg">💡 Optimization Suggestions</h4>
                  <div className="space-y-2">
                    {titleAnalysis.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-l-4 border-blue-500"
                      >
                        <p className="text-sm">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
