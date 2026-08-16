import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, DoubleSide, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { getTableDimensions, STATUS_COLOR, type TableDef } from './restaurant'

const WOOD_TONE = { light: '#c8a878', dark: '#8a6a4a' }
const BASE_TONE = { light: '#3a3440', dark: '#161018' }

interface TableUnitProps {
  def: TableDef
  theme: 'light' | 'dark'
  outerRef: RefObject<Group | null>
  innerRef: RefObject<Group | null>
  active: boolean
  intensity: number
  /** 0 → hero act, 1 → choose, 2 → floor plan, 3 → reserve. Written by the master scroll timeline. */
  storyProgressRef: RefObject<{ value: number }>
  labelText: string
  statusLabel: string
  capacityLabel: string
}

/**
 * One table: GSAP tweens `outerRef` (scatter→grid position/rotation) directly, driven by the
 * master scroll timeline. `innerRef` is this component's own idle bob/breathing/selection
 * emphasis, applied every frame — the two layers never fight over the same transform.
 */
export function TableUnit({
  def,
  theme,
  outerRef,
  innerRef,
  active,
  intensity,
  storyProgressRef,
  labelText,
  statusLabel,
  capacityLabel,
}: TableUnitProps) {
  const topRef = useRef<Mesh>(null)
  const topMatRef = useRef<MeshStandardMaterial>(null)
  const ringRef = useRef<Mesh>(null)
  const labelGroupRef = useRef<Group>(null)

  const elapsed = useRef(0)
  const activatedAt = useRef<number | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const dims = useMemo(() => getTableDimensions(def.shape), [def.shape])

  const woodColor = useMemo(() => new Color(theme === 'dark' ? WOOD_TONE.dark : WOOD_TONE.light), [theme])
  const baseColor = useMemo(() => new Color(theme === 'dark' ? BASE_TONE.dark : BASE_TONE.light), [theme])
  const statusColor = useMemo(
    () => new Color(theme === 'dark' ? STATUS_COLOR[def.status].dark : STATUS_COLOR[def.status].light),
    [theme, def.status],
  )
  const dimmedTop = useMemo(() => woodColor.clone().lerp(new Color('#000000'), 0.35), [woodColor])

  const phase = useMemo(() => (def.tableNumber.charCodeAt(0) + def.tableNumber.charCodeAt(1)) % 7, [def.tableNumber])
  const floatSpeed = (2 * Math.PI) / (9 + phase * 1.6)
  const breatheSpeed = (2 * Math.PI) / (11 + phase)

  useFrame((state, delta) => {
    const inner = innerRef.current
    if (!inner) return

    elapsed.current += delta
    const time = elapsed.current
    const story = storyProgressRef.current?.value ?? 0

    if (active && activatedAt.current === null) activatedAt.current = time
    const sinceActivation = activatedAt.current === null ? -1 : time - activatedAt.current - phase * 0.06
    const entrance = sinceActivation < 0 ? 0 : Math.min(1, sinceActivation / 0.9)
    const eased = 1 - Math.pow(1 - entrance, 3)

    const pointerDamp = 1 - Math.pow(2, -delta / 0.3)
    pointer.current.x += (state.pointer.x - pointer.current.x) * pointerDamp
    pointer.current.y += (state.pointer.y - pointer.current.y) * pointerDamp

    const floatY = Math.sin(time * floatSpeed + phase) * 0.05 * intensity
    const breathe = 1 + Math.sin(time * breatheSpeed + phase) * 0.015 * intensity

    // "Choose" (story 0.15–0.45): the selected table rises and settles; others hold still.
    const chooseProgress = clamp01((story - 0.15) / 0.3)
    const selectionLift = def.selected ? chooseProgress * 0.16 : 0
    const selectionScale = def.selected ? 1 + chooseProgress * 0.1 : 1

    inner.position.set(
      pointer.current.x * 0.04 * intensity,
      floatY + selectionLift,
      pointer.current.y * 0.02 * intensity,
    )
    inner.rotation.y += 0.03 * intensity * delta * (def.selected ? 0.4 : 1)
    inner.scale.setScalar(breathe * selectionScale * eased)

    // "Recede" (story 0.2–0.5): non-selected tables mute slightly so the chosen one stands out —
    // kept subtle so every table stays clearly readable, never blurred or washed out.
    const recede = def.selected ? 0 : clamp01((story - 0.2) / 0.3)
    if (topMatRef.current) {
      topMatRef.current.color.copy(woodColor).lerp(dimmedTop, recede * 0.3)
      topMatRef.current.opacity = 1 - recede * 0.12
    }

    // "The Floor" (story 0.5–0.8): available tables glow to communicate availability at a glance.
    const availabilityReveal = def.status === 'Available' ? clamp01((story - 0.5) / 0.3) : 0
    const baseGlow = STATUS_COLOR[def.status].glow
    const ringStrength = def.selected
      ? 0.4 + chooseProgress * 0.9
      : baseGlow * (0.35 + availabilityReveal * 0.65) * (1 - recede * 0.5)
    if (ringRef.current) {
      const mat = ringRef.current.material as MeshStandardMaterial
      mat.emissiveIntensity = ringStrength
      mat.opacity = 0.25 + ringStrength * 0.55
    }

    // The floating info card only makes sense once the camera has settled near the chosen table.
    if (labelGroupRef.current) {
      const cardReveal = clamp01((story - 0.62) / 0.22)
      labelGroupRef.current.visible = cardReveal > 0.02
    }
  })

  return (
    <group
      ref={outerRef}
      position={[def.scatterPosition.x, def.scatterPosition.y, def.scatterPosition.z]}
      rotation={[0, def.scatterRotationY, 0]}
    >
      <group ref={innerRef}>
        {def.shape === 'Round' ? (
          <>
            <mesh ref={topRef} position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[dims.radius, dims.radius, 0.06, 28]} />
              <meshStandardMaterial ref={topMatRef} color={woodColor} roughness={0.7} metalness={0.05} transparent />
            </mesh>
            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry args={[0.05, 0.08, 0.5, 12]} />
              <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <cylinderGeometry args={[dims.radius * 0.55, dims.radius * 0.55, 0.03, 20]} />
              <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.6} />
            </mesh>
          </>
        ) : (
          <>
            <mesh ref={topRef} position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[dims.width, 0.06, dims.depth]} />
              <meshStandardMaterial ref={topMatRef} color={woodColor} roughness={0.7} metalness={0.05} transparent />
            </mesh>
            {[
              [-dims.width / 2 + 0.08, -dims.depth / 2 + 0.08],
              [dims.width / 2 - 0.08, -dims.depth / 2 + 0.08],
              [-dims.width / 2 + 0.08, dims.depth / 2 - 0.08],
              [dims.width / 2 - 0.08, dims.depth / 2 - 0.08],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.24, z]}>
                <boxGeometry args={[0.06, 0.5, 0.06]} />
                <meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.6} />
              </mesh>
            ))}
          </>
        )}

        <mesh ref={ringRef} position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[dims.radius > 0 ? dims.radius + 0.5 : 0.9, dims.radius > 0 ? dims.radius + 0.58 : 1.0, 32]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={0.3}
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={0.35}
            side={DoubleSide}
          />
        </mesh>

        {def.selected && (
          <group ref={labelGroupRef} visible={false} position={[dims.width / 2 + 0.9, 0.75, 0]}>
            <Html transform distanceFactor={6} occlude={false} center>
              <div className="pointer-events-none w-40 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 shadow-lg">
                <p className="text-label-sm font-bold text-primary">{labelText}</p>
                <p className="mt-0.5 text-body-sm font-semibold text-on-surface">{capacityLabel}</p>
                <p className="mt-0.5 text-label-sm text-tertiary">{statusLabel}</p>
              </div>
            </Html>
          </group>
        )}
      </group>
    </group>
  )
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
