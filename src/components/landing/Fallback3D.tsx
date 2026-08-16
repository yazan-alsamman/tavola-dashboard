import { cn } from '@/lib/utils'

interface Fallback3DProps {
  reducedMotion: boolean
}

/** Static backdrop shown when WebGL is unavailable. The page stays fully readable without it. */
export function Fallback3D({ reducedMotion }: Fallback3DProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-mauve-gradient" aria-hidden="true">
      <div
        className={cn(
          'absolute -top-24 -start-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl',
          !reducedMotion && 'animate-[landing-float-a_18s_ease-in-out_infinite]',
        )}
      />
      <div
        className={cn(
          'absolute bottom-0 end-0 h-[28rem] w-[28rem] rounded-full bg-tertiary/20 blur-3xl',
          !reducedMotion && 'animate-[landing-float-b_24s_ease-in-out_infinite]',
        )}
      />
    </div>
  )
}
