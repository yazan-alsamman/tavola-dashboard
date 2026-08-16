import type { RefObject } from 'react'
import type { Group } from 'three'
import { TableUnit } from './TableUnit'
import { ChairInstances } from './ChairInstances'
import type { TableDef } from './restaurant'

interface SelectedTableCopy {
  labelText: string
  statusLabel: string
  capacityLabel: string
}

interface RestaurantFloorProps {
  tables: readonly TableDef[]
  theme: 'light' | 'dark'
  active: boolean
  intensity: number
  isMobile: boolean
  outerRefs: RefObject<Group | null>[]
  innerRefs: RefObject<Group | null>[]
  storyProgressRef: RefObject<{ value: number }>
  selectedCopy: SelectedTableCopy
}

export function RestaurantFloor({
  tables,
  theme,
  active,
  intensity,
  isMobile,
  outerRefs,
  innerRefs,
  storyProgressRef,
  selectedCopy,
}: RestaurantFloorProps) {
  return (
    <>
      {tables.map((def, i) => (
        <TableUnit
          key={def.id}
          def={def}
          theme={theme}
          outerRef={outerRefs[i]}
          innerRef={innerRefs[i]}
          active={active}
          intensity={intensity}
          storyProgressRef={storyProgressRef}
          labelText={selectedCopy.labelText}
          statusLabel={selectedCopy.statusLabel}
          capacityLabel={selectedCopy.capacityLabel}
        />
      ))}
      <ChairInstances tables={tables} innerRefs={innerRefs} theme={theme} maxChairsPerTable={isMobile ? 3 : 4} />
    </>
  )
}
