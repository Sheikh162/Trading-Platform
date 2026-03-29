"use client";

import { motion } from "motion/react";
import { HeroTypography } from "./HeroTypography";
import { HeroDashboardPlaceholder } from "./HeroDashboardPlaceholder";

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-background">
      {/* Vercel-style Background Grid with fade out */}
      {/* <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:6rem_6rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" /> */}

      {/* Linear-style Bottom Whitish Gradient Fade (glowing floor transitioning to black) */}
      <div className="absolute bottom-0 left-0 right-0 h-[600px] bg-linear-to-t from-white/20 via-background/50 to-background pointer-events-none z-0" />

      {/* 1. Hero Content */}
      <div className="mx-auto max-w-7xl px-4 min-h-[95vh] flex flex-col pt-32 pb-32 relative z-10">

        <div className="w-full flex flex-col relative z-20">
          {/* --- COMPONENT 1: TEXT CONTENT --- */}
          <HeroTypography />

          {/* --- COMPONENT 2: DASHBOARD PLACEHOLDER CARD --- */}
          <div className="relative w-full mt-10">
            <HeroDashboardPlaceholder />
          </div>
        </div>
      </div>
    </section>
  );
}