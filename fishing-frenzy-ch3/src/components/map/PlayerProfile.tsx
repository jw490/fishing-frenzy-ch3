"use client";

import { motion } from "framer-motion";
import { GuildLogo } from "@/components/art/guild-logos";
import type { PlayerDot } from "./WorldMap";

interface PlayerProfileProps {
  player: PlayerDot;
  onClose: () => void;
}

export default function PlayerProfile({ player, onClose }: PlayerProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Profile card */}
      <div className="relative w-72 bg-[#0F2847]/95 border-2 border-[#2A5A8A] rounded-2xl p-5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#FFD700]/30 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#FFD700]/30 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#FFD700]/30 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#FFD700]/30 rounded-br-2xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-[#5A7A9A] hover:text-[#FFD700] transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-3 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            style={{ borderColor: player.color, backgroundColor: "#1A3A5C" }}
          >
            {player.avatar}
          </div>
          <h3 className="text-lg font-bold text-[#F0E0C0] mt-3">{player.name}</h3>
          <p className="text-xs text-[#FFD700] font-semibold tracking-wider uppercase mt-0.5">
            {player.title}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#091A30]/80 rounded-xl p-3 border border-[#1E4A7A]">
            <p className="text-[10px] text-[#5A7A9A] uppercase tracking-wider font-medium">Level</p>
            <p className="text-xl font-bold text-[#FFD700]">{player.level}</p>
          </div>
          <div className="bg-[#091A30]/80 rounded-xl p-3 border border-[#1E4A7A]">
            <p className="text-[10px] text-[#5A7A9A] uppercase tracking-wider font-medium">Catches</p>
            <p className="text-xl font-bold text-[#4FC3F7]">{(player.level * 23 + 47).toLocaleString()}</p>
          </div>
        </div>

        {/* Guild */}
        <div className="bg-[#091A30]/80 rounded-xl p-3 border border-[#1E4A7A] flex items-center gap-3">
          <GuildLogo logoId={player.guildLogoId} size={36} />
          <div>
            <p className="text-[10px] text-[#5A7A9A] uppercase tracking-wider font-medium">Guild</p>
            <p className="text-sm font-bold text-[#F0E0C0]">{player.guild}</p>
          </div>
        </div>

        {/* Action */}
        <button
          className="w-full mt-4 px-4 py-2.5 bg-gradient-to-b from-[#1A3A5C] to-[#0F2847] border-2 border-[#2A5A8A] rounded-xl text-[#A0B4CC] text-sm font-semibold hover:text-white hover:border-[#FFD700]/40 transition-all cursor-pointer"
        >
          VIEW FULL PROFILE
        </button>
      </div>
    </motion.div>
  );
}
