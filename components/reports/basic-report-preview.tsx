import { Card } from "@/components/ui/card";
import { BasicSoilAnalysis } from "./basic-soil-analysis";
import type { ReportData, BasicSoilAnalysisReport } from "@/types";

interface BasicReportPreviewProps {
  reportData: ReportData | null;
  type: "basic";
}

export function BasicReportPreview({ reportData, type }: BasicReportPreviewProps) {
  if (!reportData) {
    return (
      <Card className="w-full p-4">
        <p className="text-center text-gray-500">No report data available</p>
      </Card>
    );
  }

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
} 