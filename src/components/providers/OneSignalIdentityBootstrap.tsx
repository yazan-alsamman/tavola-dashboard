import { useOneSignalIdentityBootstrap } from '@/hooks/useOneSignalIdentityBootstrap'

/** Mounts optional OneSignal identity fetch when env is configured. */
export function OneSignalIdentityBootstrap(): null {
  useOneSignalIdentityBootstrap()
  return null
}
