import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Trophy, Users, Star, ChevronRight } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const num = parseInt(target.replace(/\D/g, ""));
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2500;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * num));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [num]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden bg-background">
      {/* Premium Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px]" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] bg-accent/20 rounded-full blur-[130px]" 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="container relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center lg:text-left lg:mx-0"
        >
          {/* Elite Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-panel border border-white/10 mb-8 mx-auto lg:mx-0">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center p-1">
                  <Star className="w-full h-full text-yellow-500 fill-yellow-500" />
                </div>
              ))}
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">TRUSTED BY 50+ BMSCE CLUBS</span>
          </motion.div>

          {/* Main Headline */}
          <motion.div variants={itemVariants} className="space-y-4 mb-8">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter text-white font-display">
              MASTER THE <br />
              <span className="text-premium-gradient hero-title-mask drop-shadow-[0_0_40px_hsla(262,83%,58%,0.3)]">
                CAMPUS VIBE
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl font-medium leading-relaxed mb-12 mx-auto lg:mx-0"
          >
            The ultimate ecosystem for BMSCE hackathons, cultural fests, and tech workshops. 
            Join the elite circle, compete in global stages, and build your legacy today.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 mb-20 justify-center lg:justify-start">
            <Link to="/events">
              <Button className="btn-vivid h-16 px-10 rounded-2xl text-base font-black uppercase tracking-wider gap-3 shadow-2xl">
                Explore Universe <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button variant="outline" className="btn-outline-vivid h-16 px-10 rounded-2xl text-base font-bold text-white shadow-xl hover:bg-white/[0.05]">
                Join Revolutionary Community
              </Button>
            </Link>
          </motion.div>

          {/* Impact Stats */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 pt-12 border-t border-white/5"
          >
            {[
              { label: "Elite Clubs", value: "BMSCE", icon: Trophy, color: "text-purple-400" },
              { label: "Grand Events", value: "250+", icon: Zap, color: "text-cyan-400" },
              { label: "Active Lions", value: "12K+", icon: Users, color: "text-pink-400" },
            ].map((stat, i) => (
              <div key={stat.label} className="group">
                <div className="flex items-center gap-4 mb-2 justify-center lg:justify-start">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 group-hover:scale-110 transition-transform duration-500">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-none">
                      {stat.value.includes('+') || stat.value.includes('K') 
                        ? <AnimatedCounter target={stat.value} suffix={stat.value.includes('+') ? '+' : stat.value.includes('K') ? 'K+' : ''} />
                        : stat.value
                      }
                    </h3>
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 pl-[12px] lg:pl-[68px] text-center lg:text-left">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative floating elements */}
      <AnimatePresence>
        {!shouldReduceMotion && (
          <>
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[20%] right-[10%] w-32 h-32 glass-panel rounded-3xl opacity-20 hidden xl:block"
            />
            <motion.div
              animate={{
                y: [0, 30, 0],
                rotate: [0, -10, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] left-[5%] w-24 h-24 glass-panel rounded-full opacity-10 hidden xl:block"
            />
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
