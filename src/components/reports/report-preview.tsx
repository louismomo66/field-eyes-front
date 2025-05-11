import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"

interface SoilIndicator {
  name: string
  value: string
  rating: string
  ideal: string
  explanation: string
}

interface CropRecommendation {
  crop: string
  suitability: string
  yieldPotential: string
  estimatedCost: string
  potentialRevenue: string
  roi: string
}

interface TreatmentRecommendation {
  treatment: string
  application: string
  timing: string
  cost: string
  expectedBenefit: string
  roi: string
}

interface SeasonalActivity {
  month: string
  activities: string[]
}

interface ReportData {
  date: string
  farmName: string
  deviceName: string
  deviceId: string
  overallHealth: string
  keyFindings: string[]
  soilIndicators: SoilIndicator[]
  cropRecommendations: CropRecommendation[]
  treatmentRecommendations: TreatmentRecommendation[]
  seasonalPlan: SeasonalActivity[]
}

interface ReportPreviewProps {
  reportData: ReportData | null;
  includeTreatment: boolean;
  includeSeasonalPlan: boolean;
}

export function ReportPreview({ reportData, includeTreatment, includeSeasonalPlan }: ReportPreviewProps) {
  if (!reportData) {
    return (
      <Card className="w-full p-4">
        <p className="text-center text-gray-500">No report data available</p>
      </Card>
    );
  }

  // Helper function to get color based on rating
  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "excellent":
        return "green"
      case "good":
        return "green"
      case "fair":
        return "amber"
      case "poor":
        return "red"
      default:
        return "gray"
    }
  }

  // Helper function to get icon based on rating
  const getRatingIcon = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "fair":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "poor":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  // Helper function to get progress value based on rating
  const getRatingProgress = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "excellent":
        return 95
      case "good":
        return 75
      case "fair":
        return 50
      case "poor":
        return 25
      default:
        return 0
    }
  }

  return (
    <div className="space-y-8 print:text-black">
      {/* Report Header */}
      <div className="text-center border-b pb-6">
        <h1 className="text-3xl font-bold text-green-700">Soil Health Report</h1>
        <p className="text-lg text-gray-600">{reportData.farmName}</p>
        <p className="text-md font-medium text-gray-700">Device: {reportData.deviceName}</p>
        <p className="text-xs text-gray-500">Device ID: {reportData.deviceId}</p>
        <p className="text-sm text-gray-500 mt-2">Generated on {reportData.date}</p>
      </div>

      {/* Executive Summary */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Executive Summary</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-gray-100 rounded-full p-3">{getRatingIcon(reportData.overallHealth)}</div>
            <div>
              <p className="text-lg font-medium">
                Overall Soil Health:{" "}
                <span className={`text-${getRatingColor(reportData.overallHealth)}-600`}>
                  {reportData.overallHealth}
                </span>
              </p>
              <Progress value={getRatingProgress(reportData.overallHealth)} className={`h-2 w-48 bg-gray-200`} />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Key Findings:</h3>
            <ul className="list-disc pl-5 space-y-1">
              {reportData.keyFindings.map((finding, index) => (
                <li key={index} className="text-gray-700">
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Soil Health Indicators */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Soil Health Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportData.soilIndicators.map((indicator, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{indicator.name}</CardTitle>
                  <Badge
                    className={`bg-${getRatingColor(indicator.rating)}-100 text-${getRatingColor(indicator.rating)}-800 border-${getRatingColor(indicator.rating)}-200`}
                  >
                    {indicator.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Current Value:</span>
                    <span className="font-medium">{indicator.value}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Ideal Range:</span>
                    <span className="text-sm">{indicator.ideal}</span>
                  </div>
                  <Progress value={getRatingProgress(indicator.rating)} className="h-2" />
                  <p className="text-sm mt-2">{indicator.explanation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Crop Recommendations */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Crop Recommendations</h2>
        <div className="space-y-4">
          {reportData.cropRecommendations.map((crop, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-green-50 rounded-full p-2 mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-green-600"
                      >
                        <path d="M12 2a9 9 0 0 0-9 9c0 3.6 3.5 7.5 7 11 1.4 1.4 3.6 1.4 5 0 3.5-3.5 7-7.4 7-11a9 9 0 0 0-9-9Z"></path>
                        <path d="M12 2v20"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">{crop.crop}</h3>
                  </div>
                  <Badge
                    className={`${crop.suitability.includes("Highly") ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}
                  >
                    {crop.suitability}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Yield Potential</p>
                    <p className="font-medium">{crop.yieldPotential}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Estimated Cost</p>
                    <p className="font-medium">{crop.estimatedCost}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Potential Revenue</p>
                    <p className="font-medium">{crop.potentialRevenue}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Return on Investment:</p>
                    <p className="font-bold text-green-600">{crop.roi}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Treatment Recommendations */}
      {includeTreatment && (
        <section>
          <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Treatment Recommendations</h2>
          <div className="space-y-4">
            {reportData.treatmentRecommendations.map((treatment, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">{treatment.treatment}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Application Rate</p>
                      <p className="font-medium">{treatment.application}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Timing</p>
                      <p className="font-medium">{treatment.timing}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Estimated Cost</p>
                      <p className="font-medium">{treatment.cost}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-500">Expected Benefit:</p>
                      <p className="font-medium text-green-600">{treatment.expectedBenefit}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">Return on Investment:</p>
                      <p className="font-bold text-green-600">{treatment.roi}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Seasonal Management Plan */}
      {includeSeasonalPlan && (
        <section>
          <h2 className="text-2xl font-bold mb-4 text-green-700 border-b pb-2">Seasonal Management Plan</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.seasonalPlan.map((season, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle>{season.month}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {season.activities.map((activity, actIndex) => (
                        <li key={actIndex} className="text-gray-700">
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-6 border-t mt-8">
        <p>This report was generated by SoilSense based on data collected from your soil monitoring devices.</p>
        <p>For questions or assistance interpreting this report, please contact support@soilsense.com</p>
      </div>
    </div>
  )
}
