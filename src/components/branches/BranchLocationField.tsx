import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'

/** Damascus, the collection's sample pin. View only — never saved on its own. */
const DEFAULT_CENTER: L.LatLngExpression = [33.5138, 36.2765]

const pinIcon = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<span class="block h-4 w-4 rounded-full bg-primary ring-2 ring-surface-container-lowest shadow-sm"></span>',
})

function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

export function BranchLocationField({
  latitude,
  longitude,
  disabled,
  onChange,
}: {
  latitude: number | null
  longitude: number | null
  disabled?: boolean
  onChange: (latitude: number | null, longitude: number | null) => void
}) {
  const { t } = useLocale()
  const copy = t.branches.location
  const [locationError, setLocationError] = useState<string | null>(null)
  const mapNode = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const initialLatitude = useRef(latitude)
  const initialLongitude = useRef(longitude)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  onChangeRef.current = onChange
  disabledRef.current = disabled

  useEffect(() => {
    const node = mapNode.current
    if (!node || mapRef.current) return
    const startLat = initialLatitude.current
    const startLng = initialLongitude.current
    const hasPin = startLat != null && startLng != null
    const map = L.map(node, {
      center: hasPin ? [startLat, startLng] : DEFAULT_CENTER,
      zoom: hasPin ? 16 : 12,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    map.on('click', (event) => {
      if (disabledRef.current) return
      onChangeRef.current(roundCoord(event.latlng.lat), roundCoord(event.latlng.lng))
    })
    mapRef.current = map
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    const later = window.setTimeout(() => map.invalidateSize(), 200)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (latitude == null || longitude == null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    const point: L.LatLngExpression = [latitude, longitude]
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { icon: pinIcon, keyboard: false }).addTo(map)
    } else {
      markerRef.current.setLatLng(point)
    }
    map.panTo(point)
  }, [latitude, longitude])

  const setFromInput = (nextLat: number | null, nextLng: number | null) => {
    onChange(nextLat, nextLng)
  }

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(copy.unsupported)
      return
    }
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          roundCoord(position.coords.latitude),
          roundCoord(position.coords.longitude),
        )
      },
      () => setLocationError(copy.denied),
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-on-surface">{copy.title}</p>
        <p className="text-body-sm text-on-surface-variant mt-1">{copy.hint}</p>
      </div>
      <div
        dir="ltr"
        className="isolate h-64 overflow-hidden rounded-xl border border-outline-variant/40 [&_.leaflet-control-attribution]:text-[10px]"
      >
        <div ref={mapNode} className="h-full w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CoordField
          label={copy.latitude}
          value={latitude}
          disabled={disabled}
          onChange={(value) => setFromInput(value, longitude)}
        />
        <CoordField
          label={copy.longitude}
          value={longitude}
          disabled={disabled}
          onChange={(value) => setFromInput(latitude, value)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={useDeviceLocation}
      >
        {copy.useDevice}
      </Button>
      {locationError && (
        <p className="text-label-sm text-error" role="alert">
          {locationError}
        </p>
      )}
    </div>
  )
}

function CoordField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number | null
  disabled?: boolean
  onChange: (value: number | null) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
        {label}
      </label>
      <Input
        type="number"
        step="any"
        inputMode="decimal"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value.trim()
          if (!raw) {
            onChange(null)
            return
          }
          const parsed = Number(raw)
          onChange(Number.isFinite(parsed) ? parsed : null)
        }}
      />
    </div>
  )
}
