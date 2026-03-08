import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { eventService } from "@/services/eventService";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import CategoryFilter from "@/components/CategoryFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Events() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("event_categories").select("*");
      return data || [];
    },
  });



  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", search, categoryId],
    queryFn: async () => {
      // For searching and category filtering, we still use the builder pattern
      // but keep it clean and consistent with the service idea.
      const query: any = supabase
        .from("events")
        .select("*, clubs(name), colleges(name), event_categories(name, color)")
        .eq("is_published", true)
        .eq("archived", false)
        .gte("end_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (categoryId) query.eq("category_id", categoryId);
      if (search) query.ilike("title", `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any) || [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black">Discover Events</h1>
          <p className="text-muted-foreground">Find hackathons, workshops, and campus events at BMSCE</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          <CategoryFilter categories={categories} selected={categoryId} onSelect={setCategoryId} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">🎪</p>
            <h3 className="text-xl font-bold">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any, index: number) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                collegeName={event.colleges?.name || "Unknown"}
                categoryName={event.event_categories?.name}
                categoryColor={event.event_categories?.color}
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
    </div>
  );
}
