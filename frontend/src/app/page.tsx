// import FeaturesSection from "../components/landing/FeatureSection";
// import HeroSection from "../components/landing/HeroSection";
import { Markets } from "../components/Markets";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* <HeroSection /> */}
      
      <section className="w-full container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold tracking-tight mb-8">Popular Markets</h2>
        <Markets />
      </section>

      {/* <FeaturesSection /> */}
    </main>
  );
}