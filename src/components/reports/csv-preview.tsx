import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileSpreadsheet } from "lucide-react"

interface CsvPreviewProps {
  data: any[]
  deviceName?: string
}

export function CsvPreview({ data, deviceName }: CsvPreviewProps) {
  // Check if data is in CSV format (array of arrays) or object format (array of objects)
  const isCsvFormat = Array.isArray(data) && data.length > 0 && Array.isArray(data[0])
  
  let headers: string[] = []
  let rows: any[] = []
  
  if (isCsvFormat) {
    // Data is in CSV format (array of arrays)
    if (data.length > 0) {
      headers = data[0] // First row contains headers
      rows = data.slice(1) // Remaining rows are data
    }
  } else {
    // Data is in object format (array of objects)
    if (data.length > 0) {
      headers = Object.keys(data[0])
      rows = data
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-6">
        <h1 className="text-3xl font-bold text-green-700">CSV Data Export</h1>
        <p className="text-lg text-gray-600">Historical Data for {deviceName || "Device"}</p>
        <p className="text-sm text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <FileSpreadsheet className="h-5 w-5" />
        <span>
          This preview shows a sample of the data that will be included in the CSV export. The full export will contain
          all historical readings from this device.
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={index} className="font-medium">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {isCsvFormat ? (
                  // Handle CSV format (array of arrays)
                  row.map((cell: any, cellIndex: number) => (
                    <TableCell key={`${rowIndex}-${cellIndex}`}>
                      {cell}
                    </TableCell>
                  ))
                ) : (
                  // Handle object format (array of objects)
                  headers.map((header, cellIndex) => (
                    <TableCell key={`${rowIndex}-${cellIndex}`}>
                      {row[header]}
                    </TableCell>
                  ))
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-center text-sm text-gray-500 pt-6 border-t mt-8">
        <p>The CSV file will contain all historical data for {deviceName || "this device"}.</p>
        <p>This data can be imported into spreadsheet software or data analysis tools for further processing.</p>
      </div>
    </div>
  )
}
