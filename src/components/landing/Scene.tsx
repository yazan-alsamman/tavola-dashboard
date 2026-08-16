import { Suspense, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { ACESFilmicToneMapping, type DirectionalLight, type Group } from 'three'
import { RestaurantFloor } from './RestaurantFloor'
import { CameraRig, type CameraTarget } from './CameraRig'
import type { TableDef } from './restaurant'

interface MoodLightProps {
  theme: 'light' | 'dark'
  storyProgressRef: RefObject<{ value: number }>
}

/** The key light warms for "The Room" and "Reserve", and turns clean/architectural for "The Floor". */
function MoodLight({ theme, storyProgressRef }: MoodLightProps) {
  const ref = useRef<DirectionalLight>(null)
  const warm = theme === 'dark' ? 0.9 : 1.1
  const clean = theme === 'dark' ? 0.6 : 0.8

  useFrame(() => {
    const light = ref.current
    if (!light) return
    const story = storyProgressRef.current?.value ?? 0
    // Dips toward "clean" around the overhead floor-plan act (story ~0.55–0.85), warm elsewhere.
    const cleanliness = Math.sin(Math.min(1, Math.max(0, (story - 0.4) / 0.45)) * Math.PI)
    light.intensity = warm - (warm - clean) * cleanliness
  })

  return (
    <directionalLight
      ref={ref}
      position={[4, 6, 4]}
      intensity={warm}
      color={theme === 'dark' ? '#e8d9c2' : '#fff4e2'}
    />
  )
}

interface SceneProps {
  theme: 'light' | 'dark'
  active: boolean
  intensity: number
  isMobile: boolean
  tables: readonly TableDef[]
  outerRefs: RefObject<Group | null>[]
  innerRefs: RefObject<Group | null>[]
  cameraTargetRef: RefObject<CameraTarget>
  storyProgressRef: RefObject<{ value: number }>
  selectedCopy: { labelText: string; statusLabel: string; capacityLabel: string }
}

export function Scene({
  theme,
  active,
  intensity,
  isMobile,
  tables,
  outerRefs,
  innerRefs,
  cameraTargetRef,
  storyProgressRef,
  selectedCopy,
}: SceneProps) {
  const dpr = useMemo<[number, number]>(() => (isMobile ? [1, 1.5] : [1, 2]), [isMobile])
  const backgroundColor = theme === 'dark' ? '#1e1628' : '#fbf9f9'

  return (
    <Canvas
      dpr={dpr}
      shadows={!isMobile}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ position: [0, 2.4, 12], fov: 42, near: 0.1, far: 40 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 10, 26]} />
      <ambientLight intensity={theme === 'dark' ? 0.4 : 0.55} />
      <MoodLight theme={theme} storyProgressRef={storyProgressRef} />
      <pointLight position={[-5, -1, 3]} intensity={0.35} color="#00b39f" />

      {!isMobile && (
        <Suspense fallback={null}>
          <Environment resolution={128}>
            <Lightformer
              form="rect"
              intensity={1.6}
              color={theme === 'dark' ? '#6c45c0' : '#eaddff'}
              position={[4, 5, -3]}
              scale={[8, 4, 1]}
            />
            <Lightformer form="rect" intensity={1} color="#00b39f" position={[-4, -2, -2]} scale={[6, 3, 1]} />
            <Lightformer form="ring" intensity={0.8} color="#fff4e2" position={[0, 6, 3]} scale={5} />
          </Environment>
        </Suspense>
      )}

      <CameraRig targetRef={cameraTargetRef} intensity={intensity} />

      <RestaurantFloor
        tables={tables}
        theme={theme}
        active={active}
        intensity={intensity}
        isMobile={isMobile}
        outerRefs={outerRefs}
        innerRefs={innerRefs}
        storyProgressRef={storyProgressRef}
        selectedCopy={selectedCopy}
      />
    </Canvas>
  )
}
