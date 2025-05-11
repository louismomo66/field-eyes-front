import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Leaf, ThumbsUp, AlertTriangle } from "lucide-react"

export function CropRecommendations() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Corn</CardTitle>
          <div className="flex items-center">
            <Badge className="bg-green-500">Highly Suitable</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Optimal pH range (6.0-7.0)
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good nitrogen levels
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Suitable soil temperature
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              May need additional potassium
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Soybeans</CardTitle>
          <div className="flex items-center">
            <Badge className="bg-green-500">Highly Suitable</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good pH levels (6.0-6.8)
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Nitrogen-fixing capabilities
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Adequate phosphorus levels
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good drainage conditions
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Wheat</CardTitle>
          <div className="flex items-center">
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Moderately Suitable
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Acceptable pH range
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good potassium levels
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              May need additional phosphorus
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              Moisture levels slightly low
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Cotton</CardTitle>
          <div className="flex items-center">
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Moderately Suitable
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good soil temperature
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Adequate potassium
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              pH slightly high (prefers 5.8-6.5)
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              May need better drainage
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sunflower</CardTitle>
          <div className="flex items-center">
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Moderately Suitable
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Good drought tolerance
            </div>
            <div className="flex items-center text-sm">
              <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
              Acceptable pH levels
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              May need additional nitrogen
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              Soil depth could be limiting
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Rice</CardTitle>
          <div className="flex items-center">
            <Badge variant="outline" className="text-red-500 border-red-500">
              Not Recommended
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Insufficient water retention
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Soil structure not suitable
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Drainage too good for paddy
            </div>
            <div className="flex items-center text-sm">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Climate conditions not ideal
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            <Leaf className="mr-2 h-4 w-4" />
            View Detailed Analysis
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
