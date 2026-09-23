/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { FloorPlanDto } from '@/api/floorPlans'
import type { TableDto } from '@/api/tables'
import { FloorAreasOverview } from '@/components/floor/FloorAreasOverview'
import { LocaleProvider } from '@/context/LocaleContext'

afterEach(() => {
  cleanup()
})

const plan = (floorPlanId: string, name: string, isActive: boolean): FloorPlanDto => ({
  floorPlanId,
  branchId: 'b',
  name,
  isActive,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
})

const table = (
  tableId: string,
  floorPlanId: string,
  tableNumber: string,
  shape: TableDto['shape'],
  width: number,
  height: number,
): TableDto => ({
  tableId,
  branchId: 'b',
  floorPlanId,
  tableNumber,
  capacity: 4,
  floor: null,
  positionX: 48,
  positionY: 48,
  width,
  height,
  rotation: shape === 'Rectangle' ? 30 : 0,
  shape,
  layer: null,
  indoor: true,
  vip: false,
  smoking: false,
  status: 'Available',
  mergeGroupId: null,
  isMergePrimary: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('FloorAreasOverview', () => {
  it('draws each floor plan as its own area and keeps rectangle geometry', () => {
    render(
      <LocaleProvider>
        <FloorAreasOverview
          floorPlans={[
            plan('hall', 'Main Hall', true),
            plan('terrace', 'Terrace', false),
          ]}
          tables={[
            table('t1', 'hall', 'T1', 'Round', 80, 80),
            table('t2', 'hall', 'T2', 'Rectangle', 180, 80),
            table('t5', 'terrace', 'T5', 'Rectangle', 160, 72),
          ]}
          selectedAreaId={null}
          selectedTableId={null}
          repositionEnabled={false}
          busyTableId={null}
          snapEnabled={false}
          onSelectArea={vi.fn()}
          onSelectTable={vi.fn()}
          onReposition={vi.fn()}
          onTransfer={vi.fn()}
        />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('floor-areas-overview')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Main Hall' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Terrace' })).toBeTruthy()

    const rectangle = screen.getByTestId('floor-table-t2')
    expect(rectangle.style.width).toBe('180px')
    expect(rectangle.style.height).toBe('80px')
    expect(rectangle.style.transform).toBe('rotate(30deg)')
    expect(rectangle.querySelector('[data-shape="rectangle"]')).toBeTruthy()

    const round = screen.getByTestId('floor-table-t1')
    expect(round.querySelector('[data-shape="round"]')).toBeTruthy()
    expect(round.querySelector('[data-shape="rectangle"]')).toBeNull()
  })
})
