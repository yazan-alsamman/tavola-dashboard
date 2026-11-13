import type { RoleDto } from '@/api/employees'

/** Seeded operational role slugs (backend seed + ADR-053 Front Desk). */
export const KNOWN_ROLE_SLUGS = ['manager', 'receptionist', 'front-desk', 'cashier'] as const
export type KnownRoleSlug = (typeof KNOWN_ROLE_SLUGS)[number]

interface RoleWords {
  names: Record<KnownRoleSlug, string>
  descriptions: Record<KnownRoleSlug, string>
}

function isKnown(slug: string): slug is KnownRoleSlug {
  return (KNOWN_ROLE_SLUGS as readonly string[]).includes(slug)
}

/** The role name in the selected language; a custom role keeps the name the server sends. */
export function roleLabel(role: Pick<RoleDto, 'name' | 'slug'>, words: RoleWords): string {
  return isKnown(role.slug) ? words.names[role.slug] : role.name
}

/** What the role can do, in the selected language; a custom role keeps the server text. */
export function roleDescription(
  role: Pick<RoleDto, 'description' | 'slug'>,
  words: RoleWords,
): string {
  return isKnown(role.slug) ? words.descriptions[role.slug] : role.description
}
