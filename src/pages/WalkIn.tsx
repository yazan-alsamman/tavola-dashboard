import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

export function WalkInPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { tables, registerWalkIn, addToWaitlist } = useRestaurant()
  const availableTables = tables.filter((tbl) => tbl.status === 'available')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guestCount, setGuestCount] = useState('2')
  const [tableId, setTableId] = useState('')

  const selectTable = (id: string) => {
    setTableId(id)
  }

  const handleSeat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !tableId) return
    registerWalkIn({ name: name.trim(), phone: phone.trim(), guestCount: parseInt(guestCount, 10), tableId })
    toast('success', t.walkIn.register, `${name} → ${tables.find((t) => t.id === tableId)?.name}`)
    navigate('/floor-plan')
  }

  const handleWaitlist = () => {
    if (!name.trim()) return
    addToWaitlist({ name: name.trim(), phone: phone.trim(), guestCount: parseInt(guestCount, 10) })
    toast('info', t.walkIn.addToWaitlist, name)
    setName('')
    setPhone('')
    navigate('/waitlist')
  }

  return (
    <div>
      <PageHeader title={t.walkIn.title} subtitle={t.walkIn.subtitle} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-2">
          <CardTitle className="mb-6 flex items-center gap-2">
            <MaterialIcon name="person_add" size={20} className="text-primary" />
            {t.walkIn.register}
          </CardTitle>
          <form onSubmit={handleSeat} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">{t.customers.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.customers.name} required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">{t.reservations.phone}</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+963 XXX XXX XXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">{t.reservations.guests}</label>
              <Input value={guestCount} onChange={(e) => setGuestCount(e.target.value)} type="number" min={1} max={20} required />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">{t.reservations.table}</label>
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)} required>
                <option value="">{t.floorPlan.selectTable}</option>
                {availableTables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.name} — {tbl.capacity} seats
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={!tableId}>
                <MaterialIcon name="group" size={16} /> {t.ops.seatGuest}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={handleWaitlist}>
                {t.walkIn.addToWaitlist}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="xl:col-span-3">
          <CardTitle className="mb-4">{t.dashboard.availableTables} ({availableTables.length})</CardTitle>
          <p className="text-sm text-on-surface-variant mb-4">{t.floorPlan.selectTable}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableTables.map((tbl) => (
              <button
                key={tbl.id}
                type="button"
                onClick={() => selectTable(tbl.id)}
                className={cn(
                  'p-4 rounded-xl border-2 text-start transition-all duration-200',
                  tableId === tbl.id
                    ? 'border-primary bg-primary-light shadow-card scale-[1.02]'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40',
                )}
              >
                <p className="font-semibold text-on-surface">{tbl.name}</p>
                <p className="text-xs text-on-surface-variant capitalize mt-1">{tbl.section} · {tbl.capacity} seats</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
