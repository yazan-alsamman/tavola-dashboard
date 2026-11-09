/**
 * Short two-note alert played with the Web Audio API (no audio asset to
 * ship). Browsers only allow sound after the user has interacted with the
 * page; before that this silently does nothing.
 */
let context: AudioContext | null = null

export function playChime(): void {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    context ??= new AudioCtor()
    const ctx = context
    if (ctx.state === 'suspended') void ctx.resume()
    const start = ctx.currentTime
    ;[880, 1320].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      const at = start + index * 0.18
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.32)
    })
  } catch {
    // Sound is a courtesy; the on-screen alert still shows.
  }
}
