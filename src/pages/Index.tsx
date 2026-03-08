import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AiChatBot from "@/components/AiChatBot";
import { Button } from "@/components/ui/button";
import {
  Code, Music, Trophy, BookOpen, GraduationCap, Users,
  ArrowRight, Zap
} from "lucide-react";

const categories = [
  { name: "Hackathons", icon: Code, color: "text-blue-500", glow: "neon-glow-blue" },
  { name: "Cultural", icon: Music, color: "text-purple-500", glow: "neon-glow-purple" },
  { name: "Sports", icon: Trophy, color: "text-emerald-500", glow: "neon-glow-green" },
  { name: "Workshops", icon: BookOpen, color: "text-amber-500", glow: "neon-glow-orange" },
  { name: "Seminars", icon: GraduationCap, color: "text-cyan-500", glow: "neon-glow-blue" },
  { name: "Social", icon: Users, color: "text-magenta-500", glow: "neon-glow-magenta" },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground selection:bg-primary/30 overflow-x-hidden relative">
      {/* Home background image */}
      <div className="fixed inset-0 -z-20">
        <img src="/bmsce-building.png" alt="" className="h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/95 via-[#0A0A0B]/85 to-[#0A0A0B]" />
      </div>

      <Navbar />
      <HeroSection />

      {/* Decorative Glowing Orbs */}
      <div className="fixed top-1/2 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10" />

      {/* Categories Section */}
      <section className="py-24 relative">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-xs">
                <Zap className="h-4 w-4 fill-primary" /> Multi-verse of Events
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">ELITE CATEGORIES</h2>
            </div>
            <Link to="/events" className="group flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
              VIEW ALL TRACKS <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => (
              <Link
                to="/events"
                key={cat.name}
                className={`group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/50 transition-all duration-500 animate-fade-in hover:-translate-y-2`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`p-5 rounded-2xl bg-black/40 border border-white/5 transition-all duration-500 group-hover:neon-glow-purple`}>
                  <cat.icon className={`h-8 w-8 ${cat.color}`} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Futuristic CTA */}
      <section className="py-32 relative">
        <div className="container">
          <div className="relative rounded-[3rem] bg-white/5 border border-white/10 p-12 md:p-24 overflow-hidden text-center space-y-8 hover:neon-glow-magenta transition-all duration-1000">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                UNLEASH YOUR <br />
                <span className="text-gradient-primary">POTENTIAL</span>
              </h2>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                Be part of the most vibrant student community at BMSCE.
                Discover events, win trophies, and build the future.
              </p>
              <div className="pt-4">
                <Link to="/auth?tab=signup">
                  <Button size="lg" className="gradient-primary h-16 px-12 rounded-2xl text-white font-black text-lg shadow-glow hover:scale-105 transition-all">
                    START YOUR JOURNEY <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Background elements for CTA */}
            <div className="absolute -top-24 -left-24 h-64 w-64 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 bg-accent/10 rounded-full blur-[80px]" />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="container flex flex-col items-center gap-6">
          <div className="h-12 w-12 rounded-full bg-white p-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden">
            <img src="/bmsce-logo.png" alt="BMSCE Logo" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground text-center">
            © 2026 BMSCE EVENTS · POWERED BY TECHNOLOGY
          </p>
        </div>
      </footer>

      <AiChatBot />
    </div>
  );
};

export default Index;
