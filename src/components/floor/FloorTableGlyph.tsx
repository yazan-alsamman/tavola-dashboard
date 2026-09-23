import type { TableDto, TableStatusDto } from '@/api/tables'
import { Num } from '@/components/ui/Num'
import { chairAnchors } from '@/lib/floorGeometry'
import { tableShapeKind } from '@/lib/tableShape'
import { cn } from '@/lib/utils'

const statusTone: Record<TableStatusDto, string> = {
  Available: 'border-success/50 bg-surface-container-lowest text-on-surface',
  Occupied: 'border-primary bg-primary-container text-on-primary-container',
  Cleaning: 'border-warning/60 bg-warning-light text-warning',
  Disabled: 'border-error/40 bg-error/10 text-error border-dashed',
  Reserved: 'border-info-border bg-info-subtle text-info',
  Merged: 'border-secondary/60 bg-secondary-container text-on-secondary-container',
}

const chairTone: Record<TableStatusDto, string> = {
  Available: 'bg-surface-container-high border-outline-variant/50',
  Occupied: 'bg-primary/40 border-primary/50',
  Cleaning: 'bg-warning/40 border-warning/50',
  Disabled: 'bg-error/20 border-error/30',
  Reserved: 'bg-info/30 border-info/40',
  Merged: 'bg-secondary/30 border-secondary/40',
}

interface FloorTableGlyphProps {
  table: TableDto
  width: number
  height: number
  selected: boolean
  /** Visual warning only. Does not block the drop. */
  overlapping?: boolean
}

/** Visual tabletop + chairs. Geometry box is the tabletop; chairs are decoration. */
export function FloorTableGlyph({
  table,
  width,
  height,
  selected,
  overlapping = false,
}: FloorTableGlyphProps) {
  const kind = tableShapeKind(table.shape)
  const round = kind === 'round'
  const chairs = chairAnchors(
    kind === 'round' ? 'Round' : 'Rectangle',
    table.capacity,
    width,
    height,
  )

  return (
    <>
      {chairs.map((chair, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-sm border',
            chairTone[table.status],
          )}
          style={{
            left: chair.x,
            top: chair.y,
            width: 12,
            height: 8,
            transform: `rotate(${chair.rotate}deg)`,
          }}
        />
      ))}
      <span
        data-shape={kind}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center border-2 shadow-sm',
          statusTone[table.status],
          round ? 'rounded-full' : 'rounded-xl',
          kind === 'unknown' ? 'border-dashed' : '',
          selected ? 'ring-2 ring-primary ring-offset-2' : '',
          overlapping && !selected ? 'ring-2 ring-warning ring-offset-1' : '',
        )}
      >
        <span className="text-label-md font-bold leading-none">
          {table.tableNumber}
        </span>
        <span className="text-[10px] opacity-80 mt-0.5">
          <Num>{table.capacity}</Num>
        </span>
      </span>
    </>
  )
}
