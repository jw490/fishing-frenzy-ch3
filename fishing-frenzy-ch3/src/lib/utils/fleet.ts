export interface ShipTier {
  name: string;
  minReferrals: number;
  emoji: string;
  size: "sm" | "md" | "lg" | "xl";
}

export const SHIP_TIERS: ShipTier[] = [
  { name: "Dinghy", minReferrals: 0, emoji: "🚣", size: "sm" },
  { name: "Sailboat", minReferrals: 1, emoji: "⛵", size: "md" },
  { name: "Trawler", minReferrals: 3, emoji: "🚤", size: "lg" },
  { name: "Galleon", minReferrals: 5, emoji: "⛵", size: "lg" },
  { name: "Golden Flagship", minReferrals: 10, emoji: "🚢", size: "xl" },
];

export const REFERRAL_REWARDS = [
  { count: 1, reward: "Sail color customization", unlocked: false },
  { count: 3, reward: "Flagship upgrade to Trawler", unlocked: false },
  { count: 5, reward: "Exclusive pet on your boat", unlocked: false },
  { count: 10, reward: "Golden Flagship + launch-day rewards", unlocked: false },
];

export function getFlagshipTier(referralCount: number): ShipTier {
  let tier = SHIP_TIERS[0];
  for (const t of SHIP_TIERS) {
    if (referralCount >= t.minReferrals) {
      tier = t;
    }
  }
  return tier;
}

export function calculateFleetPower(
  memberCount: number,
  referralCount: number
): number {
  return memberCount * 100 + referralCount * 25;
}

export function getMemberShipEmoji(index: number): string {
  const ships = ["🚣", "⛵", "🚤", "⛵", "🚤", "⛵", "🚢"];
  return ships[index % ships.length];
}

export const GUILD_LOGOS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  emoji: [
    "🐟", "🦈", "🐙", "🦑", "🐬", "🐳", "🦀", "🦞", "🐠", "🐡",
    "🦭", "🐢", "🦐", "🪼", "🐚", "🦩", "⚓", "🔱", "🧜", "🏴‍☠️",
  ][i],
  name: [
    "Fish", "Shark", "Octopus", "Squid", "Dolphin", "Whale", "Crab", "Lobster", "Tropical", "Puffer",
    "Seal", "Turtle", "Shrimp", "Jellyfish", "Shell", "Flamingo", "Anchor", "Trident", "Mermaid", "Pirate",
  ][i],
}));
