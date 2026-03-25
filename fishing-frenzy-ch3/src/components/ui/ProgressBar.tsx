"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: "gold" | "teal" | "coral";
  size?: "sm" | "md" | "lg";
}

const colorStyles = {
  gold: {
    bar: "from-[#C5A200] to-[#FFD700]",
    glow: "shadow-[0_0_12px_rgba(255,215,0,0.3)]",
    text: "text-[#FFD700]",
  },
  teal: {
    bar: "from-[#00897B] to-[#00BFA6]",
    glow: "shadow-[0_0_12px_rgba(0,191,166,0.3)]",
    text: "text-[#00BFA6]",
  },
  coral: {
    bar: "from-[#D84315] to-[#FF6B6B]",
    glow: "shadow-[0_0_12px_rgba(255,107,107,0.3)]",
    text: "text-[#FF6B6B]",
  },
};

const heights = {
  sm: "h-2",
  md: "h-3",
  lg: "h-5",
};

export default function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color = "gold",
  size = "md",
}: ProgressBarProps) {
  const style = colorStyles[color];

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm text-[#A0B4CC]">{label}</span>
          )}
          {showPercentage && (
            <span className={`text-sm font-bold ${style.text}`}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-[#091A30] rounded-full overflow-hidden border border-[#1E4A7A] ${heights[size]}`}
      >
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${style.bar} ${style.glow}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
