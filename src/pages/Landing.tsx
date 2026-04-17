import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Hero from "../components/sections/Hero";
import HowItWorks from "../components/sections/HowItWorks";
import Placas from "../components/sections/Placas";
import FAQ from "../components/sections/FAQ";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#1A1A14] text-[#F5F0E8]">
      <Header />
      <main id="inicio">
        <Hero />
        <HowItWorks />
        <Placas />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
