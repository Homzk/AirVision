import { levelToColor, levelToLabel, type Level } from '@/lib/airQuality'

const LEVELS: readonly Level[] = ['good', 'moderate', 'unhealthy', 'hazardous', 'no_data']

export function MapLegend() {
  return (
    <div
      role="region"
      aria-label="Leyenda del mapa"
      className="pointer-events-auto absolute bottom-4 right-4 z-[1000] rounded-md border border-border bg-background/95 p-3 text-xs shadow-md backdrop-blur"
    >
      <p className="mb-2 font-medium text-foreground">Calidad del aire</p>
      <ul className="space-y-1">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2 text-muted-foreground">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full border border-foreground/10"
              style={{ backgroundColor: levelToColor(level) }}
            />
            <span>{levelToLabel(level)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
