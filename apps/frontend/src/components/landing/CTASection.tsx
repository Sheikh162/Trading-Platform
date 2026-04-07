"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function CTASection() {
  return (
    <section className="relative w-full py-24 md:py-32 bg-background overflow-hidden">
      {/* 4. Ambient Background Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      
      <div className="mx-auto max-w-7xl px-4 flex flex-col items-center relative z-10">

        {/* Prominent, self-contained box using primary background color */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          viewport={{ once: true }}
          className="relative w-full rounded-none bg-primary/80 glass-border text-primary-foreground px-6 py-16 md:px-16 md:py-24 text-center overflow-hidden flex flex-col items-center justify-center shadow-2xl glass-shadow-lg shadow-primary/20"
        >
          {/* Subtle Inner Highlight */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-50" />

          <h2 className="mb-6 text-4xl font-medium tracking-tighter text-balance sm:text-5xl md:text-6xl text-primary-foreground">
            Ready to start your journey?
          </h2>

          <p className="max-w-2xl text-lg text-primary-foreground/80 text-balance mb-12">
            Join thousands of traders on Vertex. Experience the speed, security, and liquidity of a professional exchange.
          </p>

          {/* Input Fields & Submit Button: Stacks on mobile, side-by-side on desktop */}
          <form className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-md relative z-10" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="h-14 w-full md:w-auto flex-1 rounded-sm bg-primary-foreground/10 border border-primary-foreground/20 px-6 text-base text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground transition-all glass-shadow-sm"
              required
            />
            {/* 6. Animated Button Shimmer */}
            <Button size="lg" variant="secondary" className="relative overflow-hidden h-14 w-full md:w-auto px-8 text-base font-medium rounded-sm group focus-visible:ring-2 focus-visible:ring-background flex-shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              <span className="relative z-10 flex items-center">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </form>

        </motion.div>
      </div>
    </section>
  );
}