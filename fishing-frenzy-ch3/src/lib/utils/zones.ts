export interface Zone {
  id: number;
  name: string;
  description: string;
  signupsRequired: number;
  reward: string;
  emoji: string;
}

export const ZONES: Zone[] = [
  {
    id: 1,
    name: "The Shallows",
    description: "Calm coastal waters where every voyage begins",
    signupsRequired: 0,
    reward: "Pioneer Badge",
    emoji: "🏖️",
  },
  {
    id: 2,
    name: "The Coral Reef",
    description: "Vibrant underwater gardens teeming with life",
    signupsRequired: 1000,
    reward: "Rare Bait Pack",
    emoji: "🪸",
  },
  {
    id: 3,
    name: "The Deep Trench",
    description: "Dark waters hiding ancient secrets",
    signupsRequired: 5000,
    reward: "Exclusive Boat Skin",
    emoji: "🌊",
  },
  {
    id: 4,
    name: "The Sunken City",
    description: "Ruins of a forgotten civilization beneath the waves",
    signupsRequired: 25000,
    reward: "Legendary Pet + Early Access",
    emoji: "🏛️",
  },
  {
    id: 5,
    name: "???",
    description: "What lies beyond the fog?",
    signupsRequired: 50000,
    reward: "Mystery Reward",
    emoji: "❓",
  },
];

export function getCurrentZone(totalSignups: number): number {
  let currentZone = 1;
  for (const zone of ZONES) {
    if (totalSignups >= zone.signupsRequired) {
      currentZone = zone.id;
    }
  }
  return currentZone;
}

export function getNextZone(totalSignups: number): Zone | null {
  const current = getCurrentZone(totalSignups);
  return ZONES.find((z) => z.id === current + 1) ?? null;
}

export function getProgressToNextZone(totalSignups: number): number {
  const nextZone = getNextZone(totalSignups);
  if (!nextZone) return 100;

  const currentZone = ZONES.find((z) => z.id === nextZone.id - 1)!;
  const range = nextZone.signupsRequired - currentZone.signupsRequired;
  const progress = totalSignups - currentZone.signupsRequired;
  return Math.min(100, Math.round((progress / range) * 100));
}
