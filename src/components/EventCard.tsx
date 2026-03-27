import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, ArrowRight, Zap, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";

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

const getCategoryTheme = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("hack") || cat.includes("tech") || cat.includes("code")) {
    return { 
      primary: "var(--cyber-primary)", 
      accent: "var(--cyber-accent)", 
      gradient: "var(--gradient-cyber)", 
      glow: "var(--glow-cyber)",
      text: "text-cyan-400"
    };
  }
  if (cat.includes("cult") || cat.includes("music") || cat.includes("dance") || cat.includes("art") || cat.includes("social")) {
    return { 
      primary: "var(--rose-primary)", 
      accent: "var(--rose-accent)", 
      gradient: "var(--gradient-rose)", 
      glow: "var(--glow-rose)",
      text: "text-rose-400"
    };
  }
  if (cat.includes("sport") || cat.includes("game") || cat.includes("fitness") || cat.includes("eco")) {
    return { 
      primary: "var(--emerald-primary)", 
      accent: "var(--emerald-accent)", 
      gradient: "var(--gradient-emerald)", 
      glow: "var(--glow-emerald)",
      text: "text-emerald-400"
    };
  }
  if (cat.includes("work") || cat.includes("sem") || cat.includes("talk") || cat.includes("edu")) {
    return { 
      primary: "var(--solar-primary)", 
      accent: "var(--solar-accent)", 
      gradient: "var(--gradient-solar)", 
      glow: "var(--glow-solar)",
      text: "text-amber-400"
    };
  }
  return { 
    primary: "var(--cyber-primary)", 
    accent: "var(--cyber-accent)", 
    gradient: "var(--gradient-cyber)", 
    glow: "var(--glow-cyber)",
    text: "text-primary"
  };
};

export default function EventCard({
  id, title, description, collegeName, categoryName, categoryColor,
  location, startDate, coverImageUrl, maxParticipants, registrationFee,
  index = 0,
}: EventCardProps) {
  const navigate = useNavigate();
  const isFree = !registrationFee || registrationFee === 0;
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] as const,
        delay: index * 0.05
      }
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="h-full"
    >
      <motion.div
        whileHover={{ y: -10, transition: { duration: 0.4, ease: "easeOut" } }}
        className="h-full"
      >
        <div 
          onClick={() => navigate(`/events/${id}`)}
          className="group relative h-full flex flex-col bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 cursor-pointer shadow-2xl glass-card-premium"
          style={{ 
            borderColor: "rgba(255,255,255,0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `hsl(${getCategoryTheme(categoryName).primary})`;
            e.currentTarget.style.boxShadow = `0 20px 40px -20px ${getCategoryTheme(categoryName).glow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Image Overlay/Container */}
          <div className="relative h-64 overflow-hidden">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full bg-secondary flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
                <Trophy className="h-16 w-16 text-primary/20 relative z-10" />
              </div>
            )}

            {/* Premium Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
            
            {/* Badges */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
              {categoryName && (
                <Badge 
                  className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-0 shadow-lg backdrop-blur-md"
                  style={{ 
                    background: getCategoryTheme(categoryName).gradient,
                    color: "white",
                  }}
                >
                  {categoryName}
                </Badge>
              )}
            </div>

            {/* Price Tag */}
            <div className="absolute top-6 right-6 z-20">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/10 ${
                isFree ? "bg-emerald-500/20 text-emerald-400" : ""
              }`} style={{ 
                background: !isFree ? getCategoryTheme(categoryName).gradient : undefined,
                color: !isFree ? "white" : undefined 
              }}>
                {isFree ? "FREE ENTRY" : `₹${registrationFee}`}
              </div>
            </div>

            {/* Date Floater */}
            <div className="absolute bottom-6 left-6 z-20">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-black text-white/90">
                  {format(new Date(startDate), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-8 pt-2 flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-[1px] bg-primary/40" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] truncate">
                  {collegeName}
                </span>
              </div>
              <h3 className="text-2xl font-black leading-[1.1] tracking-tight text-white font-display group-hover:text-primary transition-colors duration-300 line-clamp-2">
                {title}
              </h3>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 mt-auto">
              {location && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/5">
                    <MapPin className={`h-3 w-3 ${getCategoryTheme(categoryName).text}`} />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground/80 truncate max-w-[140px] uppercase tracking-wider">
                    {location}
                  </span>
                </div>
              )}
              {maxParticipants && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/5">
                    <Users className={`h-3 w-3 ${getCategoryTheme(categoryName).text}`} />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                    {maxParticipants} LIMIT
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Section */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${getCategoryTheme(categoryName).text}`}>Live Now</span>
              <div 
                className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 group-hover:text-white"
                style={{ "--hover-bg": getCategoryTheme(categoryName).gradient } as any}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = getCategoryTheme(categoryName).gradient;
                  e.currentTarget.style.borderColor = "transparent";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,1)";
                }}
              >
                <ArrowRight className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>
          
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>
      </motion.div>
    </motion.div>
  );
}
