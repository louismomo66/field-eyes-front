import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import type { BasicSoilAnalysisReport } from "@/types"
import { getAssetPath } from "@/lib/utils"

interface BasicReportPreviewProps {
  reportData: BasicSoilAnalysisReport | null;
  type: "basic";
}

const getUnitDisplay = (unit: string) => {
  switch (unit.toLowerCase()) {
    case 'ph':
      return '';
    case '%':
      return '%';
    case 'mg/kg':
      return ' mg/kg';
    case 'µs/cm':
    case 'us/cm':
      return ' µS/cm';
    default:
      return ` ${unit}`;
  }
};

export function BasicReportPreview({ reportData, type }: BasicReportPreviewProps) {
  if (!reportData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No report data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full print:shadow-none">
      <CardHeader>
        {/* Logo */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-16 w-32 relative">
            <Image
              src={getAssetPath("/logo.png")}
              alt="FieldEyes Logo"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 128px"
              className="object-contain"
            />
          </div>
          <div className="text-right">
            <CardTitle>Basic Soil Analysis Report</CardTitle>
            <div className="text-sm text-gray-500">
              <p>Device: {reportData.device_name}</p>
              <p>Period: {new Date(reportData.start_date).toLocaleDateString()} - {new Date(reportData.end_date).toLocaleDateString()}</p>
              <p>Generated: {new Date(reportData.generated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Report content will go here */}
        <div className="space-y-6">
          {reportData.parameters?.map((param, index) => (
            <div key={index} className="border-b pb-4">
              <h3 className="font-medium mb-2">{param.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Average Value</p>
                  <p>{param.average} {getUnitDisplay(param.unit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p>{param.rating}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Range</p>
                  <p>{param.min} - {param.max} {getUnitDisplay(param.unit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ideal Range</p>
                  <p>{param.ideal_min} - {param.ideal_max} {getUnitDisplay(param.unit)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 