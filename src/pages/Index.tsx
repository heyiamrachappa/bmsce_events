import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import {
  Code, Music, Trophy, BookOpen, GraduationCap, Users,
  ArrowRight, Zap, Sparkles, Star, Rocket, ShieldCheck
} from "lucide-react";
import LeaderboardSection from "@/components/LeaderboardSection";
import EventPreview from "@/components/EventPreview";
import ClubHighlights from "@/components/ClubHighlights";

const categories = [
  { name: "Hackathons", icon: Code, color: "var(--gradient-cyber)", iconColor: "text-[#22d3ee]", glow: "var(--glow-cyber)" },
  { name: "Cultural", icon: Music, color: "var(--gradient-rose)", iconColor: "text-[#D946EF]", glow: "var(--glow-rose)" },
  { name: "Sports", icon: Trophy, color: "var(--gradient-emerald)", iconColor: "text-[#10b981]", glow: "var(--glow-emerald)" },
  { name: "Workshops", icon: BookOpen, color: "var(--gradient-solar)", iconColor: "text-[#f59e0b]", glow: "var(--glow-solar)" },
  { name: "Seminars", icon: GraduationCap, color: "var(--gradient-solar)", iconColor: "text-[#fbbf24]", glow: "var(--glow-solar)" },
  { name: "Social", icon: Users, color: "var(--gradient-rose)", iconColor: "text-[#fb7185]", glow: "var(--glow-rose)" },
];

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
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 overflow-x-hidden relative">
      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Decorative Blur Orbs - Simplified for mobile */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden sm:block">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/3 -left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[180px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.1, 0.03] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" 
        />
      </div>

      <Navbar />
      <HeroSection />
      <EventPreview />

      {/* ═══ Why Choose Us Section ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="py-24 sm:py-40 relative border-y border-white/5 bg-white/[0.01]"
      >
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              { icon: Rocket, title: "EXPRESS ACCESS", desc: "Instant registration for all BMSCE events with your student credentials." },
              { icon: ShieldCheck, title: "ELITE CLEARANCE", desc: "Blockchain-validated certificates for every achievement you unlock on the grid." },
              { icon: Star, title: "VANGUARD PRIDE", desc: "Join 50+ elite clubs and dominate the campus-wide leaderboard." },
            ].map((feature, i) => (
              <div key={i} className="space-y-8 text-center md:text-left group">
                <div className="w-20 h-20 rounded-[24px] bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto md:mx-0 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-700 shadow-inner">
                  <feature.icon className="w-10 h-10 text-primary group-hover:text-white transition-colors duration-500" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black tracking-tight text-white uppercase font-display">{feature.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ═══ Categories Section ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="py-24 sm:py-40 relative"
      >
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-24 gap-8 sm:gap-12 text-center md:text-left">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px] px-6 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 fill-primary" /> Browse by Category
              </div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter font-display leading-[0.85]">
                EVENT <span className="text-premium-gradient hero-title-mask">TRACKS</span>
              </h2>
            </div>
            <div>
              <Link to="/events" className="group flex items-center gap-3 text-[10px] font-black text-muted-foreground hover:text-white transition-all uppercase tracking-[0.3em] border border-white/10 px-8 py-4 rounded-2xl hover:bg-white/5 active:scale-95">
                ACCESS HUB <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to="/events"
                className={`group relative flex flex-col items-center gap-8 p-10 rounded-[32px] glass-panel border border-white/5 hover:border-white/15 overflow-hidden active:scale-95 transition-all duration-500`}
              >
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-lg" style={{ boxShadow: `0 0 20px -5px ${cat.glow}` }}>
                  <cat.icon className={`h-12 w-12 ${cat.iconColor} drop-shadow-[0_0_15px_currentColor]`} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-center text-muted-foreground group-hover:text-white transition-colors">{cat.name}</span>
                
                <div className={`absolute bottom-0 left-0 right-0 h-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} style={{ background: cat.color }} />
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ═══ Leaderboard Preview ═══ */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10 transform translate-y-1/2" />
        <LeaderboardSection />
      </motion.div>

      <ClubHighlights />

      {/* ═══ CTA Section ═══ */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
        className="py-48 relative"
      >
        <div className="container">
          <div className="relative rounded-[50px] glass-panel p-16 md:p-40 overflow-hidden text-center border border-white/10 shadow-3xl">
            {/* Animated Glow in background */}
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-primary/5 rounded-full blur-[180px] pointer-events-none" 
            />

            <div className="relative z-10 max-w-4xl mx-auto space-y-16">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-8 py-3 text-[10px] font-black text-primary uppercase tracking-[0.4em] mx-auto shadow-glow">
                <Sparkles className="h-4 w-4" /> Ready for Deployment
              </div>
              <h2 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] font-display text-white italic uppercase">
                OWN YOUR <br />
                <span className="text-premium-gradient hero-title-mask">LEGACY</span>
              </h2>
              <p className="text-muted-foreground text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
                Ready to redefine your campus life? Join the strongest student 
                network at BMSCE and build something extraordinary today.
              </p>
              <div className="pt-8">
                <Link to={user ? "/dashboard" : "/auth?tab=signup"}>
                  <Button className="btn-vivid h-24 px-20 text-xl font-black uppercase tracking-[0.2em] rounded-[32px] gap-6 group">
                    {user ? "ACCESS CONSOLE" : "INITIALIZE VOYAGE"} 
                    <ArrowRight className="h-8 w-8 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ Footer ═══ */}
      <footer className="relative border-t border-white/5 py-32 bg-background/50 backdrop-blur-xl">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[24px] bg-white p-3 shadow-2xl flex items-center justify-center border border-white/20">
              <img src="/bmsce-logo.png" alt="BMSCE" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black tracking-tighter text-white font-display uppercase leading-none">BMSCE.</span>
              <span className="text-[10px] uppercase font-black text-primary tracking-[0.5em] mt-1">Elite Portal</span>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em]">
            <Link to="/events" className="hover:text-primary transition-colors">Discover</Link>
            <Link to="/verify-certificate" className="hover:text-primary transition-colors">Verification</Link>
            <Link to="/apply-admin" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>

          <div className="text-center md:text-right space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 italic">
              ENGINEERED FOR THE ELITE
            </p>
            <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
              © 2026 BMSCE HUB · ALL SYSTEMS ACTIVE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
