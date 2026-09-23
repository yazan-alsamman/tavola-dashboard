/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { FloorPlanDto } from '@/api/floorPlans'
import { FloorAreaTabs } from '@/components/floor/FloorAreaTabs'
import { LocaleProvider } from '@/context/LocaleContext'
import { countTablesByFloorPlan } from '@/lib/floorPlanSelection'

beforeEach(() => {
  localStorage.setItem('tavla-locale', 'en')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const plan = (floorPlanId: string, name: string, isActive: boolean): FloorPlanDto => ({
  floorPlanId,
  branchId: 'branch-1',
  name,
  isActive,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
})

const plans = [plan('fp-hall', 'Main Hall', true), plan('fp-terrace', 'Terrace', false)]

function renderTabs(canManage = true) {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  render(
    <LocaleProvider>
      <FloorAreaTabs
        floorPlans={plans}
        selectedId="fp-hall"
        tableCounts={countTablesByFloorPlan([
          { floorPlanId: 'fp-hall' },
          { floorPlanId: 'fp-hall' },
          { floorPlanId: 'fp-terrace' },
        ])}
        onSelect={onSelect}
        canManage={canManage}
        onAdd={onAdd}
      />
    </LocaleProvider>,
  )
  return { onSelect, onAdd }
}

describe('countTablesByFloorPlan', () => {
  it('counts tables per floorPlanId', () => {
    const counts = countTablesByFloorPlan([
      { floorPlanId: 'a' },
      { floorPlanId: 'b' },
      { floorPlanId: 'a' },
    ])
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBe(1)
    expect(counts.get('c')).toBeUndefined()
  })
})

describe('FloorAreaTabs', () => {
  it('renders one tab per floor plan with its table count', () => {
    renderTabs()
    const [hall, terrace] = screen.getAllByRole('tab')
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(hall!.textContent).toContain('Main Hall')
    expect(hall!.textContent).toContain('2')
    expect(hall!.getAttribute('aria-selected')).toBe('true')
    expect(terrace!.textContent).toContain('Terrace')
    expect(terrace!.textContent).toContain('1')
    expect(terrace!.getAttribute('aria-selected')).toBe('false')
  })

  it('marks only the active floor plan as visible to guests', () => {
    renderTabs()
    const [hall, terrace] = screen.getAllByRole('tab')
    expect(hall!.textContent).toContain('Guests')
    expect(terrace!.textContent).not.toContain('Guests')
  })

  it('selects an area by click and by arrow key', () => {
    const { onSelect } = renderTabs()
    const [hall, terrace] = screen.getAllByRole('tab')
    fireEvent.click(terrace!)
    expect(onSelect).toHaveBeenLastCalledWith('fp-terrace')
    onSelect.mockClear()
    fireEvent.keyDown(hall!, { key: 'End' })
    expect(onSelect).toHaveBeenLastCalledWith('fp-terrace')
    fireEvent.keyDown(hall!, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('fp-terrace')
  })

  it('shows Add area only to managers', () => {
    const { onAdd } = renderTabs()
    fireEvent.click(screen.getByRole('button', { name: /Add area/ }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    cleanup()
    renderTabs(false)
    expect(screen.queryByRole('button', { name: /Add area/ })).toBeNull()
  })
})
