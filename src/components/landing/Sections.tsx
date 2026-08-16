import { useRef } from 'react'
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
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 640px 480px at center, var(--color-background) 0%, color-mix(in srgb, var(--color-background) 55%, transparent) 55%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      <p data-entrance="eyebrow" className="text-label-md uppercase tracking-[0.2em] text-primary mb-4">
        {t.landing.hero.eyebrow}
      </p>
      <h1
        data-entrance="title"
        className="text-on-surface font-bold leading-[0.95] tracking-tight text-[clamp(2.75rem,7vw,5.5rem)]"
      >
        <span className="block">{t.landing.hero.titleLine1}</span>
        <span className="block text-primary">{t.landing.hero.titleLine2}</span>
      </h1>
      <p data-entrance="subtitle" className="mt-6 max-w-xl text-body-lg text-on-surface-variant">
        {t.landing.hero.subtitle}
      </p>
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

function useSectionReveal(ref: React.RefObject<HTMLElement | null>) {
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (prefersReducedMotion) return
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current ?? undefined)
      if (targets.length === 0) return

      gsap.from(targets, {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: ref, dependencies: [prefersReducedMotion] },
  )
}

interface FeatureSectionProps {
  eyebrow: string
  title: string
  body: string
  align: 'start' | 'end'
}

function FeatureSection({ eyebrow, title, body, align }: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  useSectionReveal(sectionRef)

  return (
    <section ref={sectionRef} className="relative flex min-h-[85vh] items-center px-6 py-16 md:min-h-screen">
      <div className={cn('mx-auto flex w-full max-w-5xl', align === 'end' ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'flex max-w-md flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-elevated px-8 py-9 md:px-10 md:py-11',
            align === 'end' ? 'items-end text-end' : 'items-start text-start',
          )}
        >
          <p data-reveal className="text-label-md uppercase tracking-[0.2em] text-primary mb-4">
            {eyebrow}
          </p>
          <h2 data-reveal className="text-on-surface font-bold leading-tight tracking-tight text-[clamp(1.75rem,3.4vw,2.5rem)]">
            {title}
          </h2>
          <p data-reveal className="mt-4 text-body-lg text-on-surface-variant">
            {body}
          </p>
        </div>
      </div>
    </section>
  )
}

/** Act 2 — "Choose": tables begin aligning toward the floor plan as this section scrolls into view. */
export function ChooseSection() {
  const { t } = useLocale()
  return (
    <FeatureSection eyebrow={t.landing.choose.eyebrow} title={t.landing.choose.title} body={t.landing.choose.body} align="start" />
  )
}

/** Act 3 — "The Floor": camera is near-overhead; the floor plan and availability read clearly. */
export function FloorSection() {
  const { t } = useLocale()
  return <FeatureSection eyebrow={t.landing.floor.eyebrow} title={t.landing.floor.title} body={t.landing.floor.body} align="end" />
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

/** Act 4 — "Reserve": camera settles on the chosen table; its real data surfaces beside the CTA. */
export function CtaSection({ onPrimaryCta, selectedCopy }: CtaSectionProps) {
  const { t } = useLocale()
  const sectionRef = useRef<HTMLElement>(null)
  useSectionReveal(sectionRef)

  return (
    <section ref={sectionRef} className="relative flex min-h-[75vh] flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-elevated px-8 py-11 text-center md:px-12 md:py-14">
        <p data-reveal className="text-label-md uppercase tracking-[0.2em] text-primary">
          {t.landing.cta.eyebrow}
        </p>
        <h2 data-reveal className="text-on-surface font-bold leading-tight tracking-tight text-[clamp(1.75rem,3.6vw,2.75rem)]">
          {t.landing.cta.title}
        </h2>
        <p data-reveal className="text-body-lg text-on-surface-variant">
          {t.landing.cta.body}
        </p>
        <div
          data-reveal
          className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container px-4 py-2 text-label-md"
        >
          <span className="font-bold text-primary">{selectedCopy.labelText}</span>
          <span className="text-on-surface-variant">·</span>
          <span className="text-on-surface-variant">{selectedCopy.capacityLabel}</span>
          <span className="text-on-surface-variant">·</span>
          <span className="font-semibold text-tertiary">{selectedCopy.statusLabel}</span>
        </div>
        <div data-reveal>
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
    <footer className="relative border-t border-outline-variant/20 bg-background px-6 py-8 text-center">
      <p className="text-body-sm text-on-surface-variant">
        {t.landing.nav.brand} · © {new Date().getFullYear()} · {t.landing.footer.rights}
      </p>
    </footer>
  )
}
