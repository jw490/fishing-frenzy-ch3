"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface CounterDisplayProps {
  value: number;
  label: string;
  icon?: React.ReactNode;
  duration?: number;
}

export default function CounterDisplay({
  value,
  label,
  icon,
  duration = 2,
}: CounterDisplayProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString()
  );
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: "easeOut",
    });

    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded, duration]);

  return (
    <div className="text-center">
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <motion.div
        className="text-3xl md:text-4xl font-bold text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {displayValue}
      </motion.div>
      <p className="text-[#7A9BBF] mt-1 text-sm font-medium">{label}</p>
    </div>
  );
}
