"use client";

import { motion } from "framer-motion";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { GuildLogo } from "@/components/art/guild-logos";
import { CrewBoat, EmptySlotBoat, getBoatComponent } from "@/components/art/boats";
import { SmallFish } from "@/components/art/decorations";
import { getFlagshipTier, REFERRAL_REWARDS } from "@/lib/utils/fleet";

interface GuildData {
  id: string;
  name: string;
  slug: string;
  logo_id: number;
  member_count: number;
  fleet_power: number;
  referral_count: number;
}

interface FleetDashboardProps {
  guild: GuildData;
  userReferralCount: number;
}

function FleetVisualization({ memberCount, referralCount }: { memberCount: number; referralCount: number }) {
  const flagship = getFlagshipTier(referralCount);
  const FlagshipBoat = getBoatComponent(flagship.name);

  return (
    <div className="relative bg-gradient-to-b from-[#14375E]/60 to-[#091A30]/80 rounded-xl p-6 border border-[#1E4A7A] overflow-hidden">
      {/* Animated water background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute bottom-0 w-[200%] h-16 opacity-20"
          animate={{ x: [0, "-50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 2880 60" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,30 C240,45 480,15 720,30 C960,45 1200,15 1440,30 C1680,45 1920,15 2160,30 C2400,45 2640,15 2880,30 L2880,60 L0,60 Z"
              fill="rgba(30, 90, 138, 0.4)"
            />
          </svg>
        </motion.div>
        {/* Subtle fish */}
        <motion.div
          className="absolute bottom-4 opacity-20"
          animate={{ x: ["-20px", "calc(100% + 20px)"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <SmallFish size={14} color="#7EC8E3" />
        </motion.div>
      </div>

      {/* Fleet */}
      <div className="relative flex items-end justify-center gap-4 min-h-[130px]">
        {/* Flagship */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <FlagshipBoat size={56} className="drop-shadow-lg" />
          </motion.div>
          <span className="text-[10px] text-[#FFD700] mt-1 font-medium">{flagship.name}</span>
        </motion.div>

        {/* Member boats */}
        {Array.from({ length: memberCount - 1 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.12 }}
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.3 }}
            >
              <CrewBoat size={36} index={i} className="drop-shadow-md" />
            </motion.div>
            <span className="text-[10px] text-[#7A9BBF] mt-1">Crew {i + 1}</span>
          </motion.div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: 7 - memberCount }).map((_, i) => (
          <motion.div
            key={`empty-${i}`}
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (memberCount + i) * 0.12 }}
          >
            <EmptySlotBoat size={36} />
            <span className="text-[10px] text-[#5A7A9A] mt-1">Empty</span>
          </motion.div>
        ))}
      </div>

      <p className="relative text-center text-[#7A9BBF] text-sm mt-4 font-medium">
        {memberCount}/7 crew members aboard
        {memberCount < 7 && (
          <span className="text-[#FFD700]"> — {7 - memberCount} spots open!</span>
        )}
      </p>
    </div>
  );
}

export default function FleetDashboard({ guild, userReferralCount }: FleetDashboardProps) {
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/guild/${guild.slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      `Join my guild "${guild.name}" in Fishing Frenzy Chapter 3!`
    );
    const url = encodeURIComponent(inviteLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `I'm building my fleet in @FishingFrenzyCo Chapter 3! Join my guild "${guild.name}"\n\n${inviteLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <Panel variant="highlight" className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GuildLogo logoId={guild.logo_id} size={48} />
        <div>
          <h2 className="text-2xl font-bold text-[#F0F4F8]">{guild.name}</h2>
          <p className="text-[#7A9BBF] text-sm">
            Fleet Power: <span className="text-[#FFD700] font-semibold">{guild.fleet_power}</span>
          </p>
        </div>
      </div>

      {/* Fleet */}
      <FleetVisualization
        memberCount={guild.member_count}
        referralCount={userReferralCount}
      />

      {/* Invite */}
      <div className="mt-6 space-y-3">
        <p className="text-sm text-[#7A9BBF] font-medium">Invite friends to grow your fleet:</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="gold" size="sm" onClick={copyLink}>
            Copy Invite Link
          </Button>
          <Button variant="secondary" size="sm" onClick={shareToTelegram}>
            Telegram
          </Button>
          <Button variant="secondary" size="sm" onClick={shareToTwitter}>
            Twitter / X
          </Button>
        </div>
      </div>

      {/* Referral Progress */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-[#F0F4F8] mb-3">Referral Rewards</h3>
        <div className="space-y-2">
          {REFERRAL_REWARDS.map((tier) => {
            const unlocked = userReferralCount >= tier.count;
            const progress = unlocked ? 100 : Math.min(100, (userReferralCount / tier.count) * 100);

            return (
              <div
                key={tier.count}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  unlocked
                    ? "border-[#FFD700]/30 bg-[#FFD700]/[0.04]"
                    : "border-[#1E4A7A]/50 bg-[#091A30]/40"
                }`}
              >
                <div className="flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    {unlocked ? (
                      <><circle cx="12" cy="12" r="10" fill="#00BFA6" opacity="0.2" stroke="#00BFA6" strokeWidth="1.5" />
                      <path d="M7 12 L10 15 L17 8" stroke="#00BFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>
                    ) : (
                      <><circle cx="12" cy="12" r="10" fill="none" stroke="#5A7A9A" strokeWidth="1.5" />
                      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#5A7A9A" fontWeight="bold">{tier.count}</text></>
                    )}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${unlocked ? "text-[#FFD700]" : "text-[#A0B4CC]"}`}>
                    {tier.count} referral{tier.count > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[#5A7A9A]">{tier.reward}</p>
                </div>
                {!unlocked && (
                  <span className="text-xs text-[#5A7A9A] font-medium">
                    {tier.count - userReferralCount} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
