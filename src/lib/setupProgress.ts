/** One step of the new-restaurant setup guide (owner sheet: "onboarding wizard"). */
export const SETUP_STEPS = [
  'profile',
  'cuisine',
  'branch',
  'hours',
  'venue',
  'tables',
  'menu',
  'photos',
  'team',
] as const
export type SetupStepKey = (typeof SETUP_STEPS)[number]

/** Where each step is done in the dashboard. */
export const SETUP_STEP_LINKS: Record<SetupStepKey, string> = {
  profile: '/app/settings',
  cuisine: '/app/settings',
  branch: '/app/branches',
  hours: '/app/branches',
  venue: '/app/branches',
  tables: '/app/floor-plan',
  menu: '/app/menu',
  photos: '/app/gallery',
  team: '/app/staff',
}

export interface SetupFacts {
  hasArabicName: boolean
  hasEnglishName: boolean
  hasDescription: boolean
  hasCuisine: boolean
  branchCount: number
  hasHours: boolean
  hasVenueType: boolean
  tableCount: number
  menuCount: number
  hasPhotos: boolean
  employeeCount: number
}

export interface SetupProgress {
  done: Record<SetupStepKey, boolean>
  completed: number
  total: number
  /** 0-100, rounded. */
  percent: number
  /** First step not done yet, in guide order; null when everything is done. */
  next: SetupStepKey | null
}

export function computeSetupProgress(facts: SetupFacts): SetupProgress {
  const done: Record<SetupStepKey, boolean> = {
    profile: facts.hasArabicName && facts.hasEnglishName && facts.hasDescription,
    cuisine: facts.hasCuisine,
    branch: facts.branchCount > 0,
    hours: facts.hasHours,
    venue: facts.hasVenueType,
    tables: facts.tableCount > 0,
    menu: facts.menuCount > 0,
    photos: facts.hasPhotos,
    team: facts.employeeCount > 0,
  }
  const completed = SETUP_STEPS.filter((step) => done[step]).length
  return {
    done,
    completed,
    total: SETUP_STEPS.length,
    percent: Math.round((completed / SETUP_STEPS.length) * 100),
    next: SETUP_STEPS.find((step) => !done[step]) ?? null,
  }
}
