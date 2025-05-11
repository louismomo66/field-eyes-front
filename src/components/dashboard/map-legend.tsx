interface LegendItem {
  color: string
  label: string
}

interface LegendProps {
  items: LegendItem[]
  title: string
}

export function Legend({ items, title }: LegendProps) {
  return (
    <div className="bg-white p-3 rounded-md shadow-md text-sm">
      <div className="font-medium mb-2">{title}</div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
