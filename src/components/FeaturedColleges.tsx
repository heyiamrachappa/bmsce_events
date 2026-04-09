import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cardReveal } from "@/lib/motion-variants";

export default function FeaturedColleges() {
  const { data: college } = useQuery({
    queryKey: ["bmsce-college"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("*")
        .eq("slug", "bmsce")
        .single();
      return data;
    },
  });

  if (!college) return null;

  return (
    <section className="py-24 relative">
      <div className="container space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight">Our <span className="text-gradient-primary">College</span></h2>
          <p className="text-muted-foreground/70 max-w-md mx-auto font-medium">
            All events are hosted by BMS College of Engineering
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={cardReveal}
          >
            <Card className="glass-card rounded-2xl card-shine">
              <CardContent className="p-7 space-y-4">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <Building2 className="h-7 w-7 text-foreground" />
                </div>
                <h3 className="font-black text-xl font-display">{college.name}</h3>
                {college.location && (
                  <p className="text-sm text-muted-foreground/60 flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3 w-3 text-cyan-400" />
                    {college.location}
                  </p>
                )}
                {college.description && (
                  <p className="text-base text-muted-foreground/70 font-medium leading-relaxed">{college.description}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
