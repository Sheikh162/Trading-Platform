"use client";

import { motion } from "motion/react";
import { TradeView } from "@/src/components/TradeView";

const itemVariants: any = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export function HeroDashboardPlaceholder() {
  return (
    <div
      className="relative w-full p-px rounded-none shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden group h-[60vh] min-h-[500px] max-h-[800px]"
    >
      {/* Legendary Card Foil Shimmer Border */}
      {/* <div className="absolute -inset-full animate-[spin_6s_linear_infinite] ... opacity-70 transition-opacity duration-700" /> */}

      {/* Inner Card Container */}
      <div className="relative w-full h-full flex flex-col p-2 rounded-none bg-background/90 backdrop-blur-3xl overflow-hidden">
        {/* Aesthetic Red & Green Animated Glow */}
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-destructive/10 via-transparent to-success/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-destructive/20 rounded-full blur-[100px] -translate-y-1/2 -z-10 mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-success/20 rounded-full blur-[100px] translate-y-1/2 -z-10 mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />

        {/* Inner border highlight */}
        <div className="absolute inset-0 rounded-none glass-border pointer-events-none" />

        {/* --- DASHBOARD LIVE VIEW --- */}
        <div className="relative w-full h-full flex-1 rounded-none bg-black glass-border overflow-hidden flex flex-col pt-4">
           <TradeView market="BTC_USDT" />

           {/* Edge Vignette Fades to blend the chart cleanly into the background */}
           <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black to-transparent pointer-events-none" />
           <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-l from-black via-black/50 to-transparent pointer-events-none" />
           <div className="absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black via-black/50 to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
