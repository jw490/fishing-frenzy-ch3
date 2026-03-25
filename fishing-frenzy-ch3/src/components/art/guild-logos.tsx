/** 20 cartoon-style guild logo SVG icons replacing emoji */

interface LogoProps {
  size?: number;
  className?: string;
}

function LogoBase({ children, bg, size = 48, className = "" }: LogoProps & { children: React.ReactNode; bg: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="22" fill={bg} stroke="#5C3A1E" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="19" fill="none" stroke="#FFD700" strokeWidth="0.5" opacity="0.4" />
      {children}
    </svg>
  );
}

/** Fish */
function Logo1(p: LogoProps) {
  return (
    <LogoBase bg="#1E5A8A" {...p}>
      <path d="M14 24 Q22 16 32 24 Q22 32 14 24 Z" fill="#FFD700" stroke="#C5A200" strokeWidth="1" />
      <path d="M10 24 L14 20 L14 28 Z" fill="#FFC107" />
      <circle cx="28" cy="23" r="1.5" fill="#333" />
      <circle cx="28.5" cy="22.5" r="0.5" fill="white" />
    </LogoBase>
  );
}

/** Shark */
function Logo2(p: LogoProps) {
  return (
    <LogoBase bg="#1A3A5C" {...p}>
      <path d="M12 26 Q20 18 34 24 Q28 14 24 12 Z" fill="#78909C" stroke="#546E7A" strokeWidth="1" />
      <path d="M12 26 Q20 30 34 24 Q26 34 12 26" fill="#90A4AE" stroke="#546E7A" strokeWidth="1" />
      <path d="M8 26 L12 22 L12 30 Z" fill="#78909C" />
      <circle cx="30" cy="23" r="1.2" fill="#F44336" />
      <path d="M16 26 L18 25 L20 26 L22 25 L24 26" stroke="white" strokeWidth="0.8" />
    </LogoBase>
  );
}

/** Octopus */
function Logo3(p: LogoProps) {
  return (
    <LogoBase bg="#4A148C" {...p}>
      <ellipse cx="24" cy="20" rx="8" ry="7" fill="#CE93D8" stroke="#AB47BC" strokeWidth="1" />
      <circle cx="21" cy="19" r="2" fill="white" />
      <circle cx="27" cy="19" r="2" fill="white" />
      <circle cx="21" cy="19" r="1" fill="#333" />
      <circle cx="27" cy="19" r="1" fill="#333" />
      <path d="M14 26 Q12 34 16 36" stroke="#CE93D8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M18 27 Q16 36 20 38" stroke="#BA68C8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M24 28 Q24 36 24 38" stroke="#CE93D8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M30 27 Q32 36 28 38" stroke="#BA68C8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M34 26 Q36 34 32 36" stroke="#CE93D8" strokeWidth="2" fill="none" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Squid */
function Logo4(p: LogoProps) {
  return (
    <LogoBase bg="#0D47A1" {...p}>
      <path d="M20 14 L28 14 L30 28 L18 28 Z" fill="#EF9A9A" stroke="#E57373" strokeWidth="1" />
      <circle cx="22" cy="20" r="1.5" fill="white" />
      <circle cx="26" cy="20" r="1.5" fill="white" />
      <circle cx="22" cy="20" r="0.8" fill="#333" />
      <circle cx="26" cy="20" r="0.8" fill="#333" />
      <path d="M18 28 Q16 36 20 36" stroke="#EF9A9A" strokeWidth="1.5" fill="none" />
      <path d="M22 28 Q22 38 24 38" stroke="#E57373" strokeWidth="1.5" fill="none" />
      <path d="M26 28 Q26 38 24 38" stroke="#E57373" strokeWidth="1.5" fill="none" />
      <path d="M30 28 Q32 36 28 36" stroke="#EF9A9A" strokeWidth="1.5" fill="none" />
    </LogoBase>
  );
}

/** Dolphin */
function Logo5(p: LogoProps) {
  return (
    <LogoBase bg="#0277BD" {...p}>
      <path d="M12 22 Q18 14 30 18 Q36 20 36 24 Q36 28 30 28 Q20 28 14 30 Q10 26 12 22 Z" fill="#4FC3F7" stroke="#0288D1" strokeWidth="1" />
      <path d="M30 14 Q28 18 30 18" stroke="#4FC3F7" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M10 24 L6 20 L8 26 Z" fill="#29B6F6" />
      <circle cx="18" cy="22" r="1.2" fill="#333" />
      <path d="M22 26 Q24 27 26 26" stroke="#0288D1" strokeWidth="0.8" fill="none" />
    </LogoBase>
  );
}

/** Whale */
function Logo6(p: LogoProps) {
  return (
    <LogoBase bg="#01579B" {...p}>
      <path d="M10 24 Q14 16 28 18 Q36 20 38 26 Q36 32 28 32 Q14 30 10 24 Z" fill="#5C6BC0" stroke="#3949AB" strokeWidth="1" />
      <path d="M8 22 L6 16 L12 22" fill="#5C6BC0" stroke="#3949AB" strokeWidth="0.8" />
      <path d="M36 20 Q38 16 40 18" stroke="#7986CB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="22" r="1.5" fill="white" />
      <circle cx="16" cy="22" r="0.8" fill="#333" />
      <path d="M14 28 Q18 30 22 28" fill="#7986CB" stroke="#5C6BC0" strokeWidth="0.5" />
    </LogoBase>
  );
}

/** Crab */
function Logo7(p: LogoProps) {
  return (
    <LogoBase bg="#BF360C" {...p}>
      <ellipse cx="24" cy="26" rx="8" ry="6" fill="#FF5722" stroke="#D84315" strokeWidth="1" />
      <circle cx="21" cy="24" r="1.5" fill="white" />
      <circle cx="27" cy="24" r="1.5" fill="white" />
      <circle cx="21" cy="24" r="0.8" fill="#333" />
      <circle cx="27" cy="24" r="0.8" fill="#333" />
      <path d="M16 24 L10 18 L12 16" stroke="#FF7043" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M32 24 L38 18 L36 16" stroke="#FF7043" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="15" r="2" fill="#FF7043" stroke="#D84315" strokeWidth="0.8" />
      <circle cx="36" cy="15" r="2" fill="#FF7043" stroke="#D84315" strokeWidth="0.8" />
      <path d="M18 32 L16 36" stroke="#FF7043" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 33 L21 37" stroke="#FF7043" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M26 33 L27 37" stroke="#FF7043" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 32 L32 36" stroke="#FF7043" strokeWidth="1.5" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Lobster */
function Logo8(p: LogoProps) {
  return (
    <LogoBase bg="#880E4F" {...p}>
      <path d="M20 18 L28 18 L30 32 L18 32 Z" fill="#E91E63" stroke="#C2185B" strokeWidth="1" />
      <circle cx="22" cy="22" r="1.2" fill="white" /><circle cx="22" cy="22" r="0.6" fill="#333" />
      <circle cx="26" cy="22" r="1.2" fill="white" /><circle cx="26" cy="22" r="0.6" fill="#333" />
      <path d="M18 20 L12 14 L10 16 L8 14" stroke="#F06292" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M30 20 L36 14 L38 16 L40 14" stroke="#F06292" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M20 32 L18 38" stroke="#E91E63" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 32 L24 38" stroke="#E91E63" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 32 L30 38" stroke="#E91E63" strokeWidth="1.5" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Tropical fish */
function Logo9(p: LogoProps) {
  return (
    <LogoBase bg="#006064" {...p}>
      <path d="M14 24 Q22 14 34 24 Q22 34 14 24 Z" fill="#FF9800" stroke="#F57C00" strokeWidth="1" />
      <path d="M8 24 L14 18 L14 30 Z" fill="#FFB74D" />
      <path d="M20 18 L20 30" stroke="white" strokeWidth="2" opacity="0.6" />
      <path d="M26 16 L26 32" stroke="white" strokeWidth="2" opacity="0.6" />
      <circle cx="30" cy="23" r="1.5" fill="white" /><circle cx="30.5" cy="22.5" r="0.7" fill="#333" />
    </LogoBase>
  );
}

/** Pufferfish */
function Logo10(p: LogoProps) {
  return (
    <LogoBase bg="#1B5E20" {...p}>
      <circle cx="24" cy="24" r="10" fill="#FDD835" stroke="#F9A825" strokeWidth="1" />
      {/* Spines */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 24 + 10 * Math.cos(rad);
        const y1 = 24 + 10 * Math.sin(rad);
        const x2 = 24 + 13 * Math.cos(rad);
        const y2 = 24 + 13 * Math.sin(rad);
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F9A825" strokeWidth="1.5" strokeLinecap="round" />;
      })}
      <circle cx="20" cy="22" r="2.5" fill="white" /><circle cx="20" cy="22" r="1.2" fill="#333" />
      <circle cx="28" cy="22" r="2.5" fill="white" /><circle cx="28" cy="22" r="1.2" fill="#333" />
      <ellipse cx="24" cy="28" rx="2" ry="1" fill="#E65100" />
    </LogoBase>
  );
}

/** Seal */
function Logo11(p: LogoProps) {
  return (
    <LogoBase bg="#37474F" {...p}>
      <ellipse cx="24" cy="26" rx="10" ry="8" fill="#78909C" stroke="#546E7A" strokeWidth="1" />
      <ellipse cx="24" cy="20" rx="7" ry="6" fill="#90A4AE" stroke="#607D8B" strokeWidth="1" />
      <circle cx="20" cy="19" r="1.5" fill="#333" /><circle cx="20.5" cy="18.5" r="0.5" fill="white" />
      <circle cx="28" cy="19" r="1.5" fill="#333" /><circle cx="28.5" cy="18.5" r="0.5" fill="white" />
      <ellipse cx="24" cy="22" rx="2" ry="1" fill="#546E7A" />
      <path d="M22 24 Q24 26 26 24" stroke="#546E7A" strokeWidth="0.8" fill="none" />
      {/* Whiskers */}
      <line x1="18" y1="22" x2="12" y2="20" stroke="#B0BEC5" strokeWidth="0.5" />
      <line x1="18" y1="23" x2="12" y2="24" stroke="#B0BEC5" strokeWidth="0.5" />
      <line x1="30" y1="22" x2="36" y2="20" stroke="#B0BEC5" strokeWidth="0.5" />
      <line x1="30" y1="23" x2="36" y2="24" stroke="#B0BEC5" strokeWidth="0.5" />
    </LogoBase>
  );
}

/** Turtle */
function Logo12(p: LogoProps) {
  return (
    <LogoBase bg="#1B5E20" {...p}>
      <ellipse cx="24" cy="26" rx="10" ry="8" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1.5" />
      {/* Shell pattern */}
      <path d="M18 26 Q24 20 30 26" stroke="#2E7D32" strokeWidth="1" fill="none" />
      <path d="M16 28 Q24 22 32 28" stroke="#2E7D32" strokeWidth="0.8" fill="none" />
      <line x1="24" y1="18" x2="24" y2="34" stroke="#2E7D32" strokeWidth="0.8" />
      {/* Head */}
      <ellipse cx="24" cy="16" rx="4" ry="3" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
      <circle cx="22" cy="15" r="0.8" fill="#333" />
      <circle cx="26" cy="15" r="0.8" fill="#333" />
      {/* Flippers */}
      <ellipse cx="14" cy="24" rx="4" ry="2" fill="#66BB6A" stroke="#2E7D32" strokeWidth="0.8" transform="rotate(-20 14 24)" />
      <ellipse cx="34" cy="24" rx="4" ry="2" fill="#66BB6A" stroke="#2E7D32" strokeWidth="0.8" transform="rotate(20 34 24)" />
      <ellipse cx="16" cy="32" rx="3" ry="2" fill="#66BB6A" stroke="#2E7D32" strokeWidth="0.8" transform="rotate(20 16 32)" />
      <ellipse cx="32" cy="32" rx="3" ry="2" fill="#66BB6A" stroke="#2E7D32" strokeWidth="0.8" transform="rotate(-20 32 32)" />
    </LogoBase>
  );
}

/** Shrimp */
function Logo13(p: LogoProps) {
  return (
    <LogoBase bg="#E65100" {...p}>
      <path d="M30 16 Q34 20 32 28 Q28 34 22 34 Q16 34 14 28 Q12 24 16 22" fill="#FF8A65" stroke="#E64A19" strokeWidth="1" />
      <circle cx="28" cy="18" r="1" fill="#333" />
      <path d="M30 14 L34 10" stroke="#FFAB91" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 16 L36 12" stroke="#FFAB91" strokeWidth="1" strokeLinecap="round" />
      <path d="M14 28 L10 30" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 30" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Jellyfish */
function Logo14(p: LogoProps) {
  return (
    <LogoBase bg="#311B92" {...p}>
      <path d="M14 24 Q14 14 24 14 Q34 14 34 24 Z" fill="#B39DDB" stroke="#7E57C2" strokeWidth="1" opacity="0.8" />
      <circle cx="20" cy="20" r="1.2" fill="white" opacity="0.6" />
      <circle cx="28" cy="20" r="1.2" fill="white" opacity="0.6" />
      <path d="M16 24 Q14 32 16 38" stroke="#CE93D8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M20 24 Q22 34 20 38" stroke="#B39DDB" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M24 24 Q24 34 24 38" stroke="#CE93D8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M28 24 Q26 34 28 38" stroke="#B39DDB" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M32 24 Q34 32 32 38" stroke="#CE93D8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </LogoBase>
  );
}

/** Shell */
function Logo15(p: LogoProps) {
  return (
    <LogoBase bg="#4E342E" {...p}>
      <path d="M16 30 Q24 10 32 30 Z" fill="#FFCCBC" stroke="#BCAAA4" strokeWidth="1" />
      <path d="M18 28 Q24 14 30 28" stroke="#D7CCC8" strokeWidth="0.8" fill="none" />
      <line x1="24" y1="14" x2="24" y2="30" stroke="#D7CCC8" strokeWidth="0.5" />
      <line x1="20" y1="24" x2="28" y2="24" stroke="#D7CCC8" strokeWidth="0.5" />
      <path d="M24 30 Q18 34 20 36 Q24 38 28 36 Q30 34 24 30 Z" fill="#FFAB91" stroke="#BCAAA4" strokeWidth="0.8" />
    </LogoBase>
  );
}

/** Flamingo */
function Logo16(p: LogoProps) {
  return (
    <LogoBase bg="#AD1457" {...p}>
      <path d="M28 14 Q22 14 20 20 Q18 26 22 30" stroke="#F48FB1" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="14" r="3" fill="#F48FB1" stroke="#EC407A" strokeWidth="0.8" />
      <path d="M30 14 L32 13 L31 15 Z" fill="#FF9800" />
      <circle cx="29" cy="13" r="0.8" fill="#333" />
      <line x1="22" y1="30" x2="20" y2="38" stroke="#F48FB1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="30" x2="26" y2="38" stroke="#F48FB1" strokeWidth="1.5" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Anchor */
function Logo17(p: LogoProps) {
  return (
    <LogoBase bg="#1A237E" {...p}>
      <circle cx="24" cy="14" r="3" fill="none" stroke="#FFD700" strokeWidth="2" />
      <line x1="24" y1="17" x2="24" y2="34" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 30 Q14 38 24 38 Q34 38 34 30" stroke="#FFD700" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="16" y1="26" x2="32" y2="26" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" />
    </LogoBase>
  );
}

/** Trident */
function Logo18(p: LogoProps) {
  return (
    <LogoBase bg="#004D40" {...p}>
      <line x1="24" y1="12" x2="24" y2="38" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18 L24 12 L32 18" stroke="#FFD700" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="16" y1="18" x2="16" y2="10" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="18" x2="32" y2="10" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 10 L16 6 L18 10" fill="#FFD700" />
      <path d="M22 12 L24 8 L26 12" fill="#FFD700" />
      <path d="M30 10 L32 6 L34 10" fill="#FFD700" />
    </LogoBase>
  );
}

/** Mermaid */
function Logo19(p: LogoProps) {
  return (
    <LogoBase bg="#1565C0" {...p}>
      {/* Tail */}
      <path d="M24 28 Q20 34 18 38 L14 36 L18 38 L16 40" fill="#4FC3F7" stroke="#0288D1" strokeWidth="1" />
      {/* Body */}
      <path d="M20 22 Q24 28 28 22 L26 28 Q24 32 22 28 Z" fill="#4FC3F7" stroke="#0288D1" strokeWidth="0.8" />
      {/* Head */}
      <circle cx="24" cy="18" r="4" fill="#FFCC80" stroke="#F57C00" strokeWidth="0.8" />
      {/* Hair */}
      <path d="M20 16 Q18 10 22 12 Q24 8 26 12 Q30 10 28 16" fill="#FFD54F" stroke="#F9A825" strokeWidth="0.5" />
      <path d="M20 16 Q18 20 16 22" stroke="#FFD54F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M28 16 Q30 20 32 22" stroke="#FFD54F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="18" r="0.8" fill="#333" />
      <circle cx="26" cy="18" r="0.8" fill="#333" />
      <path d="M22 20 Q24 22 26 20" stroke="#E57373" strokeWidth="0.5" fill="none" />
    </LogoBase>
  );
}

/** Pirate flag */
function Logo20(p: LogoProps) {
  return (
    <LogoBase bg="#212121" {...p}>
      {/* Skull */}
      <ellipse cx="24" cy="20" rx="6" ry="5" fill="#F5F5F5" stroke="#BDBDBD" strokeWidth="0.8" />
      <circle cx="21" cy="19" r="1.5" fill="#333" />
      <circle cx="27" cy="19" r="1.5" fill="#333" />
      <path d="M22 24 L23 22 L24 24 L25 22 L26 24" fill="#F5F5F5" stroke="#BDBDBD" strokeWidth="0.5" />
      {/* Crossbones */}
      <line x1="14" y1="28" x2="34" y2="36" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="28" x2="14" y2="36" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="28" r="2" fill="#F5F5F5" />
      <circle cx="34" cy="28" r="2" fill="#F5F5F5" />
      <circle cx="14" cy="36" r="2" fill="#F5F5F5" />
      <circle cx="34" cy="36" r="2" fill="#F5F5F5" />
      {/* Hat */}
      <path d="M14 18 Q14 10 24 10 Q34 10 34 18" fill="#333" stroke="#555" strokeWidth="0.8" />
      <path d="M20 10 L24 6 L28 10" fill="#FFD700" stroke="#C5A200" strokeWidth="0.5" />
    </LogoBase>
  );
}

export const GUILD_LOGO_COMPONENTS: Record<number, React.FC<LogoProps>> = {
  1: Logo1, 2: Logo2, 3: Logo3, 4: Logo4, 5: Logo5,
  6: Logo6, 7: Logo7, 8: Logo8, 9: Logo9, 10: Logo10,
  11: Logo11, 12: Logo12, 13: Logo13, 14: Logo14, 15: Logo15,
  16: Logo16, 17: Logo17, 18: Logo18, 19: Logo19, 20: Logo20,
};

export function GuildLogo({ logoId, size = 48, className = "" }: { logoId: number; size?: number; className?: string }) {
  const Component = GUILD_LOGO_COMPONENTS[logoId] ?? Logo1;
  return <Component size={size} className={className} />;
}

export const GUILD_LOGO_NAMES = [
  "Fish", "Shark", "Octopus", "Squid", "Dolphin", "Whale", "Crab", "Lobster", "Tropical", "Puffer",
  "Seal", "Turtle", "Shrimp", "Jellyfish", "Shell", "Flamingo", "Anchor", "Trident", "Mermaid", "Pirate",
];
