import { Card } from "@/components/ui/card";
import { BasicSoilAnalysis } from "./basic-soil-analysis";
import type { ReportData, BasicSoilAnalysisReport } from "@/src/types";

interface ReportPreviewProps {
  reportData: ReportData | null;
  type: "comprehensive" | "basic" | "crop";
}

export function ReportPreview({ reportData, type }: ReportPreviewProps) {
  if (!reportData) {
    return (
      <Card className="w-full p-4">
        <p className="text-center text-gray-500">No report data available</p>
      </Card>
    );
  }

  switch (type) {
    case "basic":
      if (
        "device_name" in reportData &&
        "parameters" in reportData &&
        "generated_at" in reportData &&
        "start_date" in reportData &&
        "end_date" in reportData
      ) {
        return <BasicSoilAnalysis data={reportData as BasicSoilAnalysisReport} />;
      }
      return (
        <Card className="w-full p-4">
          <p className="text-center text-gray-500">Invalid basic soil analysis report data</p>
        </Card>
      );
    case "comprehensive":
      return (
        <Card className="w-full p-4">
          <p className="text-center text-gray-500">Comprehensive report preview not implemented yet</p>
        </Card>
      );
    case "crop":
      return (
        <Card className="w-full p-4">
          <p className="text-center text-gray-500">Crop report preview not implemented yet</p>
        </Card>
      );
    default:
      return (
        <Card className="w-full p-4">
          <p className="text-center text-gray-500">Unknown report type</p>
        </Card>
      );
  }
} 