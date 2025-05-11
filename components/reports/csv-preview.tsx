import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CsvPreviewProps {
  data: any[];
  deviceName?: string;
}

export function CsvPreview({ data, deviceName }: CsvPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <p className="text-center text-gray-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>CSV Preview</CardTitle>
        {deviceName && (
          <p className="text-sm text-gray-500">Device: {deviceName}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {data[0].map((header: string, index: number) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(1).map((row: any[], rowIndex: number) => (
                <TableRow key={rowIndex}>
                  {row.map((cell: any, cellIndex: number) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 