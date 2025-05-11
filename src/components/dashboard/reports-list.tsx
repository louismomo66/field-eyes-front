"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, Eye } from "lucide-react"
import { getReports } from "@/lib/api"
import type { Report } from "@/types"

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch reports from API
      const data = await getReports()
      setReports(data)
      setIsLoading(false)
    } catch (err) {
      console.error("Error fetching reports:", err)
      setError("Failed to load reports")
      setIsLoading(false)
    }
  }

  const handleViewReport = (report: Report) => {
    // Open report in new tab or implement your view logic
    window.open(report.url, "_blank")
  }

  const handleDownloadReport = (report: Report) => {
    // Implement download logic
    // This could be a direct download link or a more complex process
    const link = document.createElement("a")
    link.href = report.url
    link.download = report.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-[200px]">Loading reports...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px]">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          Retry
        </Button>
      </div>
    )
  }

  if (reports.length === 0) {
    return <div className="flex justify-center items-center h-[200px]">No reports available</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Report Name</TableHead>
          <TableHead>Date Generated</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.name}</TableCell>
            <TableCell>{report.date}</TableCell>
            <TableCell>{report.type}</TableCell>
            <TableCell>{report.size}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleViewReport(report)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDownloadReport(report)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
