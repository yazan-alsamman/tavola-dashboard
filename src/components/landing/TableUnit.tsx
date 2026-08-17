import { useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { Color, DoubleSide, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { clamp01, getTableDimensions, STATUS_COLOR, STORY, type TableDef } from './restaurant'

const WOOD_TONE = { light: '#c8a878', dark: '#8a6a4a' }
const BASE_TONE = { light: '#3a3440', dark: '#161018' }

interface TableUnitProps {
  def: TableDef
  theme: 'light' | 'dark'
  outerRef: RefObject<Group | null>
  innerRef: RefObject<Group | null>
  active: boolean
  intensity: number
  /** 0→1 across the whole journey. Written by the master scroll timeline. */
  storyProgressRef: RefObject<{ value: number }>
  isSelected: boolean
  /** Choosing a different table only takes effect once the floor plan is visible (story ≥ STORY.floorPlan). */
  onSelect: (id: string) => void
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
  isSelected,
  onSelect,
  labelText,
  statusLabel,
  capacityLabel,
}: TableUnitProps) {
  const topRef = useRef<Mesh>(null)
  const topMatRef = useRef<MeshStandardMaterial>(null)
  const ringRef = useRef<Mesh>(null)
  const labelDivRef = useRef<HTMLDivElement>(null)

  const elapsed = useRef(0)
  const activatedAt = useRef<number | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const dims = useMemo(() => getTableDimensions(def.shape), [def.shape])

  const [hovered, setHovered] = useState(false)
  const selectable = def.status === 'Available'
  useCursor(hovered && selectable)

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
    const hoverLift = hovered && selectable ? 0.08 : 0

    // "Choose" (approachHero → riseBegin): the selected table rises and settles; others hold still.
    const chooseProgress = clamp01((story - STORY.approachHero) / (STORY.riseBegin - STORY.approachHero))
    const selectionLift = isSelected ? chooseProgress * 0.16 : 0
    const selectionScale = isSelected ? 1 + chooseProgress * 0.1 : 1

    inner.position.set(
      pointer.current.x * 0.04 * intensity,
      floatY + selectionLift + hoverLift,
      pointer.current.y * 0.02 * intensity,
    )
    inner.rotation.y += 0.03 * intensity * delta * (isSelected ? 0.4 : 1)
    inner.scale.setScalar(breathe * selectionScale * eased)

    // Non-selected tables mute slightly during "Choose" so the chosen one stands out — kept
    // subtle so every table stays clearly readable, never blurred or washed out.
    const recede = isSelected ? 0 : chooseProgress
    if (topMatRef.current) {
      topMatRef.current.color.copy(woodColor).lerp(dimmedTop, recede * 0.3)
      topMatRef.current.opacity = 1 - recede * 0.12
    }

    // "The Floor" (riseBegin → floorPlan): available tables glow to communicate availability at a glance.
    const availabilityReveal = def.status === 'Available' ? clamp01((story - STORY.riseBegin) / (STORY.floorPlan - STORY.riseBegin)) : 0
    const baseGlow = STATUS_COLOR[def.status].glow
    const hoverGlow = hovered && selectable ? 0.3 : 0
    const ringStrength = isSelected
      ? 0.4 + chooseProgress * 0.9
      : baseGlow * (0.35 + availabilityReveal * 0.65) * (1 - recede * 0.5) + hoverGlow
    if (ringRef.current) {
      const mat = ringRef.current.material as MeshStandardMaterial
      mat.emissiveIntensity = ringStrength
      mat.opacity = 0.25 + ringStrength * 0.55
    }

    // The floating info card only makes sense once the camera has settled near the chosen table.
    // Driven directly on the DOM node (not Object3D.visible) because drei's <Html> portal doesn't
    // reliably follow an ancestor's Three.js visibility — leaving it toggled only via `visible`
    // let the card render heavily foreshortened (a thin sliver) from off-angle camera positions
    // earlier in the journey.
    if (labelDivRef.current) {
      const cardReveal = clamp01((story - STORY.descend) / (STORY.reserve - STORY.descend))
      const shown = isSelected && cardReveal > 0.02
      labelDivRef.current.style.opacity = shown ? '1' : '0'
      labelDivRef.current.style.visibility = shown ? 'visible' : 'hidden'
    }
  })

  const handlePointerOver = () => {
    if (selectable) setHovered(true)
  }
  const handlePointerOut = () => setHovered(false)
  const handleClick = () => {
    if (!selectable) return
    const story = storyProgressRef.current?.value ?? 0
    if (story < STORY.floorPlan) return
    onSelect(def.id)
  }

  return (
    <group
      ref={outerRef}
      position={[def.scatterPosition.x, def.scatterPosition.y, def.scatterPosition.z]}
      rotation={[0, def.scatterRotationY, 0]}
    >
      <group
        ref={innerRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
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

        {isSelected && (
          <group position={[dims.width / 2 + 0.9, 0.75, 0]}>
            <Html transform distanceFactor={6} occlude={false} center>
              <div
                ref={labelDivRef}
                className="pointer-events-none w-40 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 shadow-lg opacity-0 transition-opacity duration-300"
                style={{ visibility: 'hidden' }}
              >
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
