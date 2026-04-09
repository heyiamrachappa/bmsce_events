import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Users, Zap, Star, Trophy, Code, Music } from "lucide-react";

interface Club {
  id: string;
  name: string;
  category: string;
}

const categoryIcons: Record<string, any> = {
  Technical: Code,
  Cultural: Music,
  Sports: Trophy,
  Social: Users,
  Other: Zap
};

const categoryColors: Record<string, string> = {
  Technical: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Cultural: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sports: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Social: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  Other: "text-amber-400 bg-amber-500/10 border-amber-500/20"
};

export default function ClubHighlights() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClubs() {
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select("*")
          .limit(8);

        if (error) throw error;
        setClubs(data || []);
      } catch (err) {
        console.error("Error fetching clubs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchClubs();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
    }
  };

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-sm px-5 py-2 rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-4 w-4" /> The Power of Community
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter font-display leading-[0.9] text-foreground">
            BMSCE <span className="text-premium-gradient">VANGUARD</span>
          </h2>
          <p className="text-muted-foreground/80 font-medium text-lg">
            Home to 50+ elite student organizations. From cutting-edge tech to 
            pulsating cultural troupes, find your tribe and lead the way.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-40 rounded-[32px] bg-card animate-pulse border border-border/50" />
            ))}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {clubs.map((club) => {
              const Icon = categoryIcons[club.category] || Zap;
              const colors = categoryColors[club.category] || categoryColors.Other;
              
              return (
                <motion.div
                  key={club.id}
                  variants={itemVariants}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group relative p-8 rounded-[32px] glass-card-premium border border-border/50 hover:border-primary/30 transition-all duration-500 cursor-default"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-all duration-500 group-hover:scale-110 ${colors}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground leading-tight mb-2 line-clamp-2">
                    {club.name}
                  </h3>
                  <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors group-hover:text-primary">
                    {club.category}
                  </span>
                  
                  {/* Subtle hover effect */}
                  <div className="absolute inset-x-8 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="mt-20 text-center">
          <Link to="/auth?tab=signup">
            <Button variant="outline" className="btn-outline-vivid h-16 px-12 rounded-2xl text-sm font-black uppercase tracking-[0.2em] gap-3">
              Explore All 50+ Clubs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[600px] bg-primary/5 blur-[150px] -z-10 rounded-full" />
    </section>
  );
}
