import { createRef, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Group } from 'three'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { MaterialIcon } from '@/components/ui/Icon'
import { Scene } from './Scene'
import { Fallback3D } from './Fallback3D'
import {
  Hero,
  ReceptionCaption,
  HallCaption,
  FloorplanCaption,
  ReserveIntroCaption,
  CtaSection,
  Footer,
} from './Sections'
import { useReducedMotion } from './useReducedMotion'
import { useWebGLSupport } from './useWebGLSupport'
import { useIsMobile } from './useIsMobile'
import { useScrollTimeline } from './useScrollTimeline'
import {
  buildCameraKeyframes,
  DEFAULT_SELECTED_TABLE_ID,
  DESKTOP_TABLES,
  MOBILE_TABLES,
} from './restaurant'
import type { CameraTarget } from './CameraRig'

function Nav() {
  const { t, toggleLocale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated } = useAuth()

  return (
    <header data-entrance="nav" className="relative z-20 flex items-center justify-between px-6 py-6 md:px-10">
      <Link to="/" className="flex items-center gap-2.5">
        <img
          src="/logo.png"
          alt={t.landing.nav.brand}
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="text-headline-md font-bold text-primary">{t.landing.nav.brand}</span>
      </Link>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLocale}
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
          aria-label={t.header.language}
        >
          <MaterialIcon name="language" size={20} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
          aria-label={t.landing.nav.toggleTheme}
        >
          <MaterialIcon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={20} />
        </button>
        <Link
          to={isAuthenticated ? '/app' : '/login'}
          className="ms-2 inline-flex h-10 items-center justify-center rounded-lg px-4 text-body-md font-semibold text-on-surface hover:text-primary transition-colors"
        >
          {isAuthenticated ? t.landing.nav.dashboard : t.landing.nav.signIn}
        </Link>
      </div>
    </header>
  )
}

export function LandingExperience() {
  const { t } = useLocale()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  const prefersReducedMotion = useReducedMotion()
  const webglSupported = useWebGLSupport()
  const isMobile = useIsMobile()

  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const tables = useMemo(() => (isMobile ? MOBILE_TABLES : DESKTOP_TABLES), [isMobile])
  const outerRefs = useMemo(() => tables.map(() => createRef<Group | null>()), [tables])
  const innerRefs = useMemo(() => tables.map(() => createRef<Group | null>()), [tables])

  const [sceneActive, setSceneActive] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState(DEFAULT_SELECTED_TABLE_ID)

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ??
    tables.find((table) => table.id === DEFAULT_SELECTED_TABLE_ID) ??
    tables[0]

  const cameraKeyframes = useMemo(
    () => (selectedTable ? buildCameraKeyframes(selectedTable) : buildCameraKeyframes(tables[0]!)),
    [selectedTable, tables],
  )

  const cameraTargetRef = useRef<CameraTarget>({
    x: cameraKeyframes[0]!.position.x,
    y: cameraKeyframes[0]!.position.y,
    z: cameraKeyframes[0]!.position.z,
    lx: cameraKeyframes[0]!.lookAt.x,
    ly: cameraKeyframes[0]!.lookAt.y,
    lz: cameraKeyframes[0]!.lookAt.z,
  })
  const storyProgressRef = useRef({ value: 0 })

  const intensity = prefersReducedMotion ? 0 : isMobile ? 0.6 : 1

  const selectedCopy = {
    labelText: t.landing.selectedTable.replace(
      '{number}',
      selectedTable?.tableNumber ?? DEFAULT_SELECTED_TABLE_ID,
    ),
    capacityLabel: t.landing.seatsFor.replace(
      '{count}',
      String(selectedTable?.capacity ?? 0),
    ),
    statusLabel: selectedTable
      ? t.status[selectedTable.status]
      : t.status.Available,
  }

  useGSAP(
    () => {
      if (prefersReducedMotion) {
        setSceneActive(true)
        return
      }
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-entrance="nav"]', { opacity: 0, y: -16, duration: 0.5 })
        .from('[data-entrance="eyebrow"]', { opacity: 0, y: 16, duration: 0.5 }, '-=0.2')
        .from('[data-entrance="title"]', { opacity: 0, y: 24, duration: 0.7 }, '-=0.3')
        .from('[data-entrance="subtitle"]', { opacity: 0, y: 16, duration: 0.5 }, '-=0.45')
        .from('[data-entrance="cta"]', { opacity: 0, y: 12, duration: 0.4 }, '-=0.3')
        .call(() => setSceneActive(true), undefined, '-=0.2')
    },
    { scope: heroRef, dependencies: [prefersReducedMotion] },
  )

  useScrollTimeline(
    pageRef,
    { tables, cameraKeyframes, outerRefs, cameraTargetRef, storyProgressRef },
    { enabled: !prefersReducedMotion && webglSupported },
  )

  const goToPrimaryCta = () => {
    navigate(isAuthenticated ? '/app' : '/login')
  }

  return (
    <div ref={pageRef} className="relative">
      <div className="fixed inset-0 -z-10">
        {webglSupported ? (
          <Scene
            theme={theme}
            active={sceneActive}
            intensity={intensity}
            isMobile={isMobile}
            tables={tables}
            outerRefs={outerRefs}
            innerRefs={innerRefs}
            cameraTargetRef={cameraTargetRef}
            storyProgressRef={storyProgressRef}
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
            selectedCopy={selectedCopy}
          />
        ) : (
          <Fallback3D reducedMotion={prefersReducedMotion} />
        )}
      </div>

      <div ref={heroRef} className="relative z-10">
        <Nav />
        <Hero
          onPrimaryCta={goToPrimaryCta}
          primaryCtaLabel={t.landing.hero.primaryCta}
          secondaryCtaHref="/login"
          secondaryCtaLabel={t.landing.hero.secondaryCta}
        />
      </div>

      <ReceptionCaption />
      <HallCaption />
      <FloorplanCaption />
      <ReserveIntroCaption />
      <CtaSection onPrimaryCta={goToPrimaryCta} selectedCopy={selectedCopy} />
      <Footer />
    </div>
  )
}
