import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TechStack } from "@/components/landing/TechStack";
import { CallToAction } from "@/components/landing/CallToAction";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <TechStack />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
