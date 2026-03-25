"use client";

import { motion } from "framer-motion";
import Panel from "@/components/ui/Panel";
import { GuildLogo } from "@/components/art/guild-logos";
import { TrophyIcon, RankBadge } from "@/components/art/decorations";
import { CrewBoat } from "@/components/art/boats";

interface GuildEntry {
  id: string;
  name: string;
  slug: string;
  logo_id: number;
  member_count: number;
  fleet_power: number;
  referral_count: number;
  rank: number;
}

interface LeaderboardTableProps {
  guilds: GuildEntry[];
  onGuildClick?: (guildSlug: string) => void;
}

function MiniFleet({ memberCount }: { memberCount: number }) {
  return (
    <div className="flex gap-0 items-end">
      {Array.from({ length: Math.min(memberCount, 7) }).map((_, i) => (
        <CrewBoat key={i} size={16} index={i} />
      ))}
    </div>
  );
}

export default function LeaderboardTable({ guilds, onGuildClick }: LeaderboardTableProps) {
  return (
    <Panel variant="default">
      <div className="flex items-center gap-3 mb-6">
        <TrophyIcon size={36} />
        <div>
          <h2 className="text-2xl font-bold text-[#F0F4F8]">Top Guilds</h2>
          <p className="text-sm text-[#7A9BBF]">Ranked by Fleet Power</p>
        </div>
      </div>

      <div className="space-y-2">
        {guilds.map((guild, i) => {
          const isTop3 = guild.rank <= 3;

          return (
            <motion.div
              key={guild.id}
              className={`
                flex items-center gap-3 p-3 md:p-4 rounded-xl cursor-pointer
                transition-all border
                ${isTop3
                  ? "bg-[#FFD700]/[0.04] border-[#FFD700]/20 hover:bg-[#FFD700]/[0.08]"
                  : "bg-[#091A30]/50 border-[#1E4A7A]/50 hover:bg-[#14375E]/40 hover:border-[#2A5A8A]"
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onGuildClick?.(guild.slug)}
              whileHover={{ x: 4 }}
            >
              <RankBadge rank={guild.rank} size={32} />

              <GuildLogo logoId={guild.logo_id} size={36} />

              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold truncate ${isTop3 ? "text-[#FFD700]" : "text-[#F0F4F8]"}`}>
                  {guild.name}
                </h3>
                <p className="text-xs text-[#7A9BBF]">
                  {guild.member_count}/7 members · {guild.referral_count} referrals
                </p>
              </div>

              <div className="hidden md:flex">
                <MiniFleet memberCount={guild.member_count} />
              </div>

              <div className="text-right min-w-[60px]">
                <p className={`text-lg font-bold ${isTop3 ? "text-[#FFD700]" : "text-[#A0B4CC]"}`}>
                  {guild.fleet_power}
                </p>
                <p className="text-[10px] text-[#5A7A9A]">power</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {guilds.length === 0 && (
        <div className="text-center py-12 text-[#7A9BBF]">
          <div className="flex justify-center mb-3">
            <CrewBoat size={48} index={0} />
          </div>
          <p className="font-medium">No guilds yet. Be the first to set sail!</p>
        </div>
      )}
    </Panel>
  );
}
