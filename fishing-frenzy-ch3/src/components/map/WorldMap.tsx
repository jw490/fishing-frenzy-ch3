"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayerProfile from "./PlayerProfile";

export interface PlayerDot {
  id: string;
  name: string;
  guild: string;
  guildLogoId: number;
  avatar: string;
  x: number; // percentage
  y: number; // percentage
  color: string;
  level: number;
  title: string;
}

// Mock player data scattered across the world map
const MOCK_PLAYERS: PlayerDot[] = [
  // North America
  { id: "1", name: "CaptainHook", guild: "Kraken Crew", guildLogoId: 6, avatar: "🎣", x: 18, y: 32, color: "#FFD700", level: 42, title: "Master Angler" },
  { id: "2", name: "ReelQueen", guild: "Ocean Reapers", guildLogoId: 2, avatar: "🐟", x: 22, y: 38, color: "#4FC3F7", level: 38, title: "Storm Fisher" },
  { id: "3", name: "BassMaster", guild: "Coral Kings", guildLogoId: 7, avatar: "🦀", x: 15, y: 42, color: "#FF7043", level: 35, title: "Reef Walker" },
  { id: "4", name: "TroutSlayer", guild: "Deep Divers", guildLogoId: 5, avatar: "🐬", x: 25, y: 35, color: "#81C784", level: 29, title: "Lake Legend" },
  // South America
  { id: "5", name: "PiranhaKing", guild: "Tidal Force", guildLogoId: 17, avatar: "⚓", x: 28, y: 62, color: "#CE93D8", level: 33, title: "River Phantom" },
  { id: "6", name: "AmazonFisher", guild: "Storm Chasers", guildLogoId: 20, avatar: "🏴‍☠️", x: 30, y: 55, color: "#FFB74D", level: 27, title: "Jungle Caster" },
  // Europe
  { id: "7", name: "NordicAngler", guild: "Abyssal Lords", guildLogoId: 4, avatar: "🦑", x: 48, y: 25, color: "#EF9A9A", level: 45, title: "Fjord Master" },
  { id: "8", name: "MedFisher", guild: "Pearl Hunters", guildLogoId: 15, avatar: "🐚", x: 50, y: 35, color: "#FFCCBC", level: 31, title: "Coast Guardian" },
  { id: "9", name: "ChannelPro", guild: "Kraken Crew", guildLogoId: 6, avatar: "🐋", x: 46, y: 30, color: "#5C6BC0", level: 40, title: "Deep Watcher" },
  // Africa
  { id: "10", name: "NileRanger", guild: "Ocean Reapers", guildLogoId: 2, avatar: "🦈", x: 52, y: 50, color: "#78909C", level: 26, title: "Sand Fisher" },
  { id: "11", name: "CapeCaster", guild: "Coral Kings", guildLogoId: 7, avatar: "🦀", x: 54, y: 68, color: "#FF5722", level: 22, title: "Cape Roamer" },
  // Asia
  { id: "12", name: "SilkRodMaster", guild: "Tidal Force", guildLogoId: 17, avatar: "⚓", x: 72, y: 32, color: "#FFD700", level: 48, title: "Eastern Legend" },
  { id: "13", name: "TokyoCaster", guild: "Deep Divers", guildLogoId: 5, avatar: "🐬", x: 82, y: 34, color: "#4FC3F7", level: 44, title: "Bay Hunter" },
  { id: "14", name: "MekongFish", guild: "Storm Chasers", guildLogoId: 20, avatar: "🏴‍☠️", x: 76, y: 45, color: "#81C784", level: 30, title: "Delta Fisher" },
  { id: "15", name: "BaliDiver", guild: "Abyssal Lords", guildLogoId: 4, avatar: "🦑", x: 78, y: 55, color: "#CE93D8", level: 36, title: "Island Seeker" },
  // Oceania
  { id: "16", name: "ReefRider", guild: "Pearl Hunters", guildLogoId: 15, avatar: "🐚", x: 84, y: 65, color: "#FFB74D", level: 34, title: "Barrier Warden" },
  { id: "17", name: "KiwiCatcher", guild: "Kraken Crew", guildLogoId: 6, avatar: "🐋", x: 88, y: 72, color: "#EF9A9A", level: 25, title: "Southern Tide" },
  // More scattered dots
  { id: "18", name: "ArcticFrost", guild: "Ocean Reapers", guildLogoId: 2, avatar: "🦈", x: 60, y: 18, color: "#B3E5FC", level: 39, title: "Ice Fisher" },
  { id: "19", name: "IndianOcean", guild: "Tidal Force", guildLogoId: 17, avatar: "⚓", x: 65, y: 52, color: "#FFCCBC", level: 28, title: "Monsoon Rider" },
  { id: "20", name: "CaribbeanJack", guild: "Storm Chasers", guildLogoId: 20, avatar: "🏴‍☠️", x: 24, y: 46, color: "#5C6BC0", level: 37, title: "Island Pirate" },
  { id: "21", name: "AlaskanBear", guild: "Coral Kings", guildLogoId: 7, avatar: "🦀", x: 10, y: 22, color: "#78909C", level: 41, title: "Glacier Angler" },
  { id: "22", name: "SaharanMirage", guild: "Pearl Hunters", guildLogoId: 15, avatar: "🐚", x: 50, y: 42, color: "#FF9800", level: 20, title: "Oasis Finder" },
  { id: "23", name: "BalticStorm", guild: "Abyssal Lords", guildLogoId: 4, avatar: "🦑", x: 52, y: 22, color: "#7E57C2", level: 43, title: "Storm Caller" },
  { id: "24", name: "PacificDrift", guild: "Deep Divers", guildLogoId: 5, avatar: "🐬", x: 90, y: 45, color: "#4DB6AC", level: 32, title: "Drift Master" },
];

// Simplified pixel-art world map paths (stylized continents)
function MapContinent({ d, fill, stroke }: { d: string; fill: string; stroke: string }) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth="1.5" opacity="0.85" />;
}

function PixelWorldMap() {
  return (
    <g>
      {/* North America */}
      <MapContinent
        d="M80,100 L100,80 L120,75 L145,80 L160,90 L170,110 L175,130 L170,150 L160,165 L145,170 L130,175 L120,180 L110,175 L100,165 L90,160 L85,150 L80,140 L75,120 Z"
        fill="#2E7D32"
        stroke="#1B5E20"
      />
      {/* Central America */}
      <MapContinent
        d="M120,180 L125,190 L128,200 L132,210 L130,215 L125,210 L120,200 L118,190 Z"
        fill="#388E3C"
        stroke="#1B5E20"
      />
      {/* South America */}
      <MapContinent
        d="M150,220 L165,210 L180,215 L190,230 L195,250 L192,270 L185,290 L175,310 L165,320 L155,315 L148,300 L142,280 L140,260 L142,240 Z"
        fill="#4CAF50"
        stroke="#2E7D32"
      />
      {/* Europe */}
      <MapContinent
        d="M270,80 L285,75 L300,78 L310,85 L315,95 L310,110 L305,120 L295,128 L280,130 L270,125 L265,115 L260,100 L262,90 Z"
        fill="#388E3C"
        stroke="#1B5E20"
      />
      {/* UK/Ireland */}
      <MapContinent
        d="M258,85 L262,80 L266,82 L265,90 L260,92 Z"
        fill="#43A047"
        stroke="#2E7D32"
      />
      {/* Africa */}
      <MapContinent
        d="M275,150 L295,145 L315,150 L325,165 L330,185 L328,210 L320,235 L310,255 L295,270 L280,272 L268,260 L260,240 L258,220 L260,200 L265,180 L270,165 Z"
        fill="#8B5E3C"
        stroke="#5C3A28"
      />
      {/* Asia */}
      <MapContinent
        d="M320,70 L350,60 L380,55 L410,58 L430,65 L445,80 L450,100 L445,120 L435,135 L420,145 L400,150 L380,148 L360,140 L345,130 L330,120 L320,110 L315,95 Z"
        fill="#2E7D32"
        stroke="#1B5E20"
      />
      {/* India */}
      <MapContinent
        d="M370,150 L385,145 L395,155 L390,175 L380,190 L370,185 L365,170 Z"
        fill="#4CAF50"
        stroke="#2E7D32"
      />
      {/* Southeast Asia islands */}
      <MapContinent
        d="M405,170 L415,165 L425,170 L420,180 L410,178 Z"
        fill="#43A047"
        stroke="#2E7D32"
      />
      <MapContinent
        d="M420,185 L435,180 L440,190 L430,195 Z"
        fill="#388E3C"
        stroke="#1B5E20"
      />
      {/* Japan */}
      <MapContinent
        d="M440,90 L445,85 L448,95 L445,105 L440,100 Z"
        fill="#43A047"
        stroke="#2E7D32"
      />
      {/* Australia */}
      <MapContinent
        d="M410,250 L435,240 L455,245 L465,260 L460,280 L445,290 L425,288 L412,275 L408,260 Z"
        fill="#8B5E3C"
        stroke="#5C3A28"
      />
      {/* New Zealand */}
      <MapContinent
        d="M472,290 L476,285 L478,295 L474,300 Z"
        fill="#4CAF50"
        stroke="#2E7D32"
      />
      {/* Greenland */}
      <MapContinent
        d="M175,50 L195,45 L210,50 L215,60 L210,70 L195,72 L180,68 L175,58 Z"
        fill="#E8E8E8"
        stroke="#BDBDBD"
      />
      {/* Iceland */}
      <MapContinent
        d="M242,60 L250,58 L255,62 L252,68 L245,66 Z"
        fill="#90A4AE"
        stroke="#607D8B"
      />
    </g>
  );
}

interface WorldMapProps {
  onLoginClick: () => void;
}

export default function WorldMap({ onLoginClick }: WorldMapProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDot | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.max(1, Math.min(4, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const showProfiles = zoom >= 2;

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Map container */}
      <div
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="w-full h-full transition-transform duration-150"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
          }}
        >
          {/* SVG Map */}
          <svg
            viewBox="0 0 500 400"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Ocean background */}
            <defs>
              <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#1E5A8A" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#091A30" stopOpacity="0" />
              </radialGradient>
              <filter id="dotGlow">
                <feGaussianBlur stdDeviation="2" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="profileGlow">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Deep ocean */}
            <rect width="500" height="400" fill="#0B1D3A" />
            <rect width="500" height="400" fill="url(#oceanGlow)" />

            {/* Grid lines (nautical chart feel) */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <g key={`grid-${i}`}>
                <line
                  x1={i * 50}
                  y1="0"
                  x2={i * 50}
                  y2="400"
                  stroke="#1E4A7A"
                  strokeWidth="0.3"
                  opacity="0.3"
                />
                <line
                  x1="0"
                  y1={i * 40}
                  x2="500"
                  y2={i * 40}
                  stroke="#1E4A7A"
                  strokeWidth="0.3"
                  opacity="0.3"
                />
              </g>
            ))}

            {/* Continents */}
            <PixelWorldMap />

            {/* Player dots */}
            {MOCK_PLAYERS.map((player) => {
              const px = (player.x / 100) * 500;
              const py = (player.y / 100) * 400;
              const isHovered = hoveredPlayer === player.id;
              const isSelected = selectedPlayer?.id === player.id;

              return (
                <g
                  key={player.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayer(player);
                  }}
                  onMouseEnter={() => setHoveredPlayer(player.id)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  className="cursor-pointer"
                >
                  {/* Pulse ring */}
                  <circle cx={px} cy={py} r="6" fill="none" stroke={player.color} strokeWidth="0.5" opacity="0.3">
                    <animate attributeName="r" values="4;8;4" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                  </circle>

                  {/* Dot or profile based on zoom */}
                  {showProfiles ? (
                    <>
                      {/* Profile circle background */}
                      <circle
                        cx={px}
                        cy={py}
                        r={isHovered || isSelected ? 10 : 8}
                        fill="#0F2847"
                        stroke={isSelected ? "#FFD700" : player.color}
                        strokeWidth={isSelected ? 1.5 : 1}
                        filter="url(#profileGlow)"
                      />
                      {/* Avatar text (in real app, would be an image) */}
                      <text
                        x={px}
                        y={py + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="8"
                        className="select-none pointer-events-none"
                      >
                        {player.avatar}
                      </text>
                      {/* Name label on hover */}
                      {(isHovered || isSelected) && (
                        <>
                          <rect
                            x={px - 24}
                            y={py + 12}
                            width="48"
                            height="10"
                            rx="3"
                            fill="#091A30"
                            stroke={player.color}
                            strokeWidth="0.5"
                            opacity="0.9"
                          />
                          <text
                            x={px}
                            y={py + 18}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="4.5"
                            fill="#F0E0C0"
                            fontWeight="bold"
                            className="select-none pointer-events-none"
                          >
                            {player.name}
                          </text>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Simple glowing dot */}
                      <circle
                        cx={px}
                        cy={py}
                        r={isHovered ? 4 : 3}
                        fill={player.color}
                        filter="url(#dotGlow)"
                        opacity="0.9"
                      />
                      {/* Tiny inner highlight */}
                      <circle
                        cx={px - 0.5}
                        cy={py - 0.5}
                        r="1"
                        fill="white"
                        opacity="0.5"
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Water surface shimmer lines */}
            <line x1="0" y1="200" x2="500" y2="200" stroke="#5BA0E8" strokeWidth="0.2" opacity="0.1" />
          </svg>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          className="w-9 h-9 bg-[#0F2847]/90 border-2 border-[#2A5A8A] rounded-lg text-[#FFD700] font-bold text-lg hover:bg-[#1A3A5C] transition-colors cursor-pointer flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom((z) => Math.max(1, z - 0.5));
          }}
          className="w-9 h-9 bg-[#0F2847]/90 border-2 border-[#2A5A8A] rounded-lg text-[#FFD700] font-bold text-lg hover:bg-[#1A3A5C] transition-colors cursor-pointer flex items-center justify-center"
        >
          -
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#0F2847]/80 border border-[#2A5A8A] rounded-lg">
        <span className="text-[11px] text-[#7A9BBF] font-medium">
          {zoom >= 2 ? "PROFILE VIEW" : "WORLD VIEW"} &middot; {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Player count indicator */}
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#0F2847]/80 border border-[#2A5A8A] rounded-lg flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
        <span className="text-[11px] text-[#7A9BBF] font-medium">
          {MOCK_PLAYERS.length} FISHERS ONLINE
        </span>
      </div>

      {/* "Log my location" button */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={onLoginClick}
          className="px-4 py-2 bg-gradient-to-b from-[#FFD700] to-[#D4A800] border-2 border-[#C5A200] rounded-xl text-[#3A2600] text-sm font-bold hover:from-[#FFE033] hover:to-[#FFD700] transition-all cursor-pointer shadow-[0_2px_12px_rgba(255,215,0,0.3)]"
        >
          DROP MY PIN
        </button>
      </div>

      {/* Player profile overlay */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfile
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
