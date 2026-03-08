import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, IndianRupee, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { slideUp, cardHover } from "@/lib/motion-variants";

interface EventCardProps {
  id: string;
  title: string;
  description?: string | null;
  collegeName: string;
  categoryName?: string;
  categoryColor?: string;
  location?: string | null;
  startDate: string;
  coverImageUrl?: string | null;
  maxParticipants?: number | null;
  registrationFee?: number | null;
  index?: number;
}

export default function EventCard({
  id, title, description, collegeName, categoryName, categoryColor,
  location, startDate, coverImageUrl, maxParticipants, registrationFee,
  index = 0,
}: EventCardProps) {
  const navigate = useNavigate();
  const isFree = !registrationFee || registrationFee === 0;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? { animate: { opacity: 1 } } : slideUp}
      initial={shouldReduceMotion ? "animate" : "initial"}
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: shouldReduceMotion ? 0 : index * 0.05 }}
    >
      <Card
        className="group relative overflow-hidden bg-white/5 border-white/10 hover:border-primary/50 transition-all duration-500 cursor-pointer shadow-none"
        onClick={() => navigate(`/events/${id}`)}
      >
        <motion.div
          className="relative h-56 overflow-hidden"
          whileHover={shouldReduceMotion ? undefined : "hover"}
          variants={cardHover}
        >
          {coverImageUrl ? (
            <motion.img
              src={coverImageUrl}
              alt={title}
              className="h-full w-full object-cover"
              variants={{
                hover: { scale: 1.05, transition: { duration: 0.6 } }
              }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary/40" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-soft"
            >
              View Details <ArrowRight className="h-3 w-3" />
            </motion.div>
          </div>

          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {categoryName && (
              <Badge className="text-[10px] font-black uppercase tracking-tighter border-0 neon-glow-blue px-3 py-1"
                style={{ backgroundColor: categoryColor || "hsl(var(--primary))", color: "white" }}>
                {categoryName}
              </Badge>
            )}
            <Badge className={`text-[10px] font-black uppercase tracking-tighter border-0 ${isFree ? "bg-emerald-500" : "bg-amber-500"} text-white px-3 py-1`}>
              {isFree ? "FREE" : `₹${registrationFee}`}
            </Badge>
          </div>
        </motion.div>

        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{collegeName}</p>
            <h3 className="text-xl font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground font-bold">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(new Date(startDate), "MMM d, yyyy")}
            </div>
            {location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                {location}
              </div>
            )}
            {maxParticipants && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                {maxParticipants} LIMIT
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
