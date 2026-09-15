import type { ChallengeDoc, ChallengeKind } from '../../types/village';
import { addDays } from '../../utils/clock';

export interface ChallengeEvent {
  kind: ChallengeKind;
  value: number;
  absolute?: boolean;
}

export function applyEvent(
  challenge: ChallengeDoc,
  event: ChallengeEvent,
  date: string
): { challenge: ChallengeDoc; justCompleted: boolean } {
  if (challenge.kind !== event.kind) return { challenge, justCompleted: false };
  if (challenge.completedAt) return { challenge, justCompleted: false };
  if (challenge.status !== 'active') return { challenge, justCompleted: false };
  const next = event.absolute ? event.value : challenge.progress + event.value;
  const progress = Math.max(0, Math.min(challenge.target, Math.floor(next)));
  const justCompleted = progress >= challenge.target && !challenge.completedAt;
  return {
    challenge: {
      ...challenge,
      progress,
      completedAt: justCompleted ? date : challenge.completedAt,
      updatedAt: date,
    },
    justCompleted,
  };
}

export type ChallengeState = 'active' | 'done' | 'expired' | 'upcoming';

export function challengeState(
  challenge: Pick<ChallengeDoc, 'startsOn' | 'endsOn' | 'completedAt' | 'status'>,
  today: string
): ChallengeState {
  if (challenge.completedAt) return 'done';
  if (challenge.status === 'proposed' || challenge.status === 'rejected') return 'upcoming';
  if (today < challenge.startsOn) return 'upcoming';
  if (today > challenge.endsOn) return 'expired';
  return 'active';
}

export function extendForPunishment<T extends Pick<ChallengeDoc, 'endsOn' | 'extendedDays' | 'completedAt' | 'status'>>(
  challenges: T[],
  days: number
): T[] {
  const n = Math.max(0, Math.floor(days));
  if (n === 0) return challenges;
  return challenges.map((c) => {
    if (c.completedAt || c.status !== 'active') return c;
    return { ...c, endsOn: addDays(c.endsOn, n), extendedDays: (c.extendedDays || 0) + n };
  });
}
