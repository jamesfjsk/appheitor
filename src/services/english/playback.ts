export type PlaybackReason = 'ended' | 'error' | 'stopped' | 'timeout';

/** Só o fim natural conta como tocado. Interrupção e o teto de tempo não. */
export function playbackCounts(reason: PlaybackReason): boolean {
  return reason === 'ended';
}
