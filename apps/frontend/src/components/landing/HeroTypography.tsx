"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

const itemVariants: any = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

export function HeroTypography() {
  return (
    <div className="flex flex-col items-start text-left max-w-4xl mb-16 pt-24">
      {/* H1 - Massive, tight tracking, fluid balance */}
      <h1 className="text-6xl font-medium tracking-tighter sm:text-7xl md:text-7xl bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-transparent drop-shadow-sm pb-2">
        Trade at the Speed of Light.
      </h1>

      {/* Subtext */}
      <p className="mt-8 max-w-2xl text-xl text-muted-foreground sm:text-lg leading-relaxed font-light">
        The world’s most performant matching engine. Zero latency, deep liquidity.
      </p>

    </div>
  );
}
