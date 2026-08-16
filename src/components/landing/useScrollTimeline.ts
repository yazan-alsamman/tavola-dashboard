import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Group } from 'three'
import { CAMERA_KEYFRAMES, type TableDef } from './restaurant'
import type { CameraTarget } from './CameraRig'

gsap.registerPlugin(ScrollTrigger)

/** Three acts, one GSAP-unit each: Room → Choose/Floor → Reserve. Matches CAMERA_KEYFRAMES. */
const TIMELINE_TOTAL = 3

interface ScrollTimelineOptions {
  enabled: boolean
}

interface ScrollTimelineInput {
  tables: readonly TableDef[]
  outerRefs: RefObject<Group | null>[]
  cameraTargetRef: RefObject<CameraTarget>
  storyProgressRef: RefObject<{ value: number }>
}

/**
 * The single master timeline for the whole page: one ScrollTrigger, scrubbed across the entire
 * scroll range, driving three coordinated things at once — the camera's shot list, every table's
 * scatter→grid transform, and a normalized `storyProgressRef` that individual TableUnits read in
 * their own useFrame to derive selection emphasis / dimming / availability glow. Per the GSAP+R3F
 * integration pattern, GSAP tweens the Object3D refs directly; R3F's render loop picks up the
 * mutated transforms on the next frame.
 */
export function useScrollTimeline(
  containerRef: RefObject<HTMLElement | null>,
  { tables, outerRefs, cameraTargetRef, storyProgressRef }: ScrollTimelineInput,
  options: ScrollTimelineOptions,
) {
  const rafId = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!options.enabled) return

    let ctx: gsap.Context | undefined

    const setup = () => {
      const container = containerRef.current
      const ready = outerRefs.every((ref) => ref.current)
      if (!container || !ready) {
        rafId.current = requestAnimationFrame(setup)
        return
      }

      const [act1, act2, act3, act4] = CAMERA_KEYFRAMES
      cameraTargetRef.current = {
        x: act1.position.x,
        y: act1.position.y,
        z: act1.position.z,
        lx: act1.lookAt.x,
        ly: act1.lookAt.y,
        lz: act1.lookAt.z,
      }
      storyProgressRef.current = { value: 0 }

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
          },
        })

        // Camera: The Room → Choose → The Floor → Reserve.
        const shot = (target: typeof act1, time: number) =>
          tl.to(
            cameraTargetRef.current!,
            {
              x: target.position.x,
              y: target.position.y,
              z: target.position.z,
              lx: target.lookAt.x,
              ly: target.lookAt.y,
              lz: target.lookAt.z,
              duration: 1,
              ease: 'power2.inOut',
            },
            time,
          )
        shot(act2, 0)
        shot(act3, 1)
        shot(act4, 2)

        // Floor: every table settles from its scattered "room" position into the aligned floor plan.
        tl.to(
          outerRefs.map((ref) => ref.current!.position),
          {
            x: (i: number) => tables[i].gridPosition.x,
            y: (i: number) => tables[i].gridPosition.y,
            z: (i: number) => tables[i].gridPosition.z,
            duration: 1.4,
            ease: 'power2.inOut',
          },
          0.6,
        )
        tl.to(
          outerRefs.map((ref) => ref.current!.rotation),
          { y: 0, duration: 1.4, ease: 'power2.inOut' },
          0.6,
        )

        // Normalized 0→1 scroll story, read by TableUnit for selection/dimming/availability beats.
        tl.to(storyProgressRef.current!, { value: 1, ease: 'none', duration: TIMELINE_TOTAL }, 0)
      })
    }

    setup()

    return () => {
      if (rafId.current !== undefined) cancelAnimationFrame(rafId.current)
      ctx?.revert()
    }
  }, [containerRef, outerRefs, cameraTargetRef, storyProgressRef, tables, options.enabled])
}
