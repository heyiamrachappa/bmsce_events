import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "./EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: string;
  title: string;
  description: string | null;
  college_name: string;
  category_name?: string;
  category_color?: string;
  location: string | null;
  start_date: string;
  cover_image_url: string | null;
  max_participants: number | null;
  registration_fee: number | null;
}

export default function EventPreview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            categories(name, color)
          `)
          .eq("status", "published")
          .order("start_date", { ascending: true })
          .limit(3) as any;

        if (error) throw error;

        const formattedEvents = data.map((event: any) => ({
          ...event,
          category_name: event.categories?.name,
          category_color: event.categories?.color,
        }));

        setEvents(formattedEvents);
      } catch (err) {
        console.error("Error fetching preview events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
    }
  };

  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={sectionVariants}
      className="py-12 md:py-24 lg:py-32 relative"
    >
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-sm px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> Upcoming Events
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter font-display leading-[0.9]">
              UPCOMING <span className="text-primary">EVENTS</span>
            </h2>
          </div>
          <div>
            <Link to="/events">
              <button className="h-14 px-8 rounded-full border-2 border-primary text-primary text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-primary hover:text-background transition-all">
                View All Events <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-6">
                <Skeleton className="h-64 w-full rounded-[32px] bg-muted" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 bg-muted" />
                  <Skeleton className="h-8 w-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                collegeName={event.college_name}
                categoryName={event.category_name}
                location={event.location}
                startDate={event.start_date}
                coverImageUrl={event.cover_image_url}
                eventType={(event as any).event_type}
                maxParticipants={event.max_participants}
                maxTeams={(event as any).max_teams}
                registrationFee={event.registration_fee}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 rounded-[40px] border-2 border-border bg-card/80">
            <p className="text-muted-foreground font-bold text-lg">No upcoming events found. Stay tuned!</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
