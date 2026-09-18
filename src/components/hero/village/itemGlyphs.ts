export type PickaxeTier = 'wood' | 'stone' | 'iron' | 'gold' | 'diamond';
export type HatStyle = 'cap' | 'iron' | 'crown';
export type BootTier = 'leather' | 'iron';
export type GlyphType = 'shirt' | 'pants' | 'cape' | 'scarf' | 'pickaxe' | 'boots' | 'hat' | 'lamp';

export function pickaxeTierOf(id: string): PickaxeTier {
  if (id.includes('diamond')) return 'diamond';
  if (id.includes('gold') || id.includes('ouro')) return 'gold';
  if (id.includes('iron') || id.includes('ferro')) return 'iron';
  if (id.includes('stone') || id.includes('pedra')) return 'stone';
  return 'wood';
}

export function hatStyleOf(id: string): HatStyle {
  if (id.includes('crown') || id === 'milestone_30' || id === 'milestone_40') return 'crown';
  if (id === 'hat_cap') return 'cap';
  return 'iron';
}

export function pickaxeTierFromLevel(level: number): PickaxeTier {
  if (level >= 4) return 'diamond';
  if (level >= 3) return 'gold';
  if (level >= 2) return 'iron';
  if (level >= 1) return 'stone';
  return 'wood';
}
