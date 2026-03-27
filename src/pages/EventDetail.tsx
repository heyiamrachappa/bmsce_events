import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, MapPin, Users, ArrowLeft, Clock, 
  Building2, IndianRupee, Star, CheckCircle2, 
  XCircle, AlertCircle, Share2
} from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CertificateDownload from "@/components/CertificateDownload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import TicketDownload from "@/components/TicketDownload";

const getCategoryTheme = (category?: string) => {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("hack") || cat.includes("tech") || cat.includes("code")) {
    return { 
      primary: "var(--cyber-primary)", 
      accent: "var(--cyber-accent)", 
      gradient: "var(--gradient-cyber)", 
      glow: "var(--glow-cyber)",
      text: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    };
  }
  if (cat.includes("cult") || cat.includes("music") || cat.includes("dance") || cat.includes("art") || cat.includes("social")) {
    return { 
      primary: "var(--rose-primary)", 
      accent: "var(--rose-accent)", 
      gradient: "var(--gradient-rose)", 
      glow: "var(--glow-rose)",
      text: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20"
    };
  }
  if (cat.includes("sport") || cat.includes("game") || cat.includes("fitness") || cat.includes("eco")) {
    return { 
      primary: "var(--emerald-primary)", 
      accent: "var(--emerald-accent)", 
      gradient: "var(--gradient-emerald)", 
      glow: "var(--glow-emerald)",
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    };
  }
  if (cat.includes("work") || cat.includes("sem") || cat.includes("talk") || cat.includes("edu")) {
    return { 
      primary: "var(--solar-primary)", 
      accent: "var(--solar-accent)", 
      gradient: "var(--gradient-solar)", 
      glow: "var(--glow-solar)",
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    };
  }
  return { 
    primary: "var(--cyber-primary)", 
    accent: "var(--cyber-accent)", 
    gradient: "var(--gradient-cyber)", 
    glow: "var(--glow-cyber)",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  };
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, colleges(name, location), event_categories(name, color)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: registration } = useQuery({
    queryKey: ["registration", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, student_name, usn, registration_status")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: volunteer } = useQuery({
    queryKey: ["volunteer", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_volunteers")
        .select("id, status")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const [volunteering, setVolunteering] = useState(false);
  const [volunteerFormData, setVolunteerFormData] = useState({
    name: "",
    usn: "",
    email: "",
  });

  const volunteerMutation = useMutation({
    mutationFn: async () => {
      if (!validateEmail(volunteerFormData.email)) {
        throw new Error("Only @bmsce.ac.in emails are allowed.");
      }

      const { error } = await supabase
        .from("event_volunteers")
        .insert({
          event_id: id!,
          user_id: user!.id,
          full_name: volunteerFormData.name,
          usn: volunteerFormData.usn,
          college_email: volunteerFormData.email,
          status: "pending"
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer", id, user?.id] });
      setVolunteering(false);
      toast.success("Volunteering request sent! 🤝");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit volunteering request."),
  });

  const { data: registrationCount = 0 } = useQuery({
    queryKey: ["registration_count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    usn: "",
    email: "",
    department: "",
    semester: "",
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Initialize team members when event data is available
  useEffect(() => {
    const ev = event as any;
    if (ev?.event_type === "group" && ev?.team_size) {
      setTeamMembers(Array(ev.team_size).fill(0).map(() => ({ name: "", usn: "", email: "", department: "", semester: "" })));
    }
  }, [event]);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith("@bmsce.ac.in");
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const ev = event as any;
      const fee = ev?.registration_fee || 0;
      const status = fee === 0 ? "completed" : "pending";

      if (ev.event_type === "individual") {
        if (!validateEmail(formData.email)) {
          throw new Error("Only @bmsce.ac.in emails are allowed.");
        }

        // 1. Insert into event_registrations (unified)
        const { error: regError } = await supabase
          .from("event_registrations")
          .insert({
            event_id: id!,
            user_id: user!.id,
            student_name: formData.name,
            usn: formData.usn,
            college_email: formData.email,
            department: formData.department,
            semester: formData.semester,
            registration_status: status === "completed" ? "confirmed" : "pending",
            payment_status: status === "completed" ? "free" : "pending"
          });
        if (regError) throw regError;
      } else {
        // Group Validation
        for (const member of teamMembers) {
          if (!member.name || !member.usn || !member.email) throw new Error("All member details are required.");
          if (!validateEmail(member.email)) throw new Error(`Invalid email for ${member.name || "member"}. Use @bmsce.ac.in`);
        }

        // 1. Insert into event_registrations (leader - unified)
        const leader = teamMembers[0];
        const { error: regError } = await supabase
          .from("event_registrations")
          .insert({
            event_id: id!,
            user_id: user!.id,
            student_name: leader.name,
            usn: leader.usn,
            college_email: leader.email,
            department: leader.department,
            semester: leader.semester,
            registration_status: status === "completed" ? "confirmed" : "pending",
            payment_status: status === "completed" ? "free" : "pending"
          });
        if (regError) throw regError;

        // 2. Create Team
        const { data: team, error: teamError } = await (supabase
          .from("registration_teams" as any) as any)
          .insert({
            event_id: id!,
            leader_user_id: user!.id,
            payment_status: status
          })
          .select()
          .single();
        if (teamError) throw teamError;

        // 3. Create members
        const membersToInsert = teamMembers.map(m => ({
          team_id: team.id,
          name: m.name,
          usn: m.usn,
          college_email: m.email,
          department: m.department,
          semester: m.semester
        }));

        const { error: membersError } = await supabase
          .from("team_members" as any)
          .insert(membersToInsert);
        if (membersError) throw membersError;
      }

      return { fee, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["registration", id] });
      queryClient.invalidateQueries({ queryKey: ["registration_count", id] });
      setRegistering(false);

      if (data.fee > 0) {
        toast.info("Registration submitted. Redirecting to payment...");
        setTimeout(() => {
          navigate(`/payment/${id}`);
        }, 1500);
      } else {
        toast.success("Registered successfully! 🎉");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to register."),
  });


  const handleShare = () => {
    const url = window.location.href;
    const title = event?.title || "BMSCE Event";
    
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out this event: ${title}`,
        url: url,
      }).catch(() => copyToClipboard(url));
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Event link copied! 🔗", {
      style: {
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "white"
      }
    });
  };

  const isRegistered = !!registration;
  const isFull = event?.max_participants ? registrationCount >= event.max_participants : false;
  const fee = (event as any)?.registration_fee || 0;
  const isFree = fee === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-10"><div className="h-72 rounded-xl bg-muted animate-pulse" /></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center space-y-4">
          <p className="text-5xl">😕</p>
          <h2 className="text-2xl font-bold">Event not found</h2>
          <Button variant="outline" onClick={() => navigate("/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/30 pb-20">
      {/* Dynamic Orbs - Simplified for mobile */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden sm:block">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[150px]" 
          style={{ background: getCategoryTheme(event?.event_categories?.name).gradient }}
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]" 
          style={{ background: getCategoryTheme(event?.event_categories?.name).accent }}
        />
      </div>

      <Navbar />

      {/* Cinematic Hero Section */}
      <div className="relative h-[50vh] min-h-[400px] lg:h-[65vh] w-full overflow-hidden">
        {/* Background Image / Gradient */}
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {event.cover_image_url ? (
            <img 
              src={event.cover_image_url} 
              alt={event.title} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-background to-purple-900" />
          )}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </motion.div>

        {/* Hero Content */}
        <div className="container relative h-full flex flex-col justify-end pb-8 sm:pb-12 lg:pb-24 z-20 px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="space-y-4 sm:space-y-6 max-w-4xl"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/events")}
              className="group text-white/60 hover:text-white mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Hub</span>
            </Button>

            <div className="flex flex-wrap gap-3">
              {event.event_categories?.name && (
                <Badge className="px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
                  style={{ background: getCategoryTheme(event.event_categories.name).gradient }}>
                  {event.event_categories.name}
                </Badge>
              )}
              <Badge className={`px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white ${isFree ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                {isFree ? "Free Mission" : `₹${fee} Entry`}
              </Badge>
              {isFull && <Badge className="px-4 py-1.5 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400">Grid Full</Badge>}
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] font-display uppercase italic">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-[10px] sm:text-xs md:text-sm font-bold text-white/70 uppercase tracking-widest">
              <span className="flex items-center gap-2"><Building2 className={`h-4 w-4 ${getCategoryTheme(event.event_categories?.name).text}`} /> {event.colleges?.name || "BMSCE"}</span>
              <span className="flex items-center gap-2"><Calendar className={`h-4 w-4 ${getCategoryTheme(event.event_categories?.name).text}`} /> {format(new Date(event.start_date), "MMM d, yyyy")}</span>
              <span className="flex items-center gap-2"><Clock className={`h-4 w-4 ${getCategoryTheme(event.event_categories?.name).text}`} /> {format(new Date(event.start_date), "h:mm a")}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="container -mt-12 relative z-30">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="glass-panel p-8 lg:p-12 rounded-[40px] border border-white/5 space-y-8"
            >
              <div className="space-y-4">
                <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${getCategoryTheme(event.event_categories?.name).text}`}>Operational Briefing</h3>
                <div className="h-1 w-20 bg-white/10 rounded-full" />
              </div>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed whitespace-pre-line font-medium">
                {event.description || "No description available for this mission. Consult with the organizers for more details."}
              </p>

              {event.venue && (
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-1">Coordinated Location</h4>
                    <p className="text-muted-foreground font-bold">{event.venue}</p>
                    {event.location && <p className="text-xs text-muted-foreground/60">{event.location}</p>}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Action Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="sticky top-32"
            >
              <Card className="glass-panel border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center pb-6 border-b border-white/5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Entry Fee</p>
                            <p className="text-3xl font-black text-white">{isFree ? "FREE" : `₹${fee}`}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Capacity</p>
                            <p className="text-sm font-bold text-white">{registrationCount} / {event.max_participants || "∞"}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {((event as any).activity_points > 0) && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                              <Star className="h-5 w-5 fill-amber-400" />
                              <span className="text-sm font-black uppercase tracking-widest">{(event as any).activity_points} XP Points</span>
                            </div>
                          )}

                          {event.event_type === "group" && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-400/10 border border-indigo-400/20 text-indigo-400">
                              <Users className="h-5 w-5" />
                              <span className="text-sm font-black uppercase tracking-widest">Team Size: {event.team_size} Operatives</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Secondary Share Button */}
                      <button 
                        onClick={handleShare}
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300 active:scale-90 shadow-xl self-start group/share-btn"
                        title="Share Event"
                      >
                        <Share2 className="w-5 h-5 text-muted-foreground group-hover/share-btn:text-white group-hover/share-btn:scale-110 transition-all" />
                      </button>
                    </div>
                  </div>

                  {/* Main Actions */}
                  <div className="space-y-4 pt-4">
                    {user ? (
                      <div className="space-y-4">
                        {isRegistered ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-3 text-emerald-400 font-black uppercase tracking-widest text-xs">
                              <CheckCircle2 className="h-5 w-5" /> Registered
                            </div>
                            <TicketDownload 
                              registrationId={registration.id}
                              eventTitle={event.title}
                              studentName={registration.student_name}
                              usn={registration.usn}
                              eventDate={event.start_date}
                              eventLocation={event.venue || event.location}
                            />
                            {(event.archived || (event.end_date && isPast(new Date(event.end_date)))) && (
                              <CertificateDownload eventId={id!} eventTitle={event.title} />
                            )}
                          </div>
                        ) : !event.registrations_open ? (
                          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-3 text-red-400 font-black uppercase tracking-widest text-xs">
                            <XCircle className="h-5 w-5" /> Reg Closed
                          </div>
                        ) : (
                          <Dialog open={registering} onOpenChange={setRegistering}>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 hover:scale-[1.02]" 
                                style={{ background: getCategoryTheme(event.event_categories?.name).gradient }}
                                disabled={isFull}
                              >
                                {isFull ? "Grid Full" : "Initiate Registration"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass-panel border-white/10 text-white p-0 overflow-hidden rounded-[24px]">
                              <div className="p-8 lg:p-12 space-y-8">
                                <DialogHeader>
                                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Registration Protocol</DialogTitle>
                                  <DialogDescription className="text-muted-foreground font-medium pt-2">
                                    {event.event_type === "group"
                                       ? `Authorize details for all ${event.team_size} squad members.`
                                       : "Provide your biometric data to secure your slot."}
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-8">
                                  {event.event_type === "individual" ? (
                                    <div className="space-y-6">
                                      <div className="space-y-2">
                                        <Label className={`text-[10px] font-black uppercase tracking-widest ${getCategoryTheme(event.event_categories?.name).text}`}>Full Identity</Label>
                                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-14 bg-white/5 border-white/10 rounded-xl" placeholder="Agent Name" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">USN Vector</Label>
                                          <Input value={formData.usn} onChange={(e) => setFormData({ ...formData, usn: e.target.value })} className="h-14 bg-white/5 border-white/10 rounded-xl" placeholder="1BM22XX..." />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Email Matrix</Label>
                                          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-14 bg-white/5 border-white/10 rounded-xl" placeholder="name@bmsce.ac.in" />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Department</Label>
                                          <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="h-14 bg-white/5 border-white/10 rounded-xl" placeholder="e.g. CSE" />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Level / Sem</Label>
                                          <Input value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="h-14 bg-white/5 border-white/10 rounded-xl" placeholder="e.g. 4" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-10">
                                      {teamMembers.map((member, index) => (
                                        <div key={index} className="space-y-6 p-6 rounded-[32px] bg-white/[0.03] border border-white/5 relative overflow-hidden">
                                          <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Users className="w-20 h-20" />
                                          </div>
                                          <h4 className="font-black flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white">
                                            <span className={`w-6 h-6 rounded text-white flex items-center justify-center text-[10px]`} style={{ background: getCategoryTheme(event.event_categories?.name).gradient }}>{index + 1}</span>
                                            {index === 0 ? "Squad Leader" : `Member ${index + 1}`}
                                          </h4>
                                          <div className="space-y-4">
                                            <Input
                                              value={member.name}
                                              onChange={(e) => {
                                                const newMembers = [...teamMembers];
                                                newMembers[index].name = e.target.value;
                                                setTeamMembers(newMembers);
                                              }}
                                              className="h-12 bg-white/5 border-white/10"
                                              placeholder="Full Name"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                              <Input
                                                value={member.usn}
                                                onChange={(e) => {
                                                  const newMembers = [...teamMembers];
                                                  newMembers[index].usn = e.target.value;
                                                  setTeamMembers(newMembers);
                                                }}
                                                className="h-12 bg-white/5 border-white/10"
                                                placeholder="USN"
                                              />
                                              <Input
                                                value={member.email}
                                                onChange={(e) => {
                                                  const newMembers = [...teamMembers];
                                                  newMembers[index].email = e.target.value;
                                                  setTeamMembers(newMembers);
                                                }}
                                                className="h-12 bg-white/5 border-white/10"
                                                placeholder="Email (@bmsce.ac.in)"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-[10px] font-bold text-amber-200 uppercase tracking-widest leading-relaxed">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                                    <p>Authentication required via @bmsce.ac.in domain. {fee > 0 && `Registration requires credit transfer of ₹${fee}.`}</p>
                                  </div>

                                  <Button
                                    className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl"
                                    style={{ background: getCategoryTheme(event.event_categories?.name).gradient }}
                                    onClick={() => registerMutation.mutate()}
                                    disabled={registerMutation.isPending}
                                  >
                                    {registerMutation.isPending ? "Syncing..." : fee > 0 ? `Proceed to Payment (₹${fee})` : "Confirm Mission Access"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Volunteering Section */}
                        {volunteer ? (
                          <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] ${
                            volunteer.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                            volunteer.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                            'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {volunteer.status === 'pending' ? 'Crew Req Pending ⏳' : 
                             volunteer.status === 'approved' ? 'Crew Active ✅' : 
                             'Crew Req Revoked ❌'}
                          </div>
                        ) : (
                          <Dialog open={volunteering} onOpenChange={setVolunteering}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-white/5 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
                                Join Ground Crew 🤝
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] glass-panel border-white/10 text-white p-8">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Crew Application</DialogTitle>
                                <DialogDescription className="text-muted-foreground pt-1">
                                  Support the grid operations. Provide your clearance data.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 pt-6">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Identity</Label>
                                  <Input value={volunteerFormData.name} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, name: e.target.value })} className="h-12 bg-white/5 border-white/10" placeholder="Agent Name" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">USN Vector</Label>
                                  <Input value={volunteerFormData.usn} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, usn: e.target.value })} className="h-12 bg-white/5 border-white/10" placeholder="1BM22XX..." />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Email Matrix</Label>
                                  <Input type="email" value={volunteerFormData.email} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, email: e.target.value })} className="h-12 bg-white/5 border-white/10" placeholder="name@bmsce.ac.in" />
                                </div>
                                <Button 
                                  className="btn-vivid w-full h-14 rounded-xl font-black uppercase tracking-widest text-xs" 
                                  onClick={() => volunteerMutation.mutate()}
                                  disabled={volunteerMutation.isPending}
                                >
                                  {volunteerMutation.isPending ? "Uploading..." : "Submit Clearance Req"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ) : (
                      <Button className="btn-vivid w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em]" onClick={() => navigate("/auth")}>
                        Auth Required
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
