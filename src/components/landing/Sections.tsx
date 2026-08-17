import { useEffect, useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface HeroProps {
  onPrimaryCta: () => void
  primaryCtaLabel: string
  secondaryCtaHref: string
  secondaryCtaLabel: string
}

export function Hero({ onPrimaryCta, primaryCtaLabel, secondaryCtaHref, secondaryCtaLabel }: HeroProps) {
  const { t } = useLocale()

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 640px 480px at center, var(--color-background) 0%, color-mix(in srgb, var(--color-background) 55%, transparent) 55%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      <TextBox className="flex max-w-2xl flex-col items-center text-center">
        <p data-entrance="eyebrow" className="text-label-md uppercase tracking-[0.2em] text-primary mb-4">
          {t.landing.hero.eyebrow}
        </p>
        <h1
          data-entrance="title"
          className="text-on-surface font-bold leading-[0.95] tracking-tight text-[clamp(2.25rem,9vw,5.5rem)]"
        >
          <span className="block">{t.landing.hero.titleLine1}</span>
          <span className="block text-primary">{t.landing.hero.titleLine2}</span>
        </h1>
        <p data-entrance="subtitle" className="mt-6 max-w-xl text-body-lg text-on-surface-variant">
          {t.landing.hero.subtitle}
        </p>
      </TextBox>
      <div data-entrance="cta" className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onPrimaryCta}>
          {primaryCtaLabel}
        </Button>
        <Link
          to={secondaryCtaHref}
          className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-body-lg font-semibold text-on-surface-variant transition-colors hover:text-primary"
        >
          {secondaryCtaLabel}
        </Link>
      </div>
      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-on-surface-variant/70">
        <span className="text-label-sm uppercase tracking-widest">{t.landing.hero.scrollHint}</span>
        <span className="h-8 w-px bg-current opacity-40" aria-hidden="true" />
      </div>
    </section>
  )
}

interface TextBoxProps {
  children: ReactNode
  className?: string
}

/**
 * Groups a beat's copy into one bordered, glassy surface instead of loose floating lines, so the
 * text reads as a clear, self-contained unit against the 3D scene behind it. It reveals with a
 * scroll-triggered 3D tilt (CSS `perspective` on the wrapper + GSAP `rotateX`) and responds to the
 * pointer with a subtle `rotateX`/`rotateY` tilt, so it behaves like a physical card rather than
 * flat text — the animation is real 3D (perspective + transform), not just a fade.
 */
function TextBox({ children, className }: TextBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (prefersReducedMotion || !boxRef.current) return
      gsap.from(boxRef.current, {
        opacity: 0,
        y: 40,
        rotationX: -30,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: boxRef.current,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: boxRef, dependencies: [prefersReducedMotion] },
  )

  useEffect(() => {
    const el = boxRef.current
    if (!el || prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) return

    const setRotateX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' })
    const setRotateY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' })

    const handleMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      setRotateY(((event.clientX - rect.left) / rect.width - 0.5) * 8)
      setRotateX(((event.clientY - rect.top) / rect.height - 0.5) * -8)
    }
    const handleLeave = () => {
      setRotateX(0)
      setRotateY(0)
    }

    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerleave', handleLeave)
    return () => {
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerleave', handleLeave)
    }
  }, [prefersReducedMotion])

  return (
    <div className="pointer-events-auto [perspective:1400px]">
      <div
        ref={boxRef}
        className={cn(
          'w-full max-w-full rounded-2xl border border-outline-variant/30 bg-surface-container/85 px-5 py-4 shadow-xl shadow-black/10 backdrop-blur-md will-change-transform sm:px-6 sm:py-5',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

function useSectionReveal(ref: React.RefObject<HTMLElement | null>) {
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (prefersReducedMotion) return
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current ?? undefined)
      if (targets.length === 0) return

      gsap.from(targets, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: ref, dependencies: [prefersReducedMotion] },
  )
}

interface CaptionProps {
  eyebrow?: string
  line: string
  align: 'start' | 'center' | 'end'
  minHeightClassName: string
}

/**
 * A cinematic caption: one short line (optionally with an eyebrow), grouped into a bordered
 * `TextBox` so the copy reads clearly against the 3D scene behind it. It tilts/fades in once
 * scrolled near, then the camera (and the user) simply continue past it.
 */
function Caption({ eyebrow, line, align, minHeightClassName }: CaptionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  useSectionReveal(sectionRef)

  const wrapClass =
    align === 'center' ? 'mx-auto text-center' : align === 'end' ? 'ms-auto text-end' : 'me-auto text-start'

  return (
    <section
      ref={sectionRef}
      className={cn('relative flex flex-col justify-center px-4 sm:px-6 pointer-events-none', minHeightClassName)}
    >
      <div className={cn('w-full max-w-md', wrapClass)}>
        <TextBox>
          {eyebrow ? (
            <p data-reveal className="mb-3 text-label-md uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <p
            data-reveal
            className="text-on-surface font-bold leading-tight tracking-tight text-[clamp(1.5rem,3.4vw,2.5rem)]"
          >
            {line}
          </p>
        </TextBox>
      </div>
    </section>
  )
}

/** Beat: reception — a single warm line as the camera passes the desk. */
export function ReceptionCaption() {
  const { t } = useLocale()
  return <Caption line={t.landing.reception.line} align="center" minHeightClassName="min-h-[85vh]" />
}

/** Beat: hall reveal → weave → approach — the longest stretch of pure camera movement. */
export function HallCaption() {
  const { t } = useLocale()
  return (
    <Caption
      eyebrow={t.landing.hall.eyebrow}
      line={t.landing.hall.line}
      align="start"
      minHeightClassName="min-h-[190vh]"
    />
  )
}

/** Beat: crane rise → overhead floor plan. */
export function FloorplanCaption() {
  const { t } = useLocale()
  return (
    <Caption
      eyebrow={t.landing.floorplan.eyebrow}
      line={t.landing.floorplan.line}
      align="end"
      minHeightClassName="min-h-[120vh]"
    />
  )
}

/** Beat: descend — the last line before the reservation moment. */
export function ReserveIntroCaption() {
  const { t } = useLocale()
  return <Caption line={t.landing.reserveIntro.line} align="center" minHeightClassName="min-h-[85vh]" />
}

interface SelectedCopy {
  labelText: string
  statusLabel: string
  capacityLabel: string
}

interface CtaSectionProps {
  onPrimaryCta: () => void
  selectedCopy: SelectedCopy
}

/** Beat: reserve — the camera settles on the chosen table; its real data surfaces beside the CTA. */
export function CtaSection({ onPrimaryCta, selectedCopy }: CtaSectionProps) {
  const { t } = useLocale()
  const sectionRef = useRef<HTMLElement>(null)
  useSectionReveal(sectionRef)

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[110vh] flex-col items-center justify-center px-4 text-center pointer-events-none sm:px-6"
    >
      <div className="pointer-events-auto flex flex-col items-center">
        <TextBox className="flex max-w-lg flex-col items-center text-center">
          <p data-reveal className="text-label-md uppercase tracking-[0.2em] text-primary">
            {t.landing.cta.eyebrow}
          </p>
          <h2
            data-reveal
            className="mt-4 text-on-surface font-bold leading-tight tracking-tight text-[clamp(1.75rem,3.6vw,2.75rem)]"
          >
            {t.landing.cta.title}
          </h2>
          <p data-reveal className="mt-4 max-w-md text-body-lg text-on-surface-variant">
            {t.landing.cta.body}
          </p>
          <div
            data-reveal
            className="mt-6 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-outline-variant/40 px-4 py-2 text-label-md"
          >
            <span className="font-bold text-primary">{selectedCopy.labelText}</span>
            <span className="text-on-surface-variant">·</span>
            <span className="text-on-surface-variant">{selectedCopy.capacityLabel}</span>
            <span className="text-on-surface-variant">·</span>
            <span className="font-semibold text-tertiary">{selectedCopy.statusLabel}</span>
          </div>
        </TextBox>
        <div data-reveal className="mt-8">
          <Button size="lg" onClick={onPrimaryCta}>
            {t.landing.cta.button}
          </Button>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const { t } = useLocale()
  return (
    <footer className="relative border-t border-outline-variant/20 bg-background px-4 py-8 text-center sm:px-6">
      <p className="text-body-sm text-on-surface-variant">
        {t.landing.nav.brand} · © {new Date().getFullYear()} · {t.landing.footer.rights}
      </p>
    </footer>
  )
}
