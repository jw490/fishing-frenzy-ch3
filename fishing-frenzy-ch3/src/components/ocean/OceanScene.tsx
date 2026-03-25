"use client";

import { motion } from "framer-motion";
import { getIslandComponent } from "@/components/art/islands";
import { Sailboat, Trawler, Galleon, CrewBoat } from "@/components/art/boats";
import { SmallFish } from "@/components/art/decorations";

interface OceanSceneProps {
  totalSignups: number;
  currentZone: number;
  guildsCount: number;
}

function SkyLayer() {
  return (
    <div className="absolute inset-0">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a3e] via-[#1E3A5F] to-[#14375E]" />
      {/* Stars */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [s.minO, s.maxO, s.minO] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}
      {/* Moon */}
      <div className="absolute top-[8%] right-[12%]">
        <div className="w-12 h-12 rounded-full bg-[#FFF8E1] shadow-[0_0_30px_rgba(255,248,225,0.4)]" />
        <div className="absolute top-1 left-2 w-10 h-10 rounded-full bg-[#1a1a3e]" />
      </div>
    </div>
  );
}

function CloudLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CLOUDS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: c.y }}
          initial={{ x: c.startX }}
          animate={{ x: "-300px" }}
          transition={{ duration: c.speed, repeat: Infinity, ease: "linear", delay: c.delay }}
        >
          <div className={`${c.size} bg-white/[0.04] rounded-full blur-md`} />
        </motion.div>
      ))}
    </div>
  );
}

function WaterLayer() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[55%]">
      {/* Deep water base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#14375E] via-[#0F2847] to-[#091A30]" />

      {/* Animated wave layers */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-[200%] left-0"
          style={{ top: `${i * 4}%`, opacity: 0.4 - i * 0.1 }}
          animate={{ x: [0, i % 2 === 0 ? "-50%" : "50%"] }}
          transition={{ duration: 12 + i * 4, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 2880 60" className="w-full h-8" preserveAspectRatio="none">
            <path
              d={`M0,30 C${240 + i * 60},${50 - i * 5} ${480 + i * 40},${10 + i * 5} 720,30 C${960 + i * 60},${50 - i * 5} ${1200 + i * 40},${10 + i * 5} 1440,30 C${1680 + i * 60},${50 - i * 5} ${1920 + i * 40},${10 + i * 5} 2160,30 C${2400 + i * 60},${50 - i * 5} ${2640 + i * 40},${10 + i * 5} 2880,30 L2880,60 L0,60 Z`}
              fill={`rgba(30, 90, 138, ${0.3 - i * 0.08})`}
            />
          </svg>
        </motion.div>
      ))}

      {/* Water surface shimmer */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-[#7EC8E3]/10 to-transparent"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Underwater caustics (subtle light patterns) */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 60%, #7EC8E3 0%, transparent 50%),
                           radial-gradient(ellipse at 60% 40%, #7EC8E3 0%, transparent 50%),
                           radial-gradient(ellipse at 80% 70%, #7EC8E3 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}

function IslandNode({ x, zoneId, unlocked }: { x: string; zoneId: number; unlocked: boolean }) {
  const Island = getIslandComponent(zoneId);
  const zoneNames = ["The Shallows", "Coral Reef", "Deep Trench", "Sunken City", "???"];

  return (
    <motion.div
      className="absolute"
      style={{ left: x, bottom: "28%" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: unlocked ? 1 : 0.2, y: unlocked ? 0 : 10 }}
      transition={{ duration: 0.8, delay: zoneId * 0.2 }}
    >
      <motion.div
        animate={unlocked ? { y: [0, -4, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity, delay: zoneId * 0.5 }}
        className={unlocked ? "" : "blur-[1px] grayscale"}
      >
        <Island size={70} />
      </motion.div>
      {unlocked && (
        <motion.p
          className="text-[11px] text-[#A0B4CC] text-center mt-1 font-medium whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.8 + zoneId * 0.2 }}
        >
          {zoneNames[zoneId - 1]}
        </motion.p>
      )}
    </motion.div>
  );
}

function FleetGroup({ name, size, x, delay }: { name: string; size: number; x: string; delay: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, bottom: "18%" }}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, delay }}
    >
      <div className="flex items-end gap-0.5">
        {/* Lead ship is bigger */}
        {size >= 5 ? (
          <Galleon size={36} className="drop-shadow-md" />
        ) : size >= 3 ? (
          <Trawler size={32} className="drop-shadow-md" />
        ) : (
          <Sailboat size={28} className="drop-shadow-md" />
        )}
        {/* Crew boats */}
        {Array.from({ length: Math.min(size - 1, 4) }).map((_, i) => (
          <CrewBoat key={i} size={22} index={i} className="drop-shadow-sm" />
        ))}
      </div>
      <p className="text-[9px] text-[#FFD700]/60 text-center mt-0.5 font-medium whitespace-nowrap">
        {name}
      </p>
    </motion.div>
  );
}

function FishSchool() {
  return (
    <div className="absolute bottom-[8%] left-0 right-0 pointer-events-none overflow-hidden">
      {FISH.map((f, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ bottom: f.y }}
          initial={{ x: f.dir === "right" ? "-40px" : "calc(100vw + 40px)" }}
          animate={{ x: f.dir === "right" ? "calc(100vw + 40px)" : "-40px" }}
          transition={{ duration: f.speed, repeat: Infinity, delay: f.delay, ease: "linear" }}
        >
          <SmallFish
            size={f.size}
            color={f.color}
            className={f.dir === "left" ? "scale-x-[-1]" : ""}
          />
        </motion.div>
      ))}
    </div>
  );
}

function FogOverlay({ currentZone }: { currentZone: number }) {
  const clearPct = (currentZone / 5) * 100;

  return (
    <motion.div className="absolute inset-0 pointer-events-none">
      <div
        className="w-full h-full"
        style={{
          background: `linear-gradient(to right,
            transparent 0%,
            transparent ${clearPct - 15}%,
            rgba(9, 26, 48, 0.2) ${clearPct - 5}%,
            rgba(9, 26, 48, 0.5) ${clearPct + 5}%,
            rgba(9, 26, 48, 0.75) ${clearPct + 20}%,
            rgba(9, 26, 48, 0.92) 100%)`,
        }}
      />
      {/* Fog wisps */}
      {currentZone < 5 && (
        <>
          <motion.div
            className="absolute top-[30%] bg-white/[0.03] rounded-full blur-xl"
            style={{ right: `${20 - currentZone * 4}%`, width: 120, height: 40 }}
            animate={{ x: [0, 20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-[50%] bg-white/[0.02] rounded-full blur-xl"
            style={{ right: `${10 - currentZone * 2}%`, width: 160, height: 50 }}
            animate={{ x: [0, -15, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </>
      )}
    </motion.div>
  );
}

export default function OceanScene({ totalSignups, currentZone, guildsCount }: OceanSceneProps) {
  return (
    <div className="relative w-full h-[420px] md:h-[520px] overflow-hidden rounded-2xl border-2 border-[#1E4A7A] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
      <SkyLayer />
      <CloudLayer />
      <WaterLayer />

      {/* Islands */}
      <IslandNode x="5%" zoneId={1} unlocked={currentZone >= 1} />
      <IslandNode x="22%" zoneId={2} unlocked={currentZone >= 2} />
      <IslandNode x="42%" zoneId={3} unlocked={currentZone >= 3} />
      <IslandNode x="62%" zoneId={4} unlocked={currentZone >= 4} />
      <IslandNode x="80%" zoneId={5} unlocked={currentZone >= 5} />

      {/* Guild fleets */}
      <FleetGroup name="Kraken Crew" size={7} x="12%" delay={0} />
      <FleetGroup name="Ocean Reapers" size={5} x="33%" delay={0.5} />
      <FleetGroup name="Coral Kings" size={3} x="52%" delay={1} />

      {/* Swimming fish */}
      <FishSchool />

      {/* Fog */}
      <FogOverlay currentZone={currentZone} />

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] pointer-events-none rounded-2xl" />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#091A30] to-transparent pointer-events-none" />
    </div>
  );
}

// ——— Static data (no Math.random, avoids hydration mismatch) ———

const STARS = [
  { x: 5, y: 4, size: 2, minO: 0.2, maxO: 0.7, dur: 3, delay: 0 },
  { x: 12, y: 2, size: 1.5, minO: 0.1, maxO: 0.5, dur: 4, delay: 0.5 },
  { x: 20, y: 8, size: 2, minO: 0.15, maxO: 0.6, dur: 3.5, delay: 1 },
  { x: 28, y: 3, size: 1, minO: 0.2, maxO: 0.8, dur: 2.5, delay: 0.3 },
  { x: 35, y: 6, size: 1.5, minO: 0.1, maxO: 0.5, dur: 4.5, delay: 1.5 },
  { x: 42, y: 1, size: 2, minO: 0.2, maxO: 0.7, dur: 3, delay: 0.8 },
  { x: 50, y: 10, size: 1, minO: 0.15, maxO: 0.6, dur: 3.5, delay: 2 },
  { x: 55, y: 4, size: 1.5, minO: 0.1, maxO: 0.5, dur: 4, delay: 0.2 },
  { x: 62, y: 12, size: 2, minO: 0.2, maxO: 0.7, dur: 3, delay: 1.2 },
  { x: 68, y: 2, size: 1, minO: 0.15, maxO: 0.8, dur: 2.5, delay: 0.7 },
  { x: 74, y: 7, size: 1.5, minO: 0.1, maxO: 0.5, dur: 4.5, delay: 1.8 },
  { x: 80, y: 5, size: 2, minO: 0.2, maxO: 0.6, dur: 3.5, delay: 0.4 },
  { x: 85, y: 11, size: 1, minO: 0.15, maxO: 0.7, dur: 3, delay: 2.2 },
  { x: 90, y: 1, size: 1.5, minO: 0.1, maxO: 0.5, dur: 4, delay: 0.9 },
  { x: 95, y: 6, size: 2, minO: 0.2, maxO: 0.8, dur: 2.5, delay: 1.4 },
];

const CLOUDS = [
  { y: "6%", startX: "110vw", speed: 80, delay: 0, size: "w-32 h-8" },
  { y: "10%", startX: "110vw", speed: 100, delay: 15, size: "w-24 h-6" },
  { y: "4%", startX: "110vw", speed: 90, delay: 30, size: "w-40 h-10" },
  { y: "14%", startX: "110vw", speed: 70, delay: 45, size: "w-20 h-5" },
];

const FISH = [
  { y: "12%", speed: 18, delay: 0, size: 16, color: "#FFD700", dir: "right" as const },
  { y: "6%", speed: 22, delay: 4, size: 12, color: "#FF6B6B", dir: "right" as const },
  { y: "16%", speed: 15, delay: 8, size: 14, color: "#4FC3F7", dir: "left" as const },
  { y: "3%", speed: 20, delay: 12, size: 10, color: "#FFB74D", dir: "right" as const },
  { y: "20%", speed: 25, delay: 6, size: 18, color: "#81C784", dir: "left" as const },
];
