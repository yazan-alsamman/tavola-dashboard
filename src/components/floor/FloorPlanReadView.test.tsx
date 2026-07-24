/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { FloorPlanReadView } from '@/components/floor/FloorPlanReadView'
import { LocaleProvider } from '@/context/LocaleContext'
import type { TableDto } from '@/api/tables'

afterEach(() => {
  cleanup()
})

const table: TableDto = {
  tableId: 'tttttttt-tttt-tttt-tttt-tttttttttttt',
  branchId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  floorPlanId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  tableNumber: 'T1',
  capacity: 4,
  floor: null,
  positionX: 120,
  positionY: 45,
  width: 80,
  height: 80,
  rotation: 0,
  shape: 'Rectangle',
  layer: null,
  indoor: true,
  vip: false,
  smoking: false,
  status: 'Available',
  mergeGroupId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('FloorPlanReadView RTL geometry', () => {
  it('keeps the same physical left/top coordinates under RTL document direction', () => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'

    const { getByTestId, unmount } = render(
      <LocaleProvider>
        <FloorPlanReadView
          tables={[table]}
          selectedTableId={null}
          onSelectTable={() => undefined}
        />
      </LocaleProvider>,
    )

    const el = getByTestId(`floor-table-${table.tableId}`)
    expect(el.getAttribute('data-x')).toBe('120')
    expect(el.getAttribute('data-y')).toBe('45')
    expect(el.style.left).toBe('120px')
    expect(el.style.top).toBe('45px')

    unmount()

    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'

    const second = render(
      <LocaleProvider>
        <FloorPlanReadView
          tables={[table]}
          selectedTableId={null}
          onSelectTable={() => undefined}
        />
      </LocaleProvider>,
    )

    const el2 = second.getByTestId(`floor-table-${table.tableId}`)
    expect(el2.style.left).toBe('120px')
    expect(el2.style.top).toBe('45px')
  })

  it('does not call onReposition during pointer move — only after meaningful drag end', () => {
    const onReposition = vi.fn()
    const { getByTestId } = render(
      <LocaleProvider>
        <FloorPlanReadView
          tables={[table]}
          selectedTableId={null}
          onSelectTable={() => undefined}
          repositionEnabled
          onReposition={onReposition}
        />
      </LocaleProvider>,
    )

    const el = getByTestId(`floor-table-${table.tableId}`)
    const canvas = getByTestId('floor-plan-canvas')

    fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 })
    expect(onReposition).not.toHaveBeenCalled()

    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 130, pointerId: 1 })
    expect(onReposition).not.toHaveBeenCalled()

    fireEvent.pointerUp(canvas, { clientX: 140, clientY: 130, pointerId: 1 })
    expect(onReposition).toHaveBeenCalledTimes(1)
    expect(onReposition).toHaveBeenCalledWith(table.tableId, 160, 75)
  })
})
