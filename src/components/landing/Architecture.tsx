import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  InstancedMesh,
  Object3D,
  type Group,
  type MeshStandardMaterial,
} from 'three'
import { clamp01, COLUMN_POSITIONS, PENDANT_LIGHT_POSITIONS, PLANT_POSITIONS, STORY } from './restaurant'

interface ArchitectureProps {
  theme: 'light' | 'dark'
  isMobile: boolean
  storyProgressRef: RefObject<{ value: number }>
}

const TONE = {
  floor: { light: '#efe7da', dark: '#231c2c' },
  wall: { light: '#f7f2ea', dark: '#2a2233' },
  column: { light: '#e8dfcf', dark: '#3a3044' },
  wood: { light: '#8a6a4a', dark: '#5c4430' },
  desk: { light: '#2c2733', dark: '#161018' },
  foliage: { light: '#4f7a5c', dark: '#375441' },
  pot: { light: '#8a6a4a', dark: '#4a3a2a' },
  window: { light: '#fff4dd', dark: '#e8d9c2' },
  pendant: { light: '#ffd9a0', dark: '#ffcf8f' },
}

const dummy = new Object3D()

const HALL_HALF_WIDTH = 5.5
const HALL_FRONT_Z = 12.3
const HALL_BACK_Z = -9.7
const WALL_HEIGHT = 4.2
/** Half the doorway opening — each door leaf is hinged at ±this and swings toward the centerline. */
const DOORWAY_HALF_WIDTH = 1.3
const DOOR_LEAF_WIDTH = DOORWAY_HALF_WIDTH - 0.05

/** Architecture's own [0,1] fade — solid through the walk-through, thins into a diagram overhead, settles mid-way for the finale. */
function wallOpacityForStory(story: number): number {
  if (story <= STORY.riseBegin) return 1
  if (story <= STORY.floorPlan) {
    return 1 - clamp01((story - STORY.riseBegin) / (STORY.floorPlan - STORY.riseBegin)) * 0.85
  }
  if (story <= STORY.descend) return 0.15
  return 0.15 + clamp01((story - STORY.descend) / (STORY.reserve - STORY.descend)) * 0.35
}

function doorAngleForStory(story: number): number {
  const progress = clamp01((story - STORY.entrance) / (STORY.doorsOpen - STORY.entrance))
  const eased = 1 - Math.pow(1 - progress, 2)
  return eased * (Math.PI / 2 + 0.15)
}

/**
 * The building shell the camera moves through: floor, walls that thin into a floor-plan diagram
 * during the crane rise, hinged entrance doors, instanced columns/pendant lights/plants, and a
 * small reception desk. Mirrors TableUnit's pattern of reading `storyProgressRef` directly in its
 * own `useFrame` — the master scroll timeline stays the single authority only for camera + table
 * position, everything else here derives from the same normalized story value.
 */
export function Architecture({ theme, isMobile, storyProgressRef }: ArchitectureProps) {
  const floorColor = useMemo(() => new Color(theme === 'dark' ? TONE.floor.dark : TONE.floor.light), [theme])
  const wallColor = useMemo(() => new Color(theme === 'dark' ? TONE.wall.dark : TONE.wall.light), [theme])
  const columnColor = useMemo(() => new Color(theme === 'dark' ? TONE.column.dark : TONE.column.light), [theme])
  const woodColor = useMemo(() => new Color(theme === 'dark' ? TONE.wood.dark : TONE.wood.light), [theme])
  const deskColor = useMemo(() => new Color(theme === 'dark' ? TONE.desk.dark : TONE.desk.light), [theme])
  const foliageColor = useMemo(() => new Color(theme === 'dark' ? TONE.foliage.dark : TONE.foliage.light), [theme])
  const potColor = useMemo(() => new Color(theme === 'dark' ? TONE.pot.dark : TONE.pot.light), [theme])
  const windowColor = useMemo(() => new Color(theme === 'dark' ? TONE.window.dark : TONE.window.light), [theme])
  const pendantColor = useMemo(() => new Color(theme === 'dark' ? TONE.pendant.dark : TONE.pendant.light), [theme])

  const columnPositions = useMemo(
    () => (isMobile ? COLUMN_POSITIONS.filter((_, i) => i % 2 === 0) : COLUMN_POSITIONS),
    [isMobile],
  )
  const pendantPositions = useMemo(
    () => (isMobile ? PENDANT_LIGHT_POSITIONS.filter((_, i) => i % 2 === 0) : PENDANT_LIGHT_POSITIONS),
    [isMobile],
  )
  const plantPositions = useMemo(
    () => (isMobile ? PLANT_POSITIONS.filter((_, i) => i % 2 === 0) : PLANT_POSITIONS),
    [isMobile],
  )
  const windowRowZ = useMemo(() => [4.2, 1.4, -1.4, -4.2], [])

  const leftDoorRef = useRef<Group>(null)
  const rightDoorRef = useRef<Group>(null)
  const frontLeftMatRef = useRef<MeshStandardMaterial>(null)
  const frontRightMatRef = useRef<MeshStandardMaterial>(null)
  const westMatRef = useRef<MeshStandardMaterial>(null)
  const eastMatRef = useRef<MeshStandardMaterial>(null)
  const backMatRef = useRef<MeshStandardMaterial>(null)
  const columnMeshRef = useRef<InstancedMesh>(null)
  const pendantMeshRef = useRef<InstancedMesh>(null)
  const potMeshRef = useRef<InstancedMesh>(null)
  const foliageMeshRef = useRef<InstancedMesh>(null)
  const elapsed = useRef(0)

  // Columns and plants are static — their instance matrices only need to be set once.
  useEffect(() => {
    const mesh = columnMeshRef.current
    if (!mesh) return
    columnPositions.forEach((p, i) => {
      dummy.position.set(p.x, WALL_HEIGHT / 2 - 0.3, p.z)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [columnPositions])

  useEffect(() => {
    const pot = potMeshRef.current
    const foliage = foliageMeshRef.current
    if (!pot || !foliage) return
    plantPositions.forEach((p, i) => {
      dummy.position.set(p.x, 0.22, p.z)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      pot.setMatrixAt(i, dummy.matrix)

      dummy.position.set(p.x, 0.55, p.z)
      dummy.updateMatrix()
      foliage.setMatrixAt(i, dummy.matrix)
    })
    pot.instanceMatrix.needsUpdate = true
    foliage.instanceMatrix.needsUpdate = true
  }, [plantPositions])

  useFrame((_, delta) => {
    elapsed.current += delta
    const story = storyProgressRef.current?.value ?? 0

    const doorAngle = doorAngleForStory(story)
    if (leftDoorRef.current) leftDoorRef.current.rotation.y = doorAngle
    if (rightDoorRef.current) rightDoorRef.current.rotation.y = -doorAngle

    const wallOpacity = wallOpacityForStory(story)
    ;[frontLeftMatRef, frontRightMatRef, westMatRef, eastMatRef, backMatRef].forEach((ref) => {
      if (ref.current) ref.current.opacity = wallOpacity
    })
    const columnMesh = columnMeshRef.current
    if (columnMesh) {
      const mat = columnMesh.material as MeshStandardMaterial
      mat.opacity = 0.25 + wallOpacity * 0.75
    }

    const pendant = pendantMeshRef.current
    if (pendant) {
      pendantPositions.forEach((p, i) => {
        const sway = Math.sin(elapsed.current * 0.5 + i) * 0.06
        dummy.position.set(p.x + sway, p.y, p.z)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        pendant.setMatrixAt(i, dummy.matrix)
      })
      pendant.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.32, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALL_HALF_WIDTH * 2 + 1, HALL_FRONT_Z - HALL_BACK_Z]} />
        <meshStandardMaterial color={floorColor} roughness={0.75} metalness={0.04} />
      </mesh>

      {/* West wall (window wall) */}
      <mesh position={[-HALL_HALF_WIDTH, WALL_HEIGHT / 2 - 0.3, 1.2]}>
        <boxGeometry args={[0.3, WALL_HEIGHT, HALL_FRONT_Z - HALL_BACK_Z]} />
        <meshStandardMaterial ref={westMatRef} color={wallColor} roughness={0.85} transparent side={DoubleSide} />
      </mesh>
      {windowRowZ.map((z, i) => (
        <mesh key={i} position={[-HALL_HALF_WIDTH + 0.18, 1.9, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.6, 2.2]} />
          <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* East wall */}
      <mesh position={[HALL_HALF_WIDTH, WALL_HEIGHT / 2 - 0.3, 1.2]}>
        <boxGeometry args={[0.3, WALL_HEIGHT, HALL_FRONT_Z - HALL_BACK_Z]} />
        <meshStandardMaterial ref={eastMatRef} color={wallColor} roughness={0.85} transparent side={DoubleSide} />
      </mesh>

      {/* Back wall closing the private nook */}
      <mesh position={[0, WALL_HEIGHT / 2 - 0.3, HALL_BACK_Z]}>
        <boxGeometry args={[HALL_HALF_WIDTH * 2, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial ref={backMatRef} color={wallColor} roughness={0.85} transparent side={DoubleSide} />
      </mesh>

      {/* Front wall, flanking the entrance doorway */}
      <mesh position={[-(HALL_HALF_WIDTH + DOORWAY_HALF_WIDTH) / 2, WALL_HEIGHT / 2 - 0.3, HALL_FRONT_Z]}>
        <boxGeometry args={[HALL_HALF_WIDTH - DOORWAY_HALF_WIDTH, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial ref={frontLeftMatRef} color={wallColor} roughness={0.85} transparent side={DoubleSide} />
      </mesh>
      <mesh position={[(HALL_HALF_WIDTH + DOORWAY_HALF_WIDTH) / 2, WALL_HEIGHT / 2 - 0.3, HALL_FRONT_Z]}>
        <boxGeometry args={[HALL_HALF_WIDTH - DOORWAY_HALF_WIDTH, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial ref={frontRightMatRef} color={wallColor} roughness={0.85} transparent side={DoubleSide} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - 0.05, HALL_FRONT_Z]}>
        <boxGeometry args={[DOORWAY_HALF_WIDTH * 2 + 0.4, 0.5, 0.3]} />
        <meshStandardMaterial color={woodColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Entrance doors — each leaf is a pivot group hinged at the doorway edge (against the wall), so it swings on its edge instead of spinning around its own center */}
      <group ref={leftDoorRef} position={[-DOORWAY_HALF_WIDTH, 1.6, HALL_FRONT_Z]}>
        <mesh position={[DOOR_LEAF_WIDTH / 2, 0, 0]} castShadow>
          <boxGeometry args={[DOOR_LEAF_WIDTH, 3.3, 0.12]} />
          <meshStandardMaterial color={woodColor} roughness={0.55} metalness={0.1} />
        </mesh>
      </group>
      <group ref={rightDoorRef} position={[DOORWAY_HALF_WIDTH, 1.6, HALL_FRONT_Z]}>
        <mesh position={[-DOOR_LEAF_WIDTH / 2, 0, 0]} castShadow>
          <boxGeometry args={[DOOR_LEAF_WIDTH, 3.3, 0.12]} />
          <meshStandardMaterial color={woodColor} roughness={0.55} metalness={0.1} />
        </mesh>
      </group>

      {/* Reception desk */}
      <group position={[2.4, 0, 7]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.6, 1, 0.6]} />
          <meshStandardMaterial color={deskColor} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[1.7, 0.06, 0.65]} />
          <meshStandardMaterial color={woodColor} roughness={0.5} metalness={0.1} />
        </mesh>
      </group>

      {/* Columns — instanced, static */}
      <instancedMesh ref={columnMeshRef} args={[undefined, undefined, columnPositions.length]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, WALL_HEIGHT, 16]} />
        <meshStandardMaterial color={columnColor} roughness={0.6} metalness={0.08} transparent />
      </instancedMesh>

      {/* Pendant lights — instanced, gentle sway */}
      <instancedMesh ref={pendantMeshRef} args={[undefined, undefined, pendantPositions.length]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={pendantColor} emissive={pendantColor} emissiveIntensity={1.1} roughness={0.3} />
      </instancedMesh>

      {/* Plants — instanced, static */}
      <instancedMesh ref={potMeshRef} args={[undefined, undefined, plantPositions.length]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.4, 12]} />
        <meshStandardMaterial color={potColor} roughness={0.7} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={foliageMeshRef} args={[undefined, undefined, plantPositions.length]} castShadow>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} metalness={0} />
      </instancedMesh>
    </group>
  )
}
