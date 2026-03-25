"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import WorldMap from "@/components/map/WorldMap";
import GlobalChat from "@/components/chat/GlobalChat";
import Button from "@/components/ui/Button";
import { Logo } from "@/components/art/decorations";

export default function Home() {
  const { login, authenticated } = useAuth();
  const [showHero, setShowHero] = useState(true);

  const handleAuth = () => {
    if (!authenticated) {
      login();
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* ============= HERO OVERLAY ============= */}
      {showHero && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 1 }}
          style={{ pointerEvents: "auto" }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#091A30]/85 backdrop-blur-sm" />

          {/* Hero content */}
          <motion.div
            className="relative z-10 text-center px-6 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            >
              <Logo size={64} />
            </motion.div>

            {/* Fishing Frenzy title */}
            <motion.p
              className="text-sm md:text-base text-[#FFD700] font-semibold tracking-[0.3em] uppercase mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Fishing Frenzy &middot; Chapter 3
            </motion.p>

            {/* Main headline */}
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-black text-[#F0E0C0] leading-[0.95] mb-3 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              IT&apos;S TIME
              <br />
              FOR{" "}
              <span className="text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                GUILD WARS
              </span>
            </motion.h1>

            {/* Sub text */}
            <motion.p
              className="text-base md:text-lg text-[#7A9BBF] max-w-lg mx-auto mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Drop your pin on the world map. Rally your crew.
              The seas are calling — which guild will you fight for?
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Button
                variant="gold"
                size="lg"
                className="animate-pulse-glow text-base"
                onClick={() => {
                  setShowHero(false);
                  handleAuth();
                }}
              >
                REP MY GUILD
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowHero(false)}
              >
                EXPLORE THE MAP
              </Button>
            </motion.div>

            {/* Live stats ticker */}
            <motion.div
              className="flex items-center justify-center gap-6 mt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                <span className="text-xs text-[#5A7A9A]">4,237 fishers online</span>
              </div>
              <div className="w-px h-4 bg-[#1E4A7A]" />
              <span className="text-xs text-[#5A7A9A]">8 guilds battling</span>
              <div className="w-px h-4 bg-[#1E4A7A]" />
              <span className="text-xs text-[#5A7A9A]">42 countries</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* ============= MAIN LAYOUT: MAP + CHAT ============= */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* World Map — takes most of the space */}
        <div className="flex-1 relative min-h-0">
          {/* Top bar overlay on map */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[#091A30]/90 to-transparent pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <Logo size={32} />
              <div>
                <h1 className="text-sm font-bold text-[#F0E0C0] leading-tight">
                  GUILD WARS
                </h1>
                <p className="text-[10px] text-[#FFD700] font-semibold tracking-wider uppercase">
                  Chapter 3
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
              {!authenticated && (
                <Button variant="gold" size="sm" onClick={handleAuth}>
                  REP MY GUILD
                </Button>
              )}
              {authenticated && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#1E5A8A] rounded-full flex items-center justify-center border-2 border-[#FFD700]/30 text-sm">
                    🎣
                  </div>
                </div>
              )}
            </div>
          </div>

          <WorldMap onLoginClick={handleAuth} />
        </div>

        {/* Global Chat sidebar */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-[#1E4A7A]/40 flex flex-col h-64 md:h-auto">
          <GlobalChat />
        </div>
      </div>
    </main>
  );
}
