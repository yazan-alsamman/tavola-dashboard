import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Group } from 'three'
import { STORY, type CameraKeyframe, type TableDef } from './restaurant'
import type { CameraTarget } from './CameraRig'

gsap.registerPlugin(ScrollTrigger)

interface ScrollTimelineOptions {
  enabled: boolean
}

interface ScrollTimelineInput {
  tables: readonly TableDef[]
  cameraKeyframes: readonly CameraKeyframe[]
  outerRefs: RefObject<Group | null>[]
  cameraTargetRef: RefObject<CameraTarget>
  storyProgressRef: RefObject<{ value: number }>
}

/**
 * The single master timeline for the whole page: one ScrollTrigger, scrubbed across the entire
 * scroll range, driving everything at once — the camera's ten-shot list, every table's
 * scatter→grid transform (timed to the crane-rise act), and a normalized `storyProgressRef` that
 * TableUnit / Architecture read in their own useFrame to derive door swing, wall opacity,
 * selection emphasis, and availability glow. Per the GSAP+R3F integration pattern, GSAP tweens
 * the Object3D refs directly; R3F's render loop picks up the mutated transforms on the next frame.
 *
 * `cameraKeyframes` is rebuilt by the caller whenever the selected table changes (the closing
 * "descend"/"reserve" shots re-target onto it) — this effect tears down and recreates the whole
 * GSAP context in response, and ScrollTrigger re-syncs to the current scroll position immediately,
 * so CameraRig just smoothly damps toward the adjusted target instead of jumping.
 */
export function useScrollTimeline(
  containerRef: RefObject<HTMLElement | null>,
  { tables, cameraKeyframes, outerRefs, cameraTargetRef, storyProgressRef }: ScrollTimelineInput,
  options: ScrollTimelineOptions,
) {
  const rafId = useRef<number | undefined>(undefined)
  const timelineTotal = cameraKeyframes.length - 1

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

        // Camera: one cinematographer shot per story beat, cut-to-cut across the whole journey.
        for (let i = 1; i < cameraKeyframes.length; i += 1) {
          const target = cameraKeyframes[i]
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
            i - 1,
          )
        }

        // Floor: every table settles from its "walking through the room" position into the
        // aligned floor plan, timed to the crane-rise act (riseBegin → floorPlan).
        const riseStart = STORY.riseBegin * timelineTotal
        const riseDuration = (STORY.floorPlan - STORY.riseBegin) * timelineTotal
        tl.to(
          outerRefs.map((ref) => ref.current!.position),
          {
            x: (i: number) => tables[i].gridPosition.x,
            y: (i: number) => tables[i].gridPosition.y,
            z: (i: number) => tables[i].gridPosition.z,
            duration: riseDuration,
            ease: 'power2.inOut',
          },
          riseStart,
        )
        tl.to(
          outerRefs.map((ref) => ref.current!.rotation),
          { y: 0, duration: riseDuration, ease: 'power2.inOut' },
          riseStart,
        )

        // Normalized 0→1 scroll story, read by TableUnit / Architecture for every derived beat.
        tl.to(storyProgressRef.current!, { value: 1, ease: 'none', duration: timelineTotal }, 0)
      })
    }

    setup()

    return () => {
      if (rafId.current !== undefined) cancelAnimationFrame(rafId.current)
      ctx?.revert()
    }
  }, [containerRef, outerRefs, cameraTargetRef, storyProgressRef, tables, cameraKeyframes, timelineTotal, options.enabled])
}
