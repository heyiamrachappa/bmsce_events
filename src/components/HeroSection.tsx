import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#0A0A0B]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      {/* Background image / Overlay */}
      <div className="absolute inset-0 z-0">
        <img src="/bmsce-building.png" alt="" className="h-full w-full object-cover opacity-30 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-20">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary animate-fade-in neon-glow-purple">
            <Sparkles className="h-4 w-4" />
            <span className="tracking-widest uppercase">The Future of Campus Life</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter text-foreground animate-fade-in" style={{ animationDelay: "0.1s" }}>
            LEVEL UP YOUR
            <br />
            <span className="text-gradient-primary drop-shadow-[0_0_15px_hsla(262,83%,58%,0.5)]">CAMPUS LIFE</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg animate-fade-in font-medium leading-relaxed" style={{ animationDelay: "0.2s" }}>
            The ultimate hub for BMSCE hackathons, cultural festivals, and exclusive tech workshops.
            Join the community and make every moment count.
          </p>

          <div className="flex flex-wrap gap-6 animate-fade-in pt-4" style={{ animationDelay: "0.3s" }}>
            <Link to="/events">
              <Button size="lg" className="gradient-primary border-0 text-white font-bold h-14 px-8 shadow-glow hover:scale-105 transition-all">
                EXPLORE EVENTS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="lg" variant="outline" className="h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all">
                JOIN COMMUNITY
              </Button>
            </Link>
          </div>

          {/* Stats Section with Neon accents */}
          <div className="flex gap-12 pt-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {[
              { label: "Elite Clubs", value: "BMSCE", color: "text-purple-500" },
              { label: "Live Events", value: "200+", color: "text-blue-500" },
              { label: "Active Users", value: "10K+", color: "text-magenta-500" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className={`text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
