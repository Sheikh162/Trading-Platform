import { getMarkets } from "@/src/lib/market";
import FeaturesSection from "../components/landing/FeatureSection";
import HeroSection from "../components/landing/HeroSection";
import SocialProof from "../components/landing/SocialProof";
import MarketsSection from "../components/landing/MarketsSection";
import CTASection from "../components/landing/CTASection";
import { Footer } from "../components/Footer";

export default async function LandingPage() {
  const markets = await getMarkets();

  return (
    <main className="flex min-h-screen flex-col items-center w-full bg-background text-foreground">
      <HeroSection />
      <SocialProof />
      <MarketsSection initialMarkets={markets} />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </main>
  );
}