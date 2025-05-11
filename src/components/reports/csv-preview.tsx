import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileSpreadsheet } from "lucide-react"

interface CsvPreviewProps {
  data: any[]
  deviceName: string
}

export function CsvPreview({ data, deviceName }: CsvPreviewProps) {
  // Get headers from the first data object
  const headers = Object.keys(data[0])

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-6">
        <h1 className="text-3xl font-bold text-green-700">CSV Data Export</h1>
        <p className="text-lg text-gray-600">Historical Data for {deviceName}</p>
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
              {headers.map((header) => (
                <TableHead key={header} className="font-medium">
                  {header.charAt(0).toUpperCase() + header.slice(1)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header) => (
                  <TableCell key={`${index}-${header}`}>{row[header]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-center text-sm text-gray-500 pt-6 border-t mt-8">
        <p>The CSV file will contain all historical data for {deviceName}.</p>
        <p>This data can be imported into spreadsheet software or data analysis tools for further processing.</p>
      </div>
    </div>
  )
}
