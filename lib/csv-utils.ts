export interface CSVExportData {
  keyword: string
  searchVolume: number
  competitionScore: number
  trendDirection: string
  videoCount: number
  avgViews: number
}

export function generateCSV(data: CSVExportData[], filename: string): void {
  const headers = [
    "Keyword",
    "Search Volume",
    "Competition Score (%)",
    "Trend Direction",
    "Video Count",
    "Average Views",
  ]

  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      [
        `"${row.keyword}"`,
        row.searchVolume.toString(),
        row.competitionScore.toString(),
        `"${row.trendDirection}"`,
        row.videoCount.toString(),
        row.avgViews.toString(),
      ].join(","),
    ),
  ].join("\n")

  downloadCSV(csvContent, filename)
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function formatCSVFilename(searchTerm: string): string {
  const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-")
  const date = new Date().toISOString().split("T")[0]
  return `youtube-keywords-${cleanTerm}-${date}.csv`
}
