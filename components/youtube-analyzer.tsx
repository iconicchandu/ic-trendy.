"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, TrendingUp, Star, Copy, Hash, Sparkles, RefreshCw } from "lucide-react"
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
  { id: "all", name: "All", categoryId: "0" },
  { id: "gaming", name: "Gaming", categoryId: "20" },
  { id: "music", name: "Music", categoryId: "10" },
  { id: "sports", name: "Sports", categoryId: "17" },
  { id: "entertainment", name: "Entertainment", categoryId: "24" },
  { id: "education", name: "Education", categoryId: "27" },
  { id: "tech", name: "Tech", categoryId: "28" },
  { id: "news", name: "News", categoryId: "25" },
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
  const [rewrittenTitles, setRewrittenTitles] = useState<string[]>([])
  const [rewritingTitles, setRewritingTitles] = useState(false)
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
      setRewrittenTitles([])
      toast({
        title: "Analysis Complete! 🎉",
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

  const rewriteTitles = async () => {
    if (!titleInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title first",
        variant: "destructive",
      })
      return
    }

    setRewritingTitles(true)
    try {
      const response = await fetch("/api/youtube/rewrite-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.type === "rate_limit") {
          throw new Error("Rate limit exceeded. Please wait a moment before trying again.")
        }
        throw new Error(errorData.error || "Failed to rewrite titles")
      }

      const data = await response.json()
      setRewrittenTitles(data.rewrittenTitles)

      if (data.fallbackUsed) {
        toast({
          title: "Titles Rewritten (Basic Mode)",
          description: data.message || "Generated using basic patterns",
        })
      } else {
        toast({
          title: "Titles Rewritten! ✨",
          description: `Generated ${data.rewrittenTitles.length} new viral title variations using trending context`,
        })
      }
    } catch (error) {
      console.error("Rewrite error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rewrite titles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRewritingTitles(false)
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
          title: "Title Scored Successfully! ⭐",
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
        title: "Copied! 📋",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center space-y-3">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IC%20Trendy-XCuvSySQewPUSPScRicKdOHS44eFMd.png"
              alt="IC Trendy Logo"
              className="h-8 w-auto sm:h-10"
            />
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">YouTube Content Analyzer</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Analyze titles • Get trending hashtags • Score your content
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Title Analysis
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your video title to get trending suggestions and viral hashtags
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Enter your YouTube video title..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && analyzeTitleTrends()}
                className="h-12 text-base"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={analyzeTitleTrends}
                  disabled={analyzingTitle}
                  className="h-12 text-base font-medium"
                  size="lg"
                >
                  {analyzingTitle ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analyze Title
                </Button>
                <Button
                  onClick={scoreTitleWithAI}
                  disabled={scoringTitle}
                  variant="outline"
                  className="h-12 text-base font-medium bg-transparent"
                  size="lg"
                >
                  {scoringTitle ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                  Score Title
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {titleScore && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Title Score Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-3">
                <div className={`text-5xl sm:text-6xl font-bold ${getScoreColor(titleScore.overall)}`}>
                  {titleScore.overall}
                  <span className="text-2xl sm:text-3xl text-muted-foreground">/100</span>
                </div>
                <div className="text-lg sm:text-xl font-medium text-muted-foreground">
                  {getScoreLabel(titleScore.overall)}
                </div>
                <Progress value={titleScore.overall} className="h-3 sm:h-4" />
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-base sm:text-lg">Score Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(titleScore.breakdown).map(([category, score]) => (
                    <div key={category} className="text-center p-3 bg-background/50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-primary">{score}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground capitalize">{category}</div>
                      <Progress value={score} className="mt-2 h-2" />
                    </div>
                  ))}
                </div>
              </div>

              {titleScore.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base sm:text-lg text-green-600 flex items-center gap-2">
                    ✅ Strengths
                  </h4>
                  <div className="space-y-2">
                    {titleScore.strengths.map((strength, index) => (
                      <div
                        key={index}
                        className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border-l-4 border-green-500"
                      >
                        <p className="text-sm sm:text-base">{strength}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {titleScore.improvements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-base sm:text-lg text-orange-600 flex items-center gap-2">
                    🚀 AI Suggestions
                  </h4>
                  <div className="space-y-2">
                    {titleScore.improvements.map((improvement, index) => (
                      <div
                        key={index}
                        className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border-l-4 border-orange-500"
                      >
                        <p className="text-sm sm:text-base">{improvement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {titleAnalysis && (
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    🔥 Trending Related Titles
                  </CardTitle>
                  <Button
                    onClick={rewriteTitles}
                    disabled={rewritingTitles}
                    variant="outline"
                    size="sm"
                    className="h-9 bg-transparent"
                  >
                    {rewritingTitles ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Rewrite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(rewrittenTitles.length > 0 ? rewrittenTitles : titleAnalysis.relatedTitles).map((title, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <span className="text-sm sm:text-base font-medium flex-1 leading-relaxed">{title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(title, "Title")}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Viral Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {titleAnalysis.hashtags.map((hashtag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors h-8 px-3 text-sm"
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
                  className="h-9"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Hashtags
                </Button>
              </CardContent>
            </Card>

            {titleAnalysis.suggestions.length > 0 && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">💡 Optimization Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {titleAnalysis.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-l-4 border-blue-500"
                      >
                        <p className="text-sm sm:text-base leading-relaxed">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">🇮🇳 Top Trending in India</CardTitle>
            <CardDescription className="text-sm">Discover what's trending in different categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedIndiaCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIndiaCategoryChange(category.id)}
                  disabled={loadingIndiaTrending}
                  className="h-9 px-3 text-sm font-medium"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {loadingIndiaTrending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm">Loading trending searches...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {indiaTrendingSearches.map((trend, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="h-auto p-4 text-left justify-start border border-dashed hover:border-solid hover:bg-primary/5 transition-all duration-200"
                      onClick={() => handleIndiaTrendingClick(trend.keyword)}
                    >
                      <div className="space-y-1 w-full">
                        <div className="font-medium text-sm sm:text-base">{trend.keyword}</div>
                        <div className="text-xs text-muted-foreground">
                          {trend.searchVolume.toLocaleString()} searches
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                {indiaTrendingHashtags.length > 0 && selectedIndiaCategory !== "all" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h5 className="font-medium text-sm sm:text-base flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Trending Hashtags for {categories.find((c) => c.id === selectedIndiaCategory)?.name}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {indiaTrendingHashtags.map((hashtag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors h-8 px-3 text-sm"
                          onClick={() => copyToClipboard(hashtag, "Hashtag")}
                        >
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 bg-transparent"
                      onClick={() => copyToClipboard(indiaTrendingHashtags.join(" "), "All trending hashtags")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="h-6"></div>
      </div>
    </div>
  )
}
