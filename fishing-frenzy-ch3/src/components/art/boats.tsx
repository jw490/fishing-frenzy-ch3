/** Hand-drawn cartoon-style boat SVGs matching Fishing Frenzy art direction */

interface BoatProps {
  className?: string;
  size?: number;
  color?: string;
}

export function Dinghy({ className = "", size = 48, color = "#8B5E3C" }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Hull */}
      <path d="M12 40 C12 40 16 52 32 52 C48 52 52 40 52 40 L48 38 C48 38 44 46 32 46 C20 46 16 38 16 38 Z" fill={color} stroke="#5C3A1E" strokeWidth="1.5" />
      {/* Hull shine */}
      <path d="M18 42 C18 42 22 48 32 48 C42 48 46 42 46 42" stroke="#A0714F" strokeWidth="1" opacity="0.5" />
      {/* Seat */}
      <rect x="24" y="38" width="16" height="3" rx="1" fill="#A0714F" stroke="#5C3A1E" strokeWidth="0.8" />
      {/* Oar left */}
      <line x1="18" y1="34" x2="8" y2="44" stroke="#A0714F" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="7" cy="45" rx="3" ry="1.5" fill="#C4956A" stroke="#5C3A1E" strokeWidth="0.8" transform="rotate(-40 7 45)" />
      {/* Oar right */}
      <line x1="46" y1="34" x2="56" y2="44" stroke="#A0714F" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="57" cy="45" rx="3" ry="1.5" fill="#C4956A" stroke="#5C3A1E" strokeWidth="0.8" transform="rotate(40 57 45)" />
      {/* Water splash */}
      <path d="M10 50 Q14 48 12 52" stroke="#7EC8E3" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M52 50 Q56 48 54 52" stroke="#7EC8E3" strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}

export function Sailboat({ className = "", size = 64, color = "#C4956A" }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      {/* Hull */}
      <path d="M14 54 C14 54 20 66 40 66 C60 66 66 54 66 54 L62 50 C62 50 56 60 40 60 C24 60 18 50 18 50 Z" fill={color} stroke="#5C3A1E" strokeWidth="1.5" />
      <path d="M20 56 C20 56 26 62 40 62 C54 62 60 56 60 56" stroke="#D4A574" strokeWidth="1" opacity="0.5" />
      {/* Mast */}
      <line x1="40" y1="18" x2="40" y2="54" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sail */}
      <path d="M40 18 L40 48 L20 48 Z" fill="#F5F0E8" stroke="#D4C4A8" strokeWidth="1" />
      <path d="M40 18 L40 48 L58 48 Z" fill="#FFE8CC" stroke="#D4C4A8" strokeWidth="1" />
      {/* Sail stripes */}
      <path d="M40 28 L28 48" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.6" />
      <path d="M40 28 L50 48" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.6" />
      {/* Flag */}
      <path d="M40 18 L40 12 L48 15 L40 18 Z" fill="#FF6B6B" stroke="#CC4444" strokeWidth="0.8" />
      {/* Porthole */}
      <circle cx="34" cy="54" r="2" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
      <circle cx="46" cy="54" r="2" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
    </svg>
  );
}

export function Trawler({ className = "", size = 72, color = "#6B8E5A" }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 80" fill="none" className={className}>
      {/* Hull */}
      <path d="M12 52 C12 52 20 68 48 68 C76 68 84 52 84 52 L78 48 C78 48 72 60 48 60 C24 60 18 48 18 48 Z" fill={color} stroke="#3D5A2E" strokeWidth="1.5" />
      <path d="M20 54 C20 54 28 62 48 62 C68 62 76 54 76 54" stroke="#8AAF74" strokeWidth="1" opacity="0.4" />
      {/* Cabin */}
      <rect x="34" y="36" width="28" height="16" rx="3" fill="#C4956A" stroke="#8B5E3C" strokeWidth="1.5" />
      <rect x="36" y="38" width="8" height="6" rx="1" fill="#7EC8E3" stroke="#5C8BA8" strokeWidth="0.8" />
      <rect x="48" y="38" width="8" height="6" rx="1" fill="#7EC8E3" stroke="#5C8BA8" strokeWidth="0.8" />
      {/* Chimney */}
      <rect x="56" y="28" width="4" height="10" rx="1" fill="#666" stroke="#444" strokeWidth="0.8" />
      <ellipse cx="58" cy="26" rx="4" ry="2" fill="#ccc" opacity="0.4" />
      {/* Mast + net crane */}
      <line x1="30" y1="20" x2="30" y2="52" stroke="#8B5E3C" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="20" x2="16" y2="40" stroke="#A0714F" strokeWidth="1.5" />
      {/* Net */}
      <path d="M16 40 L12 52 L24 52 L20 44 L16 40" stroke="#D4C4A8" strokeWidth="1" fill="#D4C4A8" fillOpacity="0.2" />
      <line x1="14" y1="46" x2="22" y2="46" stroke="#D4C4A8" strokeWidth="0.5" />
      <line x1="13" y1="49" x2="23" y2="49" stroke="#D4C4A8" strokeWidth="0.5" />
      {/* Flag */}
      <path d="M30 20 L30 14 L38 17 L30 20 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" />
    </svg>
  );
}

export function Galleon({ className = "", size = 80, color = "#8B5E3C" }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 90" fill="none" className={className}>
      {/* Hull */}
      <path d="M10 58 C10 58 22 76 50 76 C78 76 90 58 90 58 L84 54 C84 54 74 66 50 66 C26 66 16 54 16 54 Z" fill={color} stroke="#5C3A1E" strokeWidth="1.5" />
      <path d="M18 60 C18 60 28 68 50 68 C72 68 82 60 82 60" stroke="#A0714F" strokeWidth="1" opacity="0.4" />
      {/* Deck */}
      <rect x="22" y="48" width="56" height="10" rx="2" fill="#C4956A" stroke="#8B5E3C" strokeWidth="1" />
      {/* Cabin */}
      <rect x="54" y="36" width="20" height="14" rx="2" fill="#A0714F" stroke="#8B5E3C" strokeWidth="1.5" />
      <rect x="56" y="38" width="6" height="5" rx="1" fill="#7EC8E3" stroke="#5C8BA8" strokeWidth="0.8" />
      <rect x="64" y="38" width="6" height="5" rx="1" fill="#7EC8E3" stroke="#5C8BA8" strokeWidth="0.8" />
      {/* Main mast */}
      <line x1="40" y1="12" x2="40" y2="50" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
      {/* Main sail */}
      <path d="M24 18 L56 18 L54 44 L26 44 Z" fill="#F5F0E8" stroke="#D4C4A8" strokeWidth="1" />
      <path d="M26 28 L54 28" stroke="#FF6B6B" strokeWidth="2" opacity="0.5" />
      <path d="M26 36 L54 36" stroke="#FF6B6B" strokeWidth="2" opacity="0.5" />
      {/* Crow's nest */}
      <rect x="35" y="10" width="10" height="4" rx="1" fill="#A0714F" stroke="#8B5E3C" strokeWidth="0.8" />
      {/* Flag */}
      <path d="M40 12 L40 4 L50 8 L40 12 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" />
      {/* Bow ornament */}
      <path d="M10 58 C6 56 4 52 8 50 L14 54" fill="#FFD700" stroke="#C5A200" strokeWidth="1" />
      {/* Portholes */}
      <circle cx="30" cy="56" r="2.5" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
      <circle cx="40" cy="56" r="2.5" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
      <circle cx="50" cy="56" r="2.5" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
      <circle cx="60" cy="56" r="2.5" fill="#7EC8E3" stroke="#5C3A1E" strokeWidth="0.8" />
    </svg>
  );
}

export function GoldenFlagship({ className = "", size = 96, color = "#C5A200" }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 100" fill="none" className={className}>
      {/* Golden glow */}
      <ellipse cx="60" cy="70" rx="55" ry="20" fill="#FFD700" opacity="0.08" />
      {/* Hull */}
      <path d="M10 64 C10 64 24 84 60 84 C96 84 110 64 110 64 L104 58 C104 58 92 72 60 72 C28 72 16 58 16 58 Z" fill={color} stroke="#8B6914" strokeWidth="2" />
      <path d="M18 66 C18 66 30 74 60 74 C90 74 102 66 102 66" stroke="#E8C840" strokeWidth="1.5" opacity="0.5" />
      {/* Gold trim */}
      <path d="M16 58 L104 58" stroke="#FFD700" strokeWidth="2" />
      {/* Deck */}
      <rect x="24" y="50" width="72" height="10" rx="2" fill="#D4A050" stroke="#8B6914" strokeWidth="1" />
      {/* Rear cabin */}
      <rect x="68" y="32" width="26" height="20" rx="3" fill="#C4956A" stroke="#8B5E3C" strokeWidth="1.5" />
      <rect x="70" y="34" width="8" height="6" rx="1" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" opacity="0.6" />
      <rect x="82" y="34" width="8" height="6" rx="1" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" opacity="0.6" />
      {/* Main mast */}
      <line x1="50" y1="8" x2="50" y2="52" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
      {/* Fore mast */}
      <line x1="30" y1="18" x2="30" y2="52" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
      {/* Main sail */}
      <path d="M34 14 L66 14 L64 42 L36 42 Z" fill="#F5F0E8" stroke="#D4C4A8" strokeWidth="1" />
      <path d="M36 24 L64 24" stroke="#FFD700" strokeWidth="2.5" opacity="0.7" />
      <path d="M36 33 L64 33" stroke="#FFD700" strokeWidth="2.5" opacity="0.7" />
      {/* Fore sail */}
      <path d="M20 22 L30 22 L30 42 L22 42 Z" fill="#FFE8CC" stroke="#D4C4A8" strokeWidth="1" />
      {/* Crown on main mast */}
      <path d="M44 6 L46 2 L48 5 L50 0 L52 5 L54 2 L56 6 L56 10 L44 10 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" />
      {/* Flag */}
      <path d="M30 18 L30 12 L22 15 L30 18 Z" fill="#FF6B6B" stroke="#CC4444" strokeWidth="0.8" />
      {/* Bow figurehead */}
      <path d="M10 64 C4 60 2 54 6 50 C8 48 12 50 14 54 L16 58" fill="#FFD700" stroke="#C5A200" strokeWidth="1.2" />
      {/* Portholes with gold trim */}
      <circle cx="32" cy="60" r="3" fill="#7EC8E3" stroke="#FFD700" strokeWidth="1.2" />
      <circle cx="44" cy="60" r="3" fill="#7EC8E3" stroke="#FFD700" strokeWidth="1.2" />
      <circle cx="56" cy="60" r="3" fill="#7EC8E3" stroke="#FFD700" strokeWidth="1.2" />
      <circle cx="68" cy="60" r="3" fill="#7EC8E3" stroke="#FFD700" strokeWidth="1.2" />
      <circle cx="80" cy="60" r="3" fill="#7EC8E3" stroke="#FFD700" strokeWidth="1.2" />
      {/* Sparkles */}
      <circle cx="20" cy="50" r="1" fill="#FFD700" opacity="0.8" />
      <circle cx="100" cy="54" r="1.2" fill="#FFD700" opacity="0.6" />
      <circle cx="60" cy="46" r="0.8" fill="#FFD700" opacity="0.7" />
    </svg>
  );
}

/** Returns the appropriate boat component for a ship tier */
export function getBoatComponent(tier: string) {
  switch (tier) {
    case "Dinghy": return Dinghy;
    case "Sailboat": return Sailboat;
    case "Trawler": return Trawler;
    case "Galleon": return Galleon;
    case "Golden Flagship": return GoldenFlagship;
    default: return Dinghy;
  }
}

/** Simple crew boat for member slots */
export function CrewBoat({ className = "", size = 40, index = 0 }: BoatProps & { index?: number }) {
  const colors = ["#4A90D9", "#E8665A", "#5AB88F", "#D4A050", "#9B6BB0", "#E88C4A"];
  const sailColor = colors[index % colors.length];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 34 C10 34 14 42 24 42 C34 42 38 34 38 34 L36 32 C36 32 32 38 24 38 C16 38 12 32 12 32 Z" fill="#8B5E3C" stroke="#5C3A1E" strokeWidth="1" />
      <line x1="24" y1="14" x2="24" y2="34" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 14 L24 30 L14 30 Z" fill={sailColor} stroke={sailColor} strokeWidth="0.5" opacity="0.85" />
      <path d="M24 14 L24 30 L32 30 Z" fill="#F5F0E8" stroke="#D4C4A8" strokeWidth="0.5" />
      <path d="M24 14 L24 10 L28 12 L24 14 Z" fill={sailColor} />
    </svg>
  );
}

/** Empty slot boat (ghosted) */
export function EmptySlotBoat({ className = "", size = 40 }: BoatProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} style={{ opacity: 0.25 }}>
      <path d="M10 34 C10 34 14 42 24 42 C34 42 38 34 38 34 L36 32 C36 32 32 38 24 38 C16 38 12 32 12 32 Z" fill="#8B5E3C" stroke="#5C3A1E" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="24" y1="18" x2="24" y2="34" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
      <text x="24" y="30" textAnchor="middle" fontSize="10" fill="#A0B4CC">+</text>
    </svg>
  );
}
