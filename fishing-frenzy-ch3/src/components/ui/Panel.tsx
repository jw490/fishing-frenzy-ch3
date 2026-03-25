"use client";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "dark";
}

export default function Panel({ children, className = "", variant = "default" }: PanelProps) {
  const variants = {
    default: "bg-[#0F2847]/90 border-[#2A5A8A] shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
    highlight: "bg-[#1A3A5C]/90 border-[#FFD700]/30 shadow-[0_4px_24px_rgba(255,215,0,0.1)]",
    dark: "bg-[#091A30]/90 border-[#1E4A7A] shadow-[0_4px_24px_rgba(0,0,0,0.5)]",
  };

  return (
    <div
      className={`
        relative rounded-2xl border-2 p-6 backdrop-blur-sm
        ${variants[variant]}
        ${className}
      `}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]/20 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]/20 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]/20 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]/20 rounded-br-2xl" />
      {children}
    </div>
  );
}
