import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 100 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-32 pb-48 md:py-32 px-6 bg-primary overflow-hidden selection:bg-foreground selection:text-primary">
      {/* Background Label */}
      <div className="absolute top-32 left-8 pointer-events-none">
        <span className="text-[10px] font-[900] uppercase tracking-[0.4em] text-white">
          STUDENT DRIVEN / BMSCE BENGALURU
        </span>
      </div>

      <div className="container relative z-10 p-0">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-12 sm:gap-20"
        >
          {/* MASSIVE HEADLINE */}
          <motion.div variants={itemVariants} className="max-w-[100%]">
            <h1 className="text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] font-[900] leading-none md:leading-[0.8] tracking-[-0.05em] text-foreground uppercase break-words">
              BMSCE<br />
              <span className="text-background">EVENTS</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            {/* Description */}
            <motion.div variants={itemVariants} className="lg:col-span-6">
              <p className="text-xl md:text-2xl font-[900] uppercase tracking-tighter leading-[0.9] text-white max-w-lg">
                YOUR ONE-STOP PLATFORM FOR FESTS, HACKATHONS, WORKSHOPS, AND EVERYTHING HAPPENING AT BMSCE.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="lg:col-span-6 flex flex-col sm:flex-row gap-4 lg:justify-end">
              <Link to="/events" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto h-16 md:h-20 px-8 md:px-12 rounded-full bg-background text-foreground font-[900] uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 transition-all hover:scale-[1.05] active:scale-95 shadow-2xl shadow-black/20">
                  Browse Events <ArrowRight className="w-5 h-5 stroke-[4]" />
                </button>
              </Link>
              <Link to="/auth?tab=signup" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto h-16 md:h-20 px-8 md:px-12 rounded-full border-4 border-black bg-transparent text-background font-[900] uppercase tracking-widest text-[10px] flex items-center justify-center transition-all hover:bg-background hover:text-foreground active:scale-95">
                  Sign Up
                </button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Extreme Bottom Stats or Strips */}
      <div className="absolute bottom-8 left-0 right-0 hidden md:flex flex-wrap justify-between px-8 pointer-events-none opacity-40">
        <span className="font-[900] text-[10px] uppercase tracking-widest text-foreground">250+ EVENTS</span>
        <span className="font-[900] text-[10px] uppercase tracking-widest text-foreground">12K+ STUDENTS</span>
        <span className="font-[900] text-[10px] uppercase tracking-widest text-foreground">SINCE 2024</span>
      </div>
    </section>
  );
}
