import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, ArrowRight, Zap } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface EventCardProps {
  id: string;
  title: string;
  description?: string | null;
  collegeName: string;
  categoryName?: string;
  location?: string | null;
  startDate: string;
  coverImageUrl?: string | null;
  maxParticipants?: number | null;
  registrationFee?: number | null;
  index?: number;
}

export default function EventCard({
  id, title, collegeName, categoryName,
  location, startDate, coverImageUrl, maxParticipants, registrationFee,
  index = 0,
}: EventCardProps) {
  const navigate = useNavigate();
  const isFree = !registrationFee || registrationFee === 0;

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
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
      className="h-full group"
      onClick={() => navigate(`/events/${id}`)}
    >
      <div className="h-full flex flex-col bg-card border-2 border-border/50 rounded-[40px] overflow-hidden transition-all duration-500 cursor-pointer hover:border-primary/40 group-hover:bg-accent/50">
        {/* Cover Image Container */}
        <div className="relative h-56 sm:h-72 overflow-hidden bg-background">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80 group-hover:opacity-100"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Zap className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/10" />
            </div>
          )}

          {/* Impact Badges */}
          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex flex-col gap-2 sm:gap-3 z-10">
            {categoryName && (
              <span className="px-4 py-2 sm:px-6 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-[900] uppercase tracking-widest shadow-2xl">
                {categoryName}
              </span>
            )}
            <span className="px-4 py-2 sm:px-6 rounded-full bg-background text-foreground text-[9px] sm:text-[10px] font-[900] uppercase tracking-widest border border-border shadow-2xl">
              {isFree ? "FREE ENTRY" : `₹${registrationFee}`}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-10">
             <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-foreground text-background flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:scale-110 shadow-2xl">
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 stroke-[4]" />
             </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col gap-8 sm:gap-10">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[9px] sm:text-[10px] font-[900] text-primary uppercase tracking-[0.4em] line-clamp-1">
                {collegeName}
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-[900] leading-[0.9] sm:leading-[0.85] tracking-[-0.05em] uppercase text-foreground group-hover:text-primary transition-colors line-clamp-2 break-words">
              {title}
            </h3>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-border/50">
            <div className="space-y-2">
              <span className="text-[9px] font-[900] uppercase tracking-[0.2em] text-muted-foreground/60">DATE</span>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">
                  {format(new Date(startDate), "MMM dd")}
                </span>
              </div>
            </div>
            {location && (
              <div className="space-y-2">
                <span className="text-[9px] font-[900] uppercase tracking-[0.2em] text-muted-foreground/60">LOCATION</span>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground truncate">
                    {location}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
