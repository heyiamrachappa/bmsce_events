import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin } from "lucide-react";

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
    <section className="py-20 bg-secondary/30">
      <div className="container space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black">Our College</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            All events are hosted by BMS College of Engineering
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg">{college.name}</h3>
              {college.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {college.location}
                </p>
              )}
              {college.description && (
                <p className="text-sm text-muted-foreground">{college.description}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
