import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { ArrowRight, Zap, Trophy, Users, Star, Rocket } from "lucide-react";
import LeaderboardSection from "@/components/LeaderboardSection";
import EventPreview from "@/components/EventPreview";

const Index = () => {
  const { user } = useAuth();
  
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 overflow-x-hidden relative">
      <Navbar />
      <HeroSection />

      {/* ═══ The Experience Section ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="py-40 bg-white text-black"
      >
        <div className="container px-6">
          <div className="mb-24 space-y-4">
             <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">CORE CAPABILITIES</div>
             <h2 className="text-[12vw] font-[900] leading-[0.8] tracking-[-0.08em] uppercase">
                ENGINEERED<br />
                <span className="opacity-20">FOR IMPACT</span>
             </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Rocket, title: "EXPRESS", desc: "INSTANT REGISTRATION FOR ALL BMSCE EVENTS WITH YOUR STUDENT CREDENTIALS." },
              { icon: Trophy, title: "ELITE", desc: "BLOCKCHAIN-VALIDATED CERTIFICATES FOR EVERY ACHIEVEMENT YOU UNLOCK." },
              { icon: Users, title: "VANGUARD", desc: "JOIN 50+ ELITE CLUBS AND DOMINATE THE CAMPUS-WIDE LEADERBOARD." },
            ].map((feature, i) => (
              <div key={i} className="p-12 border-2 border-black/5 rounded-[40px] flex flex-col gap-8 group hover:bg-primary transition-all duration-500">
                <feature.icon className="w-12 h-12 text-primary group-hover:text-black transition-colors" />
                <h3 className="text-5xl font-[900] uppercase tracking-tighter leading-none">{feature.title}</h3>
                <p className="text-sm font-[900] uppercase tracking-widest leading-tight opacity-40 group-hover:opacity-100 transition-opacity">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ═══ Discover Events ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="py-40 bg-black"
      >
        <div className="container px-0">
          <div className="px-6 mb-24 space-y-4">
            <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">REAL-TIME FEED</div>
            <h2 className="text-[12vw] font-[900] leading-[0.8] tracking-[-0.08em] uppercase">
              LIVE<br />
              <span className="text-white/20">DISCOVERY</span>
            </h2>
          </div>
          <EventPreview />
          <div className="flex justify-center mt-32">
            <Link to="/events">
              <button className="h-24 px-16 rounded-full border-4 border-white text-white font-[900] uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all active:scale-95">
                ACCESS THE ARCHIVE
              </button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ═══ Competition Section ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="py-40 bg-white text-black"
      >
        <div className="container px-6">
          <div className="mb-24 space-y-4 text-right">
            <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">RANKINGS / CLUBS</div>
            <h2 className="text-[12vw] font-[900] leading-[0.8] tracking-[-0.08em] uppercase">
              HALL OF<br />
              <span className="opacity-20">FAME</span>
            </h2>
          </div>
          <LeaderboardSection />
        </div>
      </motion.section>

      {/* ═══ Big CTA Footer Block ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="py-40 px-6 bg-black"
      >
        <div className="bg-primary p-20 rounded-[80px] text-center flex flex-col items-center gap-12 overflow-hidden relative">
          <h2 className="text-[25vw] font-[900] leading-[0.7] tracking-[-0.08em] uppercase text-black opacity-10 absolute inset-0 flex items-center justify-center pointer-events-none">
            LEGACY
          </h2>
          <div className="relative z-10 space-y-12 max-w-5xl">
            <h2 className="text-6xl md:text-9xl font-[900] leading-[0.8] tracking-[-0.08em] uppercase text-black">
              BUILD YOUR<br />OWN STORY
            </h2>
            <p className="text-xl md:text-2xl font-[900] uppercase tracking-tighter text-black/60 max-w-2xl mx-auto leading-[0.9]">
              THE ELITE PORTAL FOR BENGALURU'S ENGINEERING ECOSYSTEM. 
              INITIALIZE YOUR VOYAGE AND ARCHIVE YOUR ACHIEVEMENTS.
            </p>
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={user ? "/dashboard" : "/auth?tab=signup"}>
                <button className="h-24 px-16 rounded-full bg-black text-white font-[900] uppercase tracking-widest text-[10px] hover:scale-[1.05] active:scale-95 transition-all shadow-4xl">
                  {user ? "OPEN COMMAND CENTER" : "INITIALIZE ACCESS"}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ Clean Footer ═══ */}
      <footer className="py-32 px-6 border-t border-white/5 font-[900] uppercase tracking-widest text-[10px]">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-12 text-white/40">
          <div className="flex items-center gap-4">
            <span className="text-white">BMSCE EVENTS<span className="text-primary">.</span></span>
            <span className="opacity-20 border-l border-white/20 pl-4">CORE SYSTEM V2.0</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12">
            <Link to="/events" className="hover:text-primary transition-colors">EVENTS</Link>
            <Link to="/verify-certificate" className="hover:text-primary transition-colors">VERIFY</Link>
            <Link to="/apply-admin" className="hover:text-primary transition-colors">CLUB ACCESS</Link>
          </div>
          <div className="text-[8px] opacity-20">© 2026 BMSCE HUB / ALL RIGHTS RESERVED</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
