import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

// Helper function for asset paths
const assetPath = (path: string) => `/app${path.startsWith('/') ? path : `/${path}`}`;

interface Parameter {
  name: string;
  unit: string;
  ideal_min: number;
  ideal_max: number;
  average: number;
  min: number;
  max: number;
  rating: string;
  cec?: number;
}

interface BasicSoilAnalysisProps {
  data: {
    device_name: string;
    parameters: Parameter[];
    generated_at: string;
    start_date: string;
    end_date: string;
  };
}

export function BasicSoilAnalysis({ data }: BasicSoilAnalysisProps) {
  // Calculate the range and position for each parameter type
  const getParameterRanges = (param: Parameter) => {
    switch (param.name) {
      case "pH":
        return { min: 0, max: 14, ranges: [
          { label: "Very Low", max: 5.0 },
          { label: "Low", max: 6.0 },
          { label: "Optimum", max: 7.5 },
          { label: "High", max: 8.5 },
          { label: "Very High", max: 14 }
        ]};
      case "Nitrogen":
      case "Phosphorous":
        return { min: 0, max: 100, ranges: [
          { label: "Very Low", max: 10 },
          { label: "Low", max: 20 },
          { label: "Optimum", max: 40 },
          { label: "High", max: 60 },
          { label: "Very High", max: 100 }
        ]};
      case "Potassium":
        return { min: 0, max: 800, ranges: [
          { label: "Very Low", max: 100 },
          { label: "Low", max: 150 },
          { label: "Optimum", max: 250 },
          { label: "High", max: 400 },
          { label: "Very High", max: 800 }
        ]};
      case "Soil Moisture":
        return { min: 0, max: 100, ranges: [
          { label: "Very Low", max: 15 },
          { label: "Low", max: 20 },
          { label: "Optimum", max: 60 },
          { label: "High", max: 80 },
          { label: "Very High", max: 100 }
        ]};
      case "Electrical Conductivity":
        return { min: 0, max: 4, ranges: [
          { label: "Very Low", max: 0.5 },
          { label: "Low", max: 0.8 },
          { label: "Optimum", max: 1.5 },
          { label: "High", max: 2.5 },
          { label: "Very High", max: 4.0 }
        ]};
      default:
        return { min: 0, max: 100, ranges: [
          { label: "Very Low", max: 20 },
          { label: "Low", max: 40 },
          { label: "Optimum", max: 60 },
          { label: "High", max: 80 },
          { label: "Very High", max: 100 }
        ]};
    }
  };

  const calculateBarWidth = (param: Parameter): number => {
    const { min, max } = getParameterRanges(param);
    // Calculate percentage based on the parameter's range
    return ((param.average - min) / (max - min)) * 100;
  };

  const getRatingWidth = (rating: string): number => {
    switch (rating.toLowerCase()) {
      case "very low":
        return 20;
      case "low":
        return 40;
      case "optimum":
        return 60;
      case "high":
        return 80;
      case "very high":
        return 100;
      default:
        return 0;
    }
  };

  const getRatingColor = (rating: string): { bg: string, print: string } => {
    switch (rating.toLowerCase()) {
      case "very low":
        return { 
          bg: "bg-red-500",
          print: "print:border-red-500 print:border-2"
        };
      case "low":
        return { 
          bg: "bg-orange-500",
          print: "print:border-orange-500 print:border-2"
        };
      case "optimum":
        return { 
          bg: "bg-green-500",
          print: "print:border-green-500 print:border-2"
        };
      case "high":
        return { 
          bg: "bg-yellow-500",
          print: "print:border-yellow-500 print:border-2"
        };
      case "very high":
        return { 
          bg: "bg-purple-500",
          print: "print:border-purple-500 print:border-2"
        };
      default:
        return { 
          bg: "bg-gray-500",
          print: "print:border-gray-500 print:border-2"
        };
    }
  };

  return (
    <Card className="w-full print:shadow-none">
      <CardHeader>
        {/* Logo */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-16 w-32 relative">
            <Image
              src={assetPath("/logo.png")}
              alt="FieldEyes Logo"
              fill
              sizes="(max-width: 768px) 100vw, 128px"
              className="object-contain"
            />
          </div>
          <div className="text-right">
            <CardTitle>Basic Soil Analysis Report</CardTitle>
            <div className="text-sm text-gray-500">
              <p>Device: {data.device_name}</p>
              <p>Period: {new Date(data.start_date).toLocaleDateString()} - {new Date(data.end_date).toLocaleDateString()}</p>
              <p>Generated: {new Date(data.generated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Parameter Values Table */}
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2">Parameter</th>
                <th className="text-left py-2">Unit</th>
                <th className="text-left py-2">Ideal Range</th>
                <th className="text-right py-2">Average</th>
                <th className="text-right py-2">Min</th>
                <th className="text-right py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {data.parameters.map((param, index) => (
                <tr key={index} className="border-t">
                  <td className="py-2 font-medium">{param.name}</td>
                  <td className="py-2">{param.unit}</td>
                  <td className="py-2">{param.ideal_min} - {param.ideal_max}</td>
                  <td className="py-2 text-right">{param.average.toFixed(2)}</td>
                  <td className="py-2 text-right">{param.min.toFixed(2)}</td>
                  <td className="py-2 text-right">{param.max.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Ratings Chart */}
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Parameter Ratings</h3>
            <div className="relative">
              {/* Column Headers */}
              <div className="flex border-b mb-4">
                <div className="w-32">Parameter</div>
                <div className="flex-1 flex">
                  <div className="flex-1 text-center text-sm text-red-600 print:font-semibold">Very Low</div>
                  <div className="flex-1 text-center text-sm text-orange-600 print:font-semibold">Low</div>
                  <div className="flex-1 text-center text-sm text-green-600 print:font-semibold">Optimum</div>
                  <div className="flex-1 text-center text-sm text-yellow-600 print:font-semibold">High</div>
                  <div className="flex-1 text-center text-sm text-purple-600 print:font-semibold">Very High</div>
                </div>
              </div>

              {/* Parameter Bars */}
              <div className="space-y-4">
                {data.parameters.map((param, index) => {
                  const ratingStyle = getRatingColor(param.rating);
                  return (
                    <div key={index} className="flex items-center">
                      <div className="w-32 text-sm font-medium">{param.name}</div>
                      <div className="flex-1 relative h-6 bg-gray-100 print:bg-white print:border print:border-gray-200">
                        {/* Column Dividers */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1 border-r border-gray-200"></div>
                          <div className="flex-1"></div>
                        </div>
                        {/* Parameter Bar */}
                        <div 
                          className={`absolute h-4 mt-1 rounded ${ratingStyle.bg} ${ratingStyle.print} print:bg-white`}
                          style={{ 
                            width: `${getRatingWidth(param.rating)}%`,
                            left: '0'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 