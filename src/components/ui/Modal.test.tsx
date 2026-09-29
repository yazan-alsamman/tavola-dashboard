/** @vitest-environment happy-dom */
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'
import { LocaleProvider } from '@/context/LocaleContext'

afterEach(() => {
  cleanup()
})

function TypingDialog() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [open, setOpen] = useState(true)
  return (
    <LocaleProvider>
    <Modal open={open} onClose={() => setOpen(false)} title="Branch">
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        City
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
    </Modal>
    </LocaleProvider>
  )
}

describe('Modal text fields', () => {
  it('keeps the caret in the field being typed', () => {
    render(<TypingDialog />)
    const city = screen.getByRole('textbox', { name: 'City' })
    city.focus()

    fireEvent.change(city, { target: { value: 'D' } })
    expect((city as HTMLInputElement).value).toBe('D')
    expect(document.activeElement).toBe(city)

    fireEvent.change(city, { target: { value: 'Damascus' } })
    expect((city as HTMLInputElement).value).toBe('Damascus')
    expect(document.activeElement).toBe(city)
  })

  it('closes on Escape with the latest onClose', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <LocaleProvider>
      <Modal open onClose={onClose} title="Branch">
        <input aria-label="Name" />
      </Modal>
      </LocaleProvider>,
    )
    const nextClose = vi.fn()
    rerender(
      <LocaleProvider>
      <Modal open onClose={nextClose} title="Branch">
        <input aria-label="Name" />
      </Modal>
      </LocaleProvider>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(nextClose).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })
})
