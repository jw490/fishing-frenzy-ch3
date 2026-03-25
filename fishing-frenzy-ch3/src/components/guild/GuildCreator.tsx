"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { GuildLogo, GUILD_LOGO_NAMES } from "@/components/art/guild-logos";

interface GuildCreatorProps {
  onSubmit: (data: { name: string; logoId: number }) => Promise<void>;
  onCancel: () => void;
}

export default function GuildCreator({ onSubmit, onCancel }: GuildCreatorProps) {
  const [name, setName] = useState("");
  const [logoId, setLogoId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Guild name is required");
      return;
    }
    if (name.length < 3 || name.length > 24) {
      setError("Guild name must be 3-24 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit({ name: name.trim(), logoId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create guild");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel variant="highlight" className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-[#F0F4F8] mb-1">Create Your Guild</h2>
      <p className="text-[#7A9BBF] text-sm mb-6">
        Choose a name and emblem for your fleet
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Guild Name */}
        <div>
          <label className="block text-sm font-medium text-[#A0B4CC] mb-2">
            Guild Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter guild name..."
            maxLength={24}
            className="w-full px-4 py-3 bg-[#091A30] border-2 border-[#1E4A7A] rounded-xl
                       text-[#F0F4F8] placeholder-[#5A7A9A]
                       focus:outline-none focus:border-[#FFD700]/60 focus:shadow-[0_0_12px_rgba(255,215,0,0.1)]
                       transition-all"
          />
          <p className="text-xs text-[#5A7A9A] mt-1">{name.length}/24 characters</p>
        </div>

        {/* Logo Picker */}
        <div>
          <label className="block text-sm font-medium text-[#A0B4CC] mb-2">
            Guild Emblem
          </label>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((id) => (
              <motion.button
                key={id}
                type="button"
                onClick={() => setLogoId(id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex flex-col items-center p-2 rounded-xl border-2 cursor-pointer transition-all
                  ${logoId === id
                    ? "border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                    : "border-[#1E4A7A] bg-[#091A30]/60 hover:border-[#2A5A8A]"
                  }
                `}
              >
                <GuildLogo logoId={id} size={32} />
                <span className="text-[9px] text-[#7A9BBF] mt-0.5">{GUILD_LOGO_NAMES[id - 1]}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl bg-[#091A30]/60 border border-[#1E4A7A]">
          <p className="text-xs text-[#5A7A9A] mb-3 font-medium">Preview</p>
          <div className="flex items-center gap-3">
            <GuildLogo logoId={logoId} size={48} />
            <div>
              <p className="text-lg font-bold text-[#F0F4F8]">
                {name || "Your Guild Name"}
              </p>
              <p className="text-xs text-[#7A9BBF]">1/7 members · 0 fleet power</p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-[#FF6B6B] text-sm font-medium">{error}</p>
        )}

        <div className="flex gap-3">
          <Button variant="gold" size="md" type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Guild"}
          </Button>
          <Button variant="secondary" size="md" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
