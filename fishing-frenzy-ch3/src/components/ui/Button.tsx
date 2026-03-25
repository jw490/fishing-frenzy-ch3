"use client";

import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "gold";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const variants = {
  primary: `
    bg-gradient-to-b from-[#2B7CB8] to-[#1E5A8A]
    hover:from-[#3A8EC8] hover:to-[#2B7CB8]
    text-white border-[#1A4A70]
    shadow-[0_2px_8px_rgba(30,90,138,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]
  `,
  secondary: `
    bg-gradient-to-b from-[#1A3A5C] to-[#0F2847]
    hover:from-[#1E4A70] hover:to-[#14375E]
    text-[#A0B4CC] hover:text-white border-[#2A5A8A]
    shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
  `,
  gold: `
    bg-gradient-to-b from-[#FFD700] to-[#D4A800]
    hover:from-[#FFE033] hover:to-[#FFD700]
    text-[#3A2600] border-[#C5A200]
    shadow-[0_2px_12px_rgba(255,215,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
    font-bold
  `,
};

const sizes = {
  sm: "px-4 py-2 text-sm rounded-lg",
  md: "px-6 py-3 text-base rounded-xl",
  lg: "px-8 py-4 text-lg rounded-xl",
};

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`
        border-2 font-semibold transition-all cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
