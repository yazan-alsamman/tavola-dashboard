import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

const DropdownCloseContext = createContext<() => void>(() => undefined)

/** Space kept between the menu and the viewport edge or its trigger. */
const VIEWPORT_MARGIN_PX = 8
const TRIGGER_GAP_PX = 4

/**
 * Where the open menu sits: under the trigger when it fits, above it when the
 * viewport bottom is too close, and always inside the viewport horizontally.
 * `align` is logical: `end` lines the menu up with the trigger's inline end
 * (its right edge in LTR, its left edge in RTL).
 */
function menuPosition(
  trigger: DOMRect,
  menu: { width: number; height: number },
  align: 'start' | 'end',
  rtl: boolean,
): CSSProperties {
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight

  const alignRight = (align === 'end') !== rtl
  const preferredLeft = alignRight ? trigger.right - menu.width : trigger.left
  const maxLeft = viewportWidth - menu.width - VIEWPORT_MARGIN_PX
  const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(preferredLeft, maxLeft))

  const below = trigger.bottom + TRIGGER_GAP_PX
  const above = trigger.top - TRIGGER_GAP_PX - menu.height
  const fitsBelow = below + menu.height <= viewportHeight - VIEWPORT_MARGIN_PX
  const top = fitsBelow || above < VIEWPORT_MARGIN_PX ? below : above

  return { position: 'fixed', top, left }
}

/**
 * Kebab menu. The list is portalled to `document.body` with fixed positioning
 * so a card's `overflow` or stacking context never clips it, and it flips
 * above the trigger near the bottom of the screen.
 */
export function DropdownMenu({
  label,
  children,
  align = 'end',
}: {
  label: string
  children: ReactNode
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(() => setOpen(false), [])

  const place = useCallback(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const rtl = getComputedStyle(trigger).direction === 'rtl'
    setStyle(
      menuPosition(
        trigger.getBoundingClientRect(),
        { width: menu.offsetWidth, height: menu.offsetHeight },
        align,
        rtl,
      ),
    )
  }, [align])

  useLayoutEffect(() => {
    if (!open) {
      setStyle({ position: 'fixed', visibility: 'hidden' })
      return
    }
    place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    // Capture phase: any scrolling ancestor moves the trigger, not only the window.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  return (
    <DropdownCloseContext.Provider value={close}>
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant',
            'hover:bg-surface-container-high hover:text-on-surface',
          )}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          <MaterialIcon name="more_horiz" size={18} />
        </button>
        {open &&
          createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              dir={document.documentElement.dir || undefined}
              style={style}
              // The portal leaves the card's DOM subtree but React still
              // bubbles events through it; keep clicks from reaching the card.
              onClick={(event) => event.stopPropagation()}
              className={cn(
                'z-50 min-w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-outline-variant/60',
                'bg-surface-container-lowest p-1 elev-3',
              )}
            >
              {children}
            </div>,
            document.body,
          )}
      </div>
    </DropdownCloseContext.Provider>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: ReactNode
  onSelect: () => void
  destructive?: boolean
}) {
  const close = useContext(DropdownCloseContext)
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center whitespace-nowrap rounded-lg px-3 py-2 text-start text-label-md',
        destructive
          ? 'text-error hover:bg-error-container'
          : 'text-on-surface hover:bg-surface-container-high',
      )}
      onClick={() => {
        onSelect()
        close()
      }}
    >
      {children}
    </button>
  )
}
