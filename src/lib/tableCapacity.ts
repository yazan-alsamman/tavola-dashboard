import type { TableDto } from '@/api/tables'

/**
 * Seats a table really offers. A merge group's primary table stands for the
 * whole group, so it shows the SUM of every member's capacity (the backend's
 * `effectiveCapacity`, ADR-026); each table's own `capacity` column is never
 * changed by a merge. Every other table shows its own capacity.
 */
export function effectiveCapacity(table: TableDto, tables: readonly TableDto[]): number {
  if (!table.mergeGroupId || !table.isMergePrimary) return table.capacity
  return tables
    .filter((other) => other.mergeGroupId === table.mergeGroupId)
    .reduce((sum, member) => sum + member.capacity, 0)
}
