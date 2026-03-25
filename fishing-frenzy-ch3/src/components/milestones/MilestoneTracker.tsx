"use client";

import { motion } from "framer-motion";
import Panel from "@/components/ui/Panel";
import ProgressBar from "@/components/ui/ProgressBar";
import { MapIcon, ZoneStatusIcon } from "@/components/art/decorations";
import { getIslandComponent } from "@/components/art/islands";
import { ZONES, getCurrentZone, getNextZone, getProgressToNextZone } from "@/lib/utils/zones";

interface MilestoneTrackerProps {
  totalSignups: number;
}

export default function MilestoneTracker({ totalSignups }: MilestoneTrackerProps) {
  const currentZone = getCurrentZone(totalSignups);
  const nextZone = getNextZone(totalSignups);
  const progress = getProgressToNextZone(totalSignups);

  return (
    <Panel>
      <div className="flex items-center gap-3 mb-6">
        <MapIcon size={36} />
        <div>
          <h2 className="text-2xl font-bold text-[#F0F4F8]">Community Voyage</h2>
          <p className="text-sm text-[#7A9BBF]">
            As the community grows, the ocean reveals its secrets
          </p>
        </div>
      </div>

      {/* Progress to next zone */}
      {nextZone && (
        <div className="mb-6 p-4 rounded-xl bg-[#091A30]/60 border border-[#1E4A7A]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#7A9BBF]">
              Progress to <span className="text-[#FFD700] font-semibold">{nextZone.name}</span>
            </span>
            <span className="text-sm text-[#FFD700] font-bold">
              {(nextZone.signupsRequired - totalSignups).toLocaleString()} signups away
            </span>
          </div>
          <ProgressBar progress={progress} showPercentage color="gold" size="md" />
        </div>
      )}

      {/* Zone list */}
      <div className="space-y-3">
        {ZONES.map((zone, i) => {
          const unlocked = currentZone >= zone.id;
          const isCurrent = currentZone === zone.id;
          const isNext = nextZone?.id === zone.id;
          const Island = getIslandComponent(zone.id);

          const status: "unlocked" | "current" | "next" | "locked" =
            isCurrent ? "current" : unlocked ? "unlocked" : isNext ? "next" : "locked";

          return (
            <motion.div
              key={zone.id}
              className={`
                flex items-start gap-4 p-4 rounded-xl border transition-all
                ${unlocked
                  ? "bg-[#00BFA6]/[0.04] border-[#00BFA6]/20"
                  : isNext
                    ? "bg-[#FFD700]/[0.04] border-[#FFD700]/20"
                    : "bg-[#091A30]/30 border-[#1E4A7A]/30 opacity-50"
                }
              `}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: unlocked || isNext ? 1 : 0.5, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {/* Status icon */}
              <ZoneStatusIcon status={status} size={28} />

              {/* Island art */}
              <div className={`flex-shrink-0 ${!unlocked && !isNext ? "grayscale blur-[1px]" : ""}`}>
                <Island size={50} />
              </div>

              {/* Zone info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${
                    unlocked ? "text-[#00BFA6]" : isNext ? "text-[#FFD700]" : "text-[#5A7A9A]"
                  }`}>
                    Zone {zone.id}: {zone.name}
                  </h3>
                  {isCurrent && (
                    <span className="text-[10px] bg-[#00BFA6]/20 text-[#00BFA6] px-2 py-0.5 rounded-full font-semibold">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#7A9BBF] mt-1">{zone.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-[#5A7A9A]">
                    {zone.signupsRequired === 0
                      ? "Unlocked at launch"
                      : `${zone.signupsRequired.toLocaleString()} signups`}
                  </span>
                  <span className="text-[#1E4A7A]">|</span>
                  <span className={`font-medium ${unlocked ? "text-[#00BFA6]" : "text-[#FFD700]"}`}>
                    {zone.reward}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Early bird notice */}
      <div className="mt-6 p-4 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/20">
        <div className="flex items-center gap-2 justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2 L10 6 L14 6 L11 9 L12 14 L8 11 L4 14 L5 9 L2 6 L6 6 Z" fill="#FFD700" />
          </svg>
          <p className="text-[#FFD700] font-semibold text-sm">Early Bird Bonus</p>
        </div>
        <p className="text-[#7A9BBF] text-xs mt-1 text-center">
          Sign up before a zone unlocks to receive <span className="text-[#FFD700] font-bold">2x rewards</span>!
        </p>
      </div>
    </Panel>
  );
}
