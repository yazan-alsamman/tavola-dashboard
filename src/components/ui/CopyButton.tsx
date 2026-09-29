import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { useToast } from '@/context/ToastContext'

export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string
  label: string
  copiedLabel: string
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast('success', copiedLabel)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('error', label)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? copiedLabel : label}
      onClick={() => {
        void copy()
      }}
    >
      <MaterialIcon name={copied ? 'check' : 'content_copy'} size={16} />
    </Button>
  )
}
