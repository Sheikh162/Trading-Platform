import { Markets } from "@/src/components/Markets";
import FeaturesSection from "../components/landing/FeatureSection";
import HeroSection from "../components/landing/HeroSection";
import CTASection from "../components/landing/CTASection";
import { Footer } from "../components/Footer";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center w-full bg-background text-foreground">
      <HeroSection />
      <div className="w-full bg-card/30 border-y border-border backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
           <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold tracking-tight">Today's Markets</h2>
              <p className="text-muted-foreground text-sm">
                Real-time price data from the Vertex matching engine.
              </p>
           </div>
           <Markets />
        </div>
      </div>
      <FeaturesSection />
      <CTASection/>
      <Footer/>
    </main>
  );
}