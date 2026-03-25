"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { GuildLogo } from "@/components/art/guild-logos";

interface GuildEntry {
  id: string;
  name: string;
  slug: string;
  logo_id: number;
  member_count: number;
  fleet_power: number;
  referral_count: number;
}

interface GuildBrowserProps {
  guilds: GuildEntry[];
  onJoinRequest: (guildId: string) => Promise<void>;
  onBack: () => void;
}

export default function GuildBrowser({ guilds, onJoinRequest, onBack }: GuildBrowserProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [requesting, setRequesting] = useState<string | null>(null);

  const filtered = guilds
    .filter((g) => {
      if (filter === "open" && g.member_count >= 7) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.fleet_power - a.fleet_power);

  const handleJoin = async (guildId: string) => {
    setRequesting(guildId);
    try {
      await onJoinRequest(guildId);
    } finally {
      setRequesting(null);
    }
  };

  return (
    <Panel className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F0F4F8]">Find a Guild</h2>
          <p className="text-sm text-[#7A9BBF]">Join an existing crew</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guilds..."
          className="flex-1 px-4 py-2.5 bg-[#091A30] border-2 border-[#1E4A7A] rounded-xl
                     text-[#F0F4F8] placeholder-[#5A7A9A] text-sm
                     focus:outline-none focus:border-[#FFD700]/60 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]
                     transition-all"
        />
        <div className="flex rounded-xl border-2 border-[#1E4A7A] overflow-hidden">
          <button
            onClick={() => setFilter("open")}
            className={`px-3 py-2 text-sm cursor-pointer transition-all font-medium ${
              filter === "open"
                ? "bg-gradient-to-b from-[#FFD700] to-[#D4A800] text-[#3A2600]"
                : "bg-[#091A30] text-[#7A9BBF] hover:text-[#A0B4CC]"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 text-sm cursor-pointer transition-all font-medium ${
              filter === "all"
                ? "bg-gradient-to-b from-[#FFD700] to-[#D4A800] text-[#3A2600]"
                : "bg-[#091A30] text-[#7A9BBF] hover:text-[#A0B4CC]"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Guild List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map((guild, i) => {
          const isFull = guild.member_count >= 7;

          return (
            <motion.div
              key={guild.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#091A30]/50 border border-[#1E4A7A]/50
                         hover:border-[#2A5A8A] hover:bg-[#14375E]/30 transition-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GuildLogo logoId={guild.logo_id} size={40} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#F0F4F8] truncate">{guild.name}</h3>
                <p className="text-xs text-[#7A9BBF]">
                  {guild.member_count}/7 members · {guild.fleet_power} power
                </p>
              </div>

              {isFull ? (
                <span className="text-xs text-[#5A7A9A] bg-[#091A30] px-3 py-1.5 rounded-lg border border-[#1E4A7A]/50 font-medium">
                  Full
                </span>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleJoin(guild.id)}
                  disabled={requesting === guild.id}
                >
                  {requesting === guild.id ? "..." : "Join"}
                </Button>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[#7A9BBF]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3">
              <circle cx="20" cy="20" r="14" stroke="#5A7A9A" strokeWidth="2" fill="none" />
              <line x1="30" y1="30" x2="40" y2="40" stroke="#5A7A9A" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="font-medium">No guilds found. Try a different search or create your own!</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
