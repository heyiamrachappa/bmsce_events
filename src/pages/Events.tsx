import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Zap } from "lucide-react";
import LeaderboardSection from "@/components/LeaderboardSection";

export default function Events() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filterCategories = [
    { id: "all", label: "ALL" },
    { id: "Technical", label: "TECH" },
    { id: "Cultural,Social", label: "CULTURE" },
    { id: "Sports", label: "SPORTS" },
    { id: "Workshop,Seminar", label: "LEARN" },
  ];

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", search, selectedCategory],
    queryFn: async () => {
      const categoryHint = selectedCategory !== "all" ? "!inner" : "";
      let query = (supabase as any)
        .from("events")
        .select(`*, clubs(name), colleges(name), event_categories${categoryHint}(name, color)`)
        .eq("is_published", true)
        .eq("archived", false)
        .gte("end_date", new Date().toISOString());

      if (selectedCategory && selectedCategory !== "all") {
        const categoryNames = selectedCategory.split(",");
        if (categoryNames.length > 1) {
          query = query.in("event_categories.name", categoryNames);
        } else {
          query = query.eq("event_categories.name", selectedCategory);
        }
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
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary/30">
      <Navbar />

      <main className="container py-32 space-y-32 relative z-10 px-6">
        {/* Page Header */}
        <div className="space-y-6">
           <span className="text-[10px] font-[900] text-primary uppercase tracking-[0.4em] block">
            LIVE DISCOVERY / BMSCE HUB
          </span>
          <h1 className="text-[15vw] sm:text-[12vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-foreground">
            ALL<br />
            <span className="text-muted-foreground/60">EVENTS</span>
          </h1>
          <p className="text-xs text-muted-foreground font-[900] uppercase tracking-widest max-w-sm">
            Find what's happening on campus and register instantly.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-16">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
            <input 
              placeholder="SEARCH BY SIGNATURE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full h-24 pl-20 pr-8 bg-card border-2 border-border/50 rounded-full text-2xl font-[900] uppercase tracking-tighter placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none transition-all" 
            />
          </div>

          {/* Pill Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {filterCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-14 px-10 rounded-full font-[900] uppercase tracking-widest text-[10px] transition-all active:scale-95 ${
                  selectedCategory === cat.id 
                    ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20" 
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border-2 border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="space-y-20">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[500px] rounded-[40px] bg-card/80 border-2 border-border/50 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 gap-8 border-2 border-border/50 rounded-[60px] bg-card/20">
              <Zap className="h-24 w-24 text-muted-foreground/10" />
              <div className="text-center space-y-2">
                <h3 className="text-5xl font-[900] uppercase tracking-tighter">No events found</h3>
                <p className="text-[10px] font-[900] text-muted-foreground/60 uppercase tracking-widest">Try a different search</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
              {events.map((event: any, index: number) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  collegeName={event.colleges?.name || "BMSCE"}
                  categoryName={event.event_categories?.name}
                  location={event.location}
                  startDate={event.start_date}
                  coverImageUrl={event.cover_image_url}
                  maxParticipants={event.max_participants}
                  registrationFee={event.registration_fee}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="pt-40 border-t-2 border-border">
          <div className="mb-24 space-y-4">
            <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">RANKINGS / CLUBS</div>
            <h2 className="text-[10vw] font-[900] leading-[0.8] tracking-[-0.05em] uppercase">
              CLUB<br />
              <span className="text-muted-foreground/60">MASTERS</span>
            </h2>
          </div>
          <LeaderboardSection />
        </div>
      </main>
    </div>
  );
}
