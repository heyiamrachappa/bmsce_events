import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Sparkles, Zap, ShieldCheck, Rocket } from "lucide-react";
import { revealUp, staggerContainer, sectionReveal, cardReveal } from "@/lib/motion-variants";
import LeaderboardSection from "@/components/LeaderboardSection";

export default function Events() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all"); // Changed from categoryId to selectedCategory, default "all"

  const filterCategories = [
    { id: "all", label: "All Sectors", color: "var(--gradient-vivid)" },
    { id: "Hackathons", label: "Cyber / Tech", color: "var(--gradient-cyber)" },
    { id: "Cultural", label: "Cultural / Social", color: "var(--gradient-rose)" },
    { id: "Sports", label: "Sports / Eco", color: "var(--gradient-emerald)" },
    { id: "Workshops", label: "Workshops / Seminars", color: "var(--gradient-solar)" },
  ];

  // Removed the useQuery for event_categories as it's now hardcoded in filterCategories

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", search, selectedCategory], // Updated queryKey
    queryFn: async () => {
      let query = (supabase as any)
        .from("events")
        .select("*, clubs(name), colleges(name), event_categories(name, color)")
        .eq("is_published", true)
        .eq("archived", false)
        .gte("end_date", new Date().toISOString());

      if (selectedCategory && selectedCategory !== "all") { // Updated filtering logic
        query = query.eq("event_categories.name", selectedCategory); // Filter by category name
      }
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query.order("start_date", { ascending: true });
      if (error) throw error;
      return (data as any) || [];
    },
  });

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/30">
      {/* Dynamic Orbs - Simplified for mobile */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden sm:block">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[150px]" 
          style={{ background: filterCategories.find(c => c.id === selectedCategory)?.color || "var(--gradient-vivid)" }}
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" 
        />
      </div>

      <Navbar />

      <main className="container py-24 sm:py-32 space-y-8 sm:space-y-12 relative z-10 px-4 sm:px-6">
        {/* Page Header */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="space-y-6"
        >
          <motion.div 
            variants={revealUp}
            className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5" /> Portal Discovery
          </motion.div>
          <motion.h1 variants={revealUp} className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] font-display text-white italic uppercase">
            EXPLORE THE <br />
            <span className="text-premium-gradient hero-title-mask">GRID SYSTEM</span>
          </motion.h1>
          <motion.p variants={revealUp} className="text-muted-foreground text-sm sm:text-base md:text-xl font-medium max-w-2xl leading-relaxed">
            Access the most exclusive hackathons, cultural fests, and high-impact workshops at BMSCE.
          </motion.p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className="space-y-6 glass-panel p-6 sm:p-10 rounded-[32px] border border-white/5"
        >
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
              <Input 
                placeholder="Scan by event signature..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-12 h-16 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 text-lg font-bold text-white placeholder:text-white/20 transition-all shadow-inner" 
              />
            </div>
          </div>

          <div className="pt-2">
            {/* Replaced CategoryFilter with custom buttons */}
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
              {filterCategories.map((cat) => (
                <Button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 active:scale-95 ${
                    selectedCategory === cat.id 
                      ? "text-white shadow-lg" 
                      : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                  style={{ 
                    background: selectedCategory === cat.id ? cat.color : undefined,
                    boxShadow: selectedCategory === cat.id ? `0 10px 20px -10px ${cat.color}` : undefined
                  }}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[400px] rounded-[40px] bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 space-y-6 glass-panel rounded-[40px] border-dashed border-2 border-white/10"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl">
              📡
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">No Signals Found</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">Try re-calibrating your search parameters or category selection.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {events.map((event: any, index: number) => (
              <motion.div key={event.id} variants={cardReveal}>
                <EventCard
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  collegeName={event.colleges?.name || "BMSCE"}
                  categoryName={event.event_categories?.name}
                  categoryColor={event.event_categories?.color}
                  location={event.location}
                  startDate={event.start_date}
                  coverImageUrl={event.cover_image_url}
                  maxParticipants={event.max_participants}
                  registrationFee={event.registration_fee}
                  index={index}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Leaderboard Section */}
        <div className="pt-24">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-24" />
          <LeaderboardSection />
        </div>
      </main>
      
      {/* Footer Decoration */}
      <div className="h-40 bg-gradient-to-t from-black to-transparent pointer-events-none absolute bottom-0 left-0 right-0" />
    </div>
  );
}
