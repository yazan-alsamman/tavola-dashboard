import { cn } from '@/lib/utils'

interface DataTableProps {
  children: React.ReactNode
  className?: string
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-outline-variant/20 shadow-sm bg-surface-container-lowest', className)}>
      <table className="w-full text-body-md">{children}</table>
    </div>
  )
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="w-full">
      <tr className="w-full bg-surface-container border-b border-outline-variant/30">
        {children}
      </tr>
    </thead>
  )
}

export function DataTableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-5 py-2.5 text-start text-label-md font-semibold text-on-surface-variant whitespace-nowrap align-middle',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-outline-variant/20">{children}</tbody>
}

export function DataTableRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      className={cn(
        'group transition-colors duration-150 hover:bg-surface-bright',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function DataTableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-5 py-4 text-on-surface whitespace-nowrap', className)}>
      {children}
    </td>
  )
}
