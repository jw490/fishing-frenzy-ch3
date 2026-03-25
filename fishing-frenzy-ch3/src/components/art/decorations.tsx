/** Decorative SVG elements: fish, waves, bubbles, etc. */

interface DecorationProps {
  className?: string;
  size?: number;
}

export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 60" className={`w-full ${className}`} preserveAspectRatio="none" fill="none">
      <path
        d="M0,30 C120,50 240,10 360,30 C480,50 600,10 720,30 C840,50 960,10 1080,30 C1200,50 1320,10 1440,30 L1440,60 L0,60 Z"
        fill="#0B1D3A"
        opacity="0.6"
      />
      <path
        d="M0,40 C160,55 320,25 480,40 C640,55 800,25 960,40 C1120,55 1280,25 1440,40 L1440,60 L0,60 Z"
        fill="#0B1D3A"
        opacity="0.8"
      />
    </svg>
  );
}

export function SmallFish({ className = "", size = 24, color = "#FFD700" }: DecorationProps & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 16" fill="none" className={className}>
      <path d="M4 8 Q10 2 18 8 Q10 14 4 8 Z" fill={color} stroke={color} strokeWidth="0.5" opacity="0.8" />
      <path d="M1 8 L4 5 L4 11 Z" fill={color} opacity="0.7" />
      <circle cx="14" cy="7" r="1" fill="#333" opacity="0.7" />
    </svg>
  );
}

export function Bubbles({ className = "" }: { className?: string }) {
  return (
    <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className={className}>
      <circle cx="20" cy="50" r="3" fill="none" stroke="#7EC8E3" strokeWidth="0.8" opacity="0.3" />
      <circle cx="14" cy="38" r="2.5" fill="none" stroke="#7EC8E3" strokeWidth="0.6" opacity="0.25" />
      <circle cx="26" cy="28" r="2" fill="none" stroke="#7EC8E3" strokeWidth="0.5" opacity="0.2" />
      <circle cx="18" cy="16" r="1.5" fill="none" stroke="#7EC8E3" strokeWidth="0.4" opacity="0.15" />
      <circle cx="24" cy="6" r="1" fill="none" stroke="#7EC8E3" strokeWidth="0.3" opacity="0.1" />
    </svg>
  );
}

export function TrophyIcon({ className = "", size = 32 }: DecorationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      {/* Cup */}
      <path d="M10 6 L22 6 L20 18 L12 18 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="1" />
      {/* Handles */}
      <path d="M10 8 Q4 8 4 14 Q4 18 8 18" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <path d="M22 8 Q28 8 28 14 Q28 18 24 18" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      {/* Stem */}
      <rect x="14" y="18" width="4" height="4" fill="#C5A200" />
      {/* Base */}
      <rect x="10" y="22" width="12" height="3" rx="1" fill="#FFD700" stroke="#C5A200" strokeWidth="0.8" />
      {/* Star */}
      <path d="M16 9 L17 12 L20 12 L18 14 L19 17 L16 15 L13 17 L14 14 L12 12 L15 12 Z" fill="#FFF8E1" opacity="0.8" />
    </svg>
  );
}

export function MapIcon({ className = "", size = 32 }: DecorationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="4" y="6" width="24" height="20" rx="2" fill="#F5D6A0" stroke="#D4B070" strokeWidth="1" />
      {/* Fold lines */}
      <line x1="12" y1="6" x2="12" y2="26" stroke="#D4B070" strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1="20" y1="6" x2="20" y2="26" stroke="#D4B070" strokeWidth="0.5" strokeDasharray="2 2" />
      {/* X mark */}
      <line x1="22" y1="10" x2="26" y2="14" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="10" x2="22" y2="14" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dotted path */}
      <path d="M8 20 Q12 14 16 18 Q20 22 24 12" stroke="#8B5E3C" strokeWidth="1" fill="none" strokeDasharray="2 2" />
      {/* Compass */}
      <circle cx="8" cy="10" r="2" fill="none" stroke="#8B5E3C" strokeWidth="0.8" />
      <line x1="8" y1="8" x2="8" y2="12" stroke="#FF6B6B" strokeWidth="0.8" />
    </svg>
  );
}

export function FishingRodIcon({ className = "", size = 32 }: DecorationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      {/* Rod */}
      <path d="M6 28 L26 6" stroke="#8B5E3C" strokeWidth="2" strokeLinecap="round" />
      {/* Reel */}
      <circle cx="8" cy="26" r="3" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      {/* Line */}
      <path d="M26 6 L28 8 L28 18" stroke="#B0BEC5" strokeWidth="0.8" strokeDasharray="2 1" />
      {/* Hook */}
      <path d="M28 18 Q30 22 26 22 Q24 22 26 20" stroke="#90A4AE" strokeWidth="1" fill="none" />
      {/* Fish on hook */}
      <path d="M22 22 Q26 18 30 22 Q26 26 22 22 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="0.5" opacity="0.7" />
    </svg>
  );
}

export function RankBadge({ rank, size = 36 }: { rank: number; size?: number }) {
  if (rank > 3) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-base font-bold text-text-secondary">#{rank}</span>
      </div>
    );
  }

  const colors = {
    1: { outer: "#FFD700", inner: "#FFF8E1", stroke: "#C5A200", text: "#8B6914" },
    2: { outer: "#C0C0C0", inner: "#F5F5F5", stroke: "#9E9E9E", text: "#616161" },
    3: { outer: "#CD7F32", inner: "#FFCC80", stroke: "#A0522D", text: "#6D3A1F" },
  }[rank]!;

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Medal */}
      <circle cx="18" cy="20" r="12" fill={colors.outer} stroke={colors.stroke} strokeWidth="1.5" />
      <circle cx="18" cy="20" r="9" fill={colors.inner} stroke={colors.stroke} strokeWidth="0.8" />
      {/* Ribbon */}
      <path d="M12 8 L18 14 L24 8" fill="none" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
      {/* Number */}
      <text x="18" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill={colors.text} fontFamily="sans-serif">
        {rank}
      </text>
    </svg>
  );
}

export function ZoneStatusIcon({ status, size = 28 }: { status: "unlocked" | "current" | "next" | "locked"; size?: number }) {
  const configs = {
    unlocked: { bg: "#00BFA6", icon: "check" },
    current: { bg: "#00BFA6", icon: "flag" },
    next: { bg: "#FFD700", icon: "lock-open" },
    locked: { bg: "#546E7A", icon: "lock" },
  }[status];

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill={configs.bg} opacity="0.2" stroke={configs.bg} strokeWidth="1.5" />
      {configs.icon === "check" && (
        <path d="M9 14 L12.5 17.5 L19 11" stroke={configs.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {configs.icon === "flag" && (
        <>
          <line x1="11" y1="8" x2="11" y2="22" stroke={configs.bg} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 8 L20 11 L11 14 Z" fill={configs.bg} />
        </>
      )}
      {configs.icon === "lock-open" && (
        <>
          <rect x="10" y="14" width="8" height="7" rx="1" fill={configs.bg} opacity="0.6" />
          <path d="M12 14 L12 11 Q12 7 18 9" stroke={configs.bg} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {configs.icon === "lock" && (
        <>
          <rect x="10" y="14" width="8" height="7" rx="1" fill={configs.bg} opacity="0.4" />
          <path d="M12 14 L12 11 Q12 7 16 7 Q20 7 20 11 L20 14" stroke={configs.bg} strokeWidth="1.5" fill="none" />
        </>
      )}
    </svg>
  );
}

export function Logo({ className = "", size = 40 }: DecorationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      {/* Water circle */}
      <circle cx="20" cy="20" r="18" fill="#1E5A8A" stroke="#FFD700" strokeWidth="2" />
      {/* Fish */}
      <path d="M10 20 Q18 12 28 20 Q18 28 10 20 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="1" />
      <path d="M6 20 L10 16 L10 24 Z" fill="#FFC107" />
      <circle cx="24" cy="19" r="1.5" fill="#1E5A8A" />
      {/* Rod */}
      <path d="M26 14 L32 8" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 8 L34 10 L34 16" stroke="#B0BEC5" strokeWidth="0.6" strokeDasharray="1.5 1" />
    </svg>
  );
}
