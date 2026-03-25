"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user: string;
  guild: string;
  guildColor: string;
  message: string;
  timestamp: string;
  avatar: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "1", user: "CaptainHook", guild: "Kraken Crew", guildColor: "#5C6BC0", message: "Guild Wars is going to be legendary. Kraken Crew is ready!", timestamp: "2m ago", avatar: "🎣" },
  { id: "2", user: "ReelQueen", guild: "Ocean Reapers", guildColor: "#78909C", message: "Just caught a rare Moonfish off the coast of Coral Reef zone. Anyone else seeing them spawn?", timestamp: "3m ago", avatar: "🐟" },
  { id: "3", user: "SilkRodMaster", guild: "Tidal Force", guildColor: "#FFD700", message: "Eastern waters are teeming with Goldscale right now. Rep your guild and get out there!", timestamp: "5m ago", avatar: "⚓" },
  { id: "4", user: "NordicAngler", guild: "Abyssal Lords", guildColor: "#7E57C2", message: "Who wants to run the Frozen Trench dungeon tonight? Need 3 more fishers.", timestamp: "6m ago", avatar: "🦑" },
  { id: "5", user: "BassMaster", guild: "Coral Kings", guildColor: "#FF5722", message: "Coral Kings just hit rank 3 on the leaderboard! Lets gooo 🔥", timestamp: "8m ago", avatar: "🦀" },
  { id: "6", user: "TokyoCaster", guild: "Deep Divers", guildColor: "#4FC3F7", message: "The new rod from the Chapter 3 preview looks insane. That casting range though...", timestamp: "10m ago", avatar: "🐬" },
  { id: "7", user: "PiranhaKing", guild: "Tidal Force", guildColor: "#FFD700", message: "South American waters need more representation. Any fishers from Brazil here?", timestamp: "12m ago", avatar: "⚓" },
  { id: "8", user: "ReefRider", guild: "Pearl Hunters", guildColor: "#FFCCBC", message: "Pearl Hunters recruiting! We focus on rare catches and cooperative fishing. DM me!", timestamp: "14m ago", avatar: "🐚" },
  { id: "9", user: "ArcticFrost", guild: "Ocean Reapers", guildColor: "#78909C", message: "Ice fishing mechanics are going to change everything in Guild Wars.", timestamp: "15m ago", avatar: "🦈" },
  { id: "10", user: "MedFisher", guild: "Pearl Hunters", guildColor: "#FFCCBC", message: "Just dropped my pin on the map. Mediterranean crew represent!", timestamp: "18m ago", avatar: "🐚" },
  { id: "11", user: "CaribbeanJack", guild: "Storm Chasers", guildColor: "#5C6BC0", message: "Storm Chasers spotted a whale pod near the Caribbean islands. Epic moment.", timestamp: "20m ago", avatar: "🏴‍☠️" },
  { id: "12", user: "BaliDiver", guild: "Abyssal Lords", guildColor: "#7E57C2", message: "Southeast Asian waters are underrated. So many hidden spots for rare fish.", timestamp: "22m ago", avatar: "🦑" },
];

export default function GlobalChat() {
  const [messages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // Mock — in real app would send to server
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full bg-[#091A30]/80 backdrop-blur-sm">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E4A7A]/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
          <h3 className="text-sm font-bold text-[#F0E0C0] uppercase tracking-wider">
            Global Chat
          </h3>
          <span className="text-[10px] text-[#5A7A9A] font-medium ml-1">
            {messages.length} msgs
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#5A7A9A] hover:text-[#FFD700] transition-colors cursor-pointer md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {isExpanded ? (
              <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 10 L8 6 L12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="flex-1 overflow-hidden flex flex-col min-h-0"
          >
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin"
            >
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group px-2 py-1.5 rounded-lg hover:bg-[#1A3A5C]/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-[#1A3A5C] border border-[#2A5A8A] flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {msg.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name + guild + time */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#F0E0C0]">{msg.user}</span>
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{
                            color: msg.guildColor,
                            backgroundColor: `${msg.guildColor}15`,
                            border: `1px solid ${msg.guildColor}30`,
                          }}
                        >
                          {msg.guild}
                        </span>
                        <span className="text-[9px] text-[#3A5A7A] ml-auto shrink-0">
                          {msg.timestamp}
                        </span>
                      </div>
                      {/* Message text */}
                      <p className="text-xs text-[#A0B4CC] mt-0.5 leading-relaxed break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-[#1E4A7A]/40">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Say something to the fleet..."
                  className="flex-1 bg-[#0F2847] border border-[#2A5A8A] rounded-xl px-3 py-2 text-xs text-[#F0E0C0] placeholder-[#3A5A7A] focus:outline-none focus:border-[#FFD700]/40 transition-colors"
                />
                <button
                  onClick={handleSend}
                  className="px-3 py-2 bg-gradient-to-b from-[#FFD700] to-[#D4A800] border-2 border-[#C5A200] rounded-xl cursor-pointer hover:from-[#FFE033] hover:to-[#FFD700] transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7 L13 1 L9 7 L13 13 Z" fill="#3A2600" />
                  </svg>
                </button>
              </div>
              <p className="text-[9px] text-[#3A5A7A] mt-1.5 text-center">
                Log in to chat with fishers worldwide
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
