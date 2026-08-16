import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export interface CameraTarget {
  x: number
  y: number
  z: number
  lx: number
  ly: number
  lz: number
}

interface CameraRigProps {
  targetRef: RefObject<CameraTarget>
  intensity: number
}

const tmpLook = new Vector3()

/**
 * The GSAP scroll timeline owns `targetRef` (the cinematographer's shot list). This component
 * is the "camera operator": it damps the real Three.js camera toward that shot every frame and
 * layers in a small idle drift + pointer parallax so the camera never feels static between cuts.
 */
export function CameraRig({ targetRef, intensity }: CameraRigProps) {
  const elapsed = useRef(0)
  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    elapsed.current += delta
    const target = targetRef.current
    if (!target) return

    const damp = 1 - Math.pow(2, -delta / 0.9)
    const pointerDamp = 1 - Math.pow(2, -delta / 0.4)
    pointer.current.x += (state.pointer.x - pointer.current.x) * pointerDamp
    pointer.current.y += (state.pointer.y - pointer.current.y) * pointerDamp

    const driftX = Math.sin(elapsed.current * 0.06) * 0.06 * intensity
    const driftY = Math.cos(elapsed.current * 0.05) * 0.04 * intensity
    const pointerX = pointer.current.x * 0.18 * intensity
    const pointerY = pointer.current.y * 0.1 * intensity

    state.camera.position.x += (target.x + driftX + pointerX - state.camera.position.x) * damp
    state.camera.position.y += (target.y + driftY + pointerY - state.camera.position.y) * damp
    state.camera.position.z += (target.z - state.camera.position.z) * damp

    tmpLook.set(target.lx, target.ly, target.lz)
    state.camera.lookAt(tmpLook)
  })

  return null
}
