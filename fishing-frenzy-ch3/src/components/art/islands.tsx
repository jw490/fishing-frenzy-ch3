/** Cartoon-style island/zone SVG illustrations */

interface IslandProps {
  className?: string;
  size?: number;
}

export function ShallowsIsland({ className = "", size = 80 }: IslandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" fill="none" className={className}>
      {/* Sand base */}
      <ellipse cx="50" cy="62" rx="40" ry="12" fill="#F5D6A0" stroke="#D4B070" strokeWidth="1" />
      {/* Beach with water edge */}
      <path d="M14 62 Q30 54 50 54 Q70 54 86 62" fill="#FFE4B5" />
      {/* Palm tree trunk */}
      <path d="M42 58 Q40 40 44 24" stroke="#8B5E3C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Palm leaves */}
      <path d="M44 24 Q56 18 62 26" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 24 Q34 16 28 22" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 24 Q50 12 48 8" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 24 Q38 10 32 12" stroke="#66BB6A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M44 24 Q54 14 58 16" stroke="#66BB6A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Coconuts */}
      <circle cx="44" cy="26" r="2" fill="#8D6E63" />
      <circle cx="42" cy="24" r="1.8" fill="#A1887F" />
      {/* Beach umbrella */}
      <line x1="62" y1="36" x2="62" y2="58" stroke="#8B5E3C" strokeWidth="1.5" />
      <path d="M52 36 Q62 28 72 36 Z" fill="#FF6B6B" stroke="#CC4444" strokeWidth="0.8" />
      <path d="M57 36 Q62 30 67 36" fill="#FFD700" />
      {/* Starfish */}
      <path d="M72 60 L74 56 L76 60 L72 62 L70 58 Z" fill="#FF8A80" stroke="#E57373" strokeWidth="0.5" />
      {/* Shells */}
      <ellipse cx="35" cy="64" rx="2.5" ry="1.5" fill="#FFCCBC" stroke="#BCAAA4" strokeWidth="0.5" />
    </svg>
  );
}

export function CoralReefIsland({ className = "", size = 80 }: IslandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" fill="none" className={className}>
      {/* Underwater rock base */}
      <ellipse cx="50" cy="58" rx="38" ry="14" fill="#5C8BA8" stroke="#3D6B88" strokeWidth="1" />
      <ellipse cx="50" cy="58" rx="30" ry="10" fill="#7EC8E3" opacity="0.3" />
      {/* Coral branches */}
      <path d="M30 58 Q28 44 24 38 Q22 34 26 32 Q30 34 28 38" stroke="#FF6B6B" strokeWidth="3" fill="#FF8A80" strokeLinecap="round" />
      <path d="M30 58 Q32 46 30 40 Q28 36 32 34" stroke="#FF6B6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Fan coral */}
      <path d="M55 58 Q55 42 50 34 Q48 30 55 28 Q62 30 60 34 Q55 42 55 58" fill="#FF80AB" stroke="#F06292" strokeWidth="1" />
      <line x1="55" y1="34" x2="55" y2="52" stroke="#F06292" strokeWidth="0.5" />
      <line x1="52" y1="38" x2="58" y2="38" stroke="#F06292" strokeWidth="0.5" />
      <line x1="51" y1="44" x2="59" y2="44" stroke="#F06292" strokeWidth="0.5" />
      {/* Brain coral */}
      <ellipse cx="70" cy="52" rx="10" ry="8" fill="#FFB74D" stroke="#F57C00" strokeWidth="1" />
      <path d="M62 52 Q66 48 70 52 Q74 48 78 52" stroke="#F57C00" strokeWidth="0.8" fill="none" />
      <path d="M64 50 Q68 54 72 50 Q76 54 78 50" stroke="#F57C00" strokeWidth="0.6" fill="none" />
      {/* Sea anemone */}
      <ellipse cx="40" cy="56" rx="6" ry="4" fill="#CE93D8" stroke="#AB47BC" strokeWidth="0.8" />
      <path d="M36 54 Q37 48 38 44" stroke="#CE93D8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 54 Q39 46 40 42" stroke="#E1BEE7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 54 Q41 48 42 44" stroke="#CE93D8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M42 54 Q43 46 44 42" stroke="#E1BEE7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bubbles */}
      <circle cx="48" cy="28" r="2" fill="none" stroke="#B3E5FC" strokeWidth="0.8" opacity="0.6" />
      <circle cx="44" cy="22" r="1.5" fill="none" stroke="#B3E5FC" strokeWidth="0.6" opacity="0.5" />
      <circle cx="52" cy="18" r="1" fill="none" stroke="#B3E5FC" strokeWidth="0.5" opacity="0.4" />
      {/* Fish */}
      <g transform="translate(65, 36) scale(0.8)">
        <path d="M0 6 Q6 0 12 6 Q6 12 0 6 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" />
        <path d="M-4 6 L0 3 L0 9 Z" fill="#FFC107" />
        <circle cx="9" cy="5" r="1" fill="#333" />
      </g>
    </svg>
  );
}

export function DeepTrenchIsland({ className = "", size = 80 }: IslandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" fill="none" className={className}>
      {/* Dark water vortex */}
      <ellipse cx="50" cy="50" rx="36" ry="20" fill="#1A3A5C" stroke="#0D2240" strokeWidth="1" />
      <ellipse cx="50" cy="50" rx="28" ry="14" fill="#14375E" opacity="0.8" />
      <ellipse cx="50" cy="50" rx="18" ry="8" fill="#0D2240" opacity="0.6" />
      {/* Whirlpool lines */}
      <path d="M22 44 Q36 36 50 42 Q64 48 78 40" stroke="#2B7CB8" strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M26 50 Q38 44 50 48 Q62 52 74 46" stroke="#2B7CB8" strokeWidth="0.8" fill="none" opacity="0.3" />
      {/* Rocky outcrop */}
      <path d="M30 46 L34 28 L40 32 L44 20 L50 26 L54 16 L58 24 L62 22 L66 34 L70 46" fill="#546E7A" stroke="#37474F" strokeWidth="1.5" />
      <path d="M34 28 L40 32 L44 20" fill="#607D8B" />
      {/* Glowing crystals */}
      <path d="M44 32 L46 22 L48 32 Z" fill="#4FC3F7" stroke="#29B6F6" strokeWidth="0.5" opacity="0.9" />
      <path d="M52 28 L54 20 L56 28 Z" fill="#4FC3F7" stroke="#29B6F6" strokeWidth="0.5" opacity="0.7" />
      <path d="M48 36 L49 30 L50 36 Z" fill="#81D4FA" stroke="#29B6F6" strokeWidth="0.5" opacity="0.6" />
      {/* Crystal glow */}
      <circle cx="47" cy="26" r="4" fill="#4FC3F7" opacity="0.15" />
      <circle cx="54" cy="24" r="3" fill="#4FC3F7" opacity="0.1" />
      {/* Anglerfish glow */}
      <circle cx="38" cy="56" r="2" fill="#FFEB3B" opacity="0.4" />
      <circle cx="38" cy="56" r="1" fill="#FFF9C4" opacity="0.8" />
      {/* Deep sea creature eye */}
      <circle cx="64" cy="54" r="2.5" fill="#F44336" opacity="0.3" />
      <circle cx="64" cy="54" r="1.2" fill="#FF5252" opacity="0.5" />
    </svg>
  );
}

export function SunkenCityIsland({ className = "", size = 80 }: IslandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" fill="none" className={className}>
      {/* Base */}
      <ellipse cx="50" cy="62" rx="40" ry="12" fill="#5C8BA8" stroke="#3D6B88" strokeWidth="1" />
      {/* Ruined columns */}
      <rect x="24" y="30" width="6" height="32" rx="1" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="24" y="26" width="10" height="4" rx="1" fill="#B0BEC5" stroke="#607D8B" strokeWidth="0.8" />
      <rect x="38" y="22" width="6" height="40" rx="1" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <rect x="36" y="18" width="10" height="4" rx="1" fill="#B0BEC5" stroke="#607D8B" strokeWidth="0.8" />
      {/* Broken column */}
      <rect x="56" y="36" width="6" height="26" rx="1" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <path d="M56 36 L58 30 L60 34 L62 32 L62 36 Z" fill="#78909C" stroke="#607D8B" strokeWidth="0.8" />
      {/* Archway */}
      <path d="M68 62 L68 32 Q76 22 84 32 L84 62" fill="none" stroke="#90A4AE" strokeWidth="4" />
      <path d="M68 32 Q76 22 84 32" fill="#78909C" stroke="#607D8B" strokeWidth="1.5" />
      {/* Golden artifact */}
      <circle cx="76" cy="48" r="4" fill="#FFD700" stroke="#C5A200" strokeWidth="1" />
      <circle cx="76" cy="48" r="2" fill="#FFF8E1" opacity="0.6" />
      <circle cx="76" cy="48" r="6" fill="#FFD700" opacity="0.1" />
      {/* Seaweed on ruins */}
      <path d="M30 34 Q28 28 32 24" stroke="#4CAF50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M60 38 Q58 32 62 28" stroke="#66BB6A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Mosaic floor hint */}
      <rect x="38" y="58" width="4" height="4" fill="#FFD700" opacity="0.3" />
      <rect x="44" y="58" width="4" height="4" fill="#4FC3F7" opacity="0.3" />
      <rect x="50" y="58" width="4" height="4" fill="#FFD700" opacity="0.3" />
    </svg>
  );
}

export function MysteryIsland({ className = "", size = 80 }: IslandProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 80" fill="none" className={className}>
      {/* Fog swirl */}
      <ellipse cx="50" cy="50" rx="36" ry="20" fill="#1E3A5F" opacity="0.4" />
      {/* Question mark */}
      <text x="50" y="48" textAnchor="middle" fontSize="32" fill="#FFD700" fontFamily="serif" fontWeight="bold" opacity="0.6">?</text>
      {/* Sparkles around */}
      <circle cx="28" cy="34" r="1.5" fill="#FFD700" opacity="0.4" />
      <circle cx="72" cy="30" r="1.5" fill="#FFD700" opacity="0.3" />
      <circle cx="36" cy="56" r="1" fill="#FFD700" opacity="0.5" />
      <circle cx="66" cy="58" r="1.2" fill="#FFD700" opacity="0.35" />
      {/* Fog wisps */}
      <path d="M20 44 Q30 38 40 42 Q50 46 60 40" stroke="white" strokeWidth="1" fill="none" opacity="0.1" />
      <path d="M30 54 Q42 48 54 52 Q66 56 78 50" stroke="white" strokeWidth="0.8" fill="none" opacity="0.08" />
    </svg>
  );
}

export function getIslandComponent(zoneId: number) {
  switch (zoneId) {
    case 1: return ShallowsIsland;
    case 2: return CoralReefIsland;
    case 3: return DeepTrenchIsland;
    case 4: return SunkenCityIsland;
    case 5: return MysteryIsland;
    default: return ShallowsIsland;
  }
}
