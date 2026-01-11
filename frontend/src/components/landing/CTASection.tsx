"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4 mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card/50 px-6 py-16 md:px-16 md:py-24 text-center overflow-hidden"
        >
          {/* Background Gradient Blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to start your journey?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Join thousands of traders on Vertex. Experience the speed, security, and liquidity of a professional exchange.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/trade/TATA_INR" passHref>
              <Button size="lg" className="h-12 px-8 text-lg rounded-full w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/markets" passHref>
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg rounded-full w-full sm:w-auto group">
                View Markets
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}