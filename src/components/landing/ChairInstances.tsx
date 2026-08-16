import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Object3D, type Group } from 'three'
import { computeChairOffsets, type TableDef } from './restaurant'

interface ChairEntry {
  tableIndex: number
  x: number
  z: number
  rotationY: number
}

interface ChairInstancesProps {
  tables: readonly TableDef[]
  innerRefs: RefObject<Group | null>[]
  theme: 'light' | 'dark'
  maxChairsPerTable: number
}

const SEAT_TONE = { light: '#e4ded2', dark: '#463c50' }
const FRAME_TONE = { light: '#2c2733', dark: '#161018' }

const dummy = new Object3D()

/**
 * All chairs across every table render through two InstancedMesh draw calls (seat + backrest)
 * instead of N individual meshes. Each frame, every chair's world matrix is recomposed from its
 * table's current `innerRef.matrixWorld` (already scroll-tweened + idle-bobbed) — one frame of
 * lag versus true scene-graph parenting, imperceptible at 60fps, and it keeps ~30+ chairs to 2
 * draw calls instead of 60+.
 */
export function ChairInstances({ tables, innerRefs, theme, maxChairsPerTable }: ChairInstancesProps) {
  const seatMeshRef = useRef<InstancedMesh>(null)
  const backMeshRef = useRef<InstancedMesh>(null)

  const entries = useMemo<ChairEntry[]>(() => {
    const list: ChairEntry[] = []
    tables.forEach((table, tableIndex) => {
      const count = Math.min(maxChairsPerTable, table.capacity, 4)
      const offsets = computeChairOffsets(table.shape, count)
      offsets.forEach((offset) => list.push({ tableIndex, ...offset }))
    })
    return list
  }, [tables, maxChairsPerTable])

  const seatColor = useMemo(() => new Color(theme === 'dark' ? SEAT_TONE.dark : SEAT_TONE.light), [theme])
  const frameColor = useMemo(() => new Color(theme === 'dark' ? FRAME_TONE.dark : FRAME_TONE.light), [theme])

  const localMatrix = useRef(new Matrix4())
  const worldMatrix = useRef(new Matrix4())

  useFrame(() => {
    const seatMesh = seatMeshRef.current
    const backMesh = backMeshRef.current
    if (!seatMesh || !backMesh) return

    entries.forEach((entry, i) => {
      const parent = innerRefs[entry.tableIndex]?.current
      if (!parent) return

      dummy.position.set(entry.x, 0.16, entry.z)
      dummy.rotation.set(0, entry.rotationY, 0)
      dummy.updateMatrix()
      worldMatrix.current.multiplyMatrices(parent.matrixWorld, dummy.matrix)
      seatMesh.setMatrixAt(i, worldMatrix.current)

      dummy.position.set(entry.x, 0.34, entry.z + Math.sin(entry.rotationY) * -0.14)
      dummy.rotation.set(0, entry.rotationY, 0)
      dummy.updateMatrix()
      localMatrix.current.multiplyMatrices(parent.matrixWorld, dummy.matrix)
      backMesh.setMatrixAt(i, localMatrix.current)
    })

    seatMesh.instanceMatrix.needsUpdate = true
    backMesh.instanceMatrix.needsUpdate = true
  })

  if (entries.length === 0) return null

  return (
    <>
      <instancedMesh ref={seatMeshRef} args={[undefined, undefined, entries.length]} frustumCulled={false}>
        <boxGeometry args={[0.32, 0.06, 0.32]} />
        <meshStandardMaterial color={seatColor} roughness={0.85} metalness={0.02} />
      </instancedMesh>
      <instancedMesh ref={backMeshRef} args={[undefined, undefined, entries.length]} frustumCulled={false}>
        <boxGeometry args={[0.3, 0.32, 0.05]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.15} />
      </instancedMesh>
    </>
  )
}
