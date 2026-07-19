"use client";

import { motion } from "framer-motion";

export function ShaderGradient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 opacity-40 dark:opacity-20"
      >
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] animate-blob rounded-full bg-blue-400/30 mix-blend-multiply blur-[120px] filter" />
        <div className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] animate-blob rounded-full bg-purple-400/30 mix-blend-multiply blur-[120px] filter" style={{ animationDelay: "2s" }} />
        <div className="absolute -bottom-[10%] left-[20%] h-[50%] w-[50%] animate-blob rounded-full bg-indigo-400/30 mix-blend-multiply blur-[120px] filter" style={{ animationDelay: "4s" }} />
      </motion.div>
    </div>
  );
}
