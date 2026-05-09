import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { 
  Calendar, MapPin, Users, ArrowLeft, Clock, 
  Building2, Star, CheckCircle2, 
  XCircle, AlertCircle, Share2, Zap, Plus, Minus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CertificateDownload from "@/components/CertificateDownload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import TicketDownload from "@/components/TicketDownload";

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
    department: "",
  });

  const volunteerMutation = useMutation({
    mutationFn: async () => {
      if (!volunteerFormData.email.toLowerCase().endsWith("@bmsce.ac.in")) {
        throw new Error("Only @bmsce.ac.in emails are allowed.");
      }

      const payload: any = {
        event_id: id!,
        user_id: user!.id,
        full_name: volunteerFormData.name,
        usn: volunteerFormData.usn,
        college_email: volunteerFormData.email,
        department: volunteerFormData.department,
        status: "pending"
      };

      let { error } = await supabase.from("event_volunteers").insert(payload);

      // Graceful fallback for stale schema caches or local databases
      if (error && error.message?.includes("Could not find the 'department' column")) {
        delete payload.department;
        const retry = await supabase.from("event_volunteers").insert(payload);
        error = retry.error;
      }

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
        .eq("event_id", id!)
        .eq("registration_status", "confirmed")
        .in("payment_status", ["free", "paid"]);
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: registrationTeamsCount = 0 } = useQuery({
    queryKey: ["registration_teams_count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("registration_teams")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id!);
      return count || 0;
    },
    enabled: !!id && (event as any)?.event_type === "group",
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

  useEffect(() => {
    const ev = event as any;
    if (ev?.event_type === "group" && ev?.min_team_size) {
      setTeamMembers(Array(ev.min_team_size).fill(0).map(() => ({ name: "", usn: "", email: "", department: "", semester: "" })));
    }
  }, [event]);

  const addMember = () => {
    const ev = event as any;
    if (teamMembers.length < (ev.max_team_size || 10)) {
      setTeamMembers([...teamMembers, { name: "", usn: "", email: "", department: "", semester: "" }]);
    } else {
      toast.error(`Maximum ${ev.max_team_size} members allowed.`);
    }
  };

  const removeMember = (index: number) => {
    const ev = event as any;
    if (teamMembers.length > (ev.min_team_size || 1)) {
      setTeamMembers(teamMembers.filter((_, i) => i !== index));
    } else {
      toast.error(`Minimum ${ev.min_team_size} members required.`);
    }
  };

  const validateEmail = (email: string) => email.toLowerCase().endsWith("@bmsce.ac.in");

  const registerMutation = useMutation({
    mutationFn: async () => {
      const ev = event as any;
      const fee = ev?.registration_fee || 0;
      const status = fee === 0 ? "completed" : "pending";

      if (ev.event_type === "individual") {
        if (ev.audience_type === 'college_only' && !validateEmail(formData.email)) {
          throw new Error("This event is restricted to BMSCE students. Please use your @bmsce.ac.in email.");
        }

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
        for (const member of teamMembers) {
          if (!member.name || !member.usn || !member.email) throw new Error("All member details are required.");
          if (ev.audience_type === 'college_only' && !validateEmail(member.email)) {
            throw new Error(`Invalid email for ${member.name}. This event requires @bmsce.ac.in emails.`);
          }
        }

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

        const { data: team, error: teamError } = await supabase
          .from("registration_teams")
          .insert({
            event_id: id!,
            leader_user_id: user!.id,
            payment_status: status
          })
          .select()
          .single();
        if (teamError) throw teamError;

        const membersToInsert = teamMembers.map(m => ({
          team_id: team.id,
          name: m.name,
          usn: m.usn,
          college_email: m.email,
          department: m.department,
          semester: m.semester
        }));

        const { error: membersError } = await supabase
          .from("team_members")
          .insert(membersToInsert);
        if (membersError) throw membersError;
      }
      return { fee, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["registration", id] });
      queryClient.invalidateQueries({ queryKey: ["registration_count", id] });
      queryClient.invalidateQueries({ queryKey: ["registration_teams_count", id] });
      setRegistering(false);
      if (data.fee > 0) {
        toast.info("Redirecting to payment...");
        setTimeout(() => navigate(`/payment/${id}`), 1000);
      } else {
        toast.success("Registered successfully! 🎉");
      }
    },
    onError: (err: any) => {
      let msg = err.message || "Failed to register.";
      if (msg.includes("Registration limit exceeded")) {
        msg = "Registration failed: The event has reached its maximum capacity!";
      }
      toast.error(msg);
    },
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event?.title, url }).catch(() => copyToClipboard(url));
    } else copyToClipboard(url);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied! 🔗");
  };

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 animate-pulse h-96 bg-foreground/5 rounded-[60px]" /></div>;
  if (!event) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6"><Navbar /><h2 className="text-4xl font-black">EVENT NOT FOUND</h2><button onClick={() => navigate("/events")} className="h-16 px-12 rounded-full border-2 border-foreground font-black uppercase tracking-tighter hover:bg-foreground hover:text-background transition-all">BACK TO EVENTS</button></div>;

  const isRegistered = !!registration;
  const isVolunteer = !!volunteer;
  const evData = event as any;
  const isFull = evData?.event_type === "group" 
    ? (evData.max_teams ? registrationTeamsCount >= evData.max_teams : false)
    : (evData.max_participants ? registrationCount >= evData.max_participants : false);
  const fee = evData?.registration_fee || 0;
  const isFree = fee === 0;

    return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary/30 pb-32">
      <Navbar />

      {/* MASSIVE HERO SECTION */}
      <div className="relative pt-48 pb-20 px-6">
        <div className="container max-w-6xl p-0 space-y-12">
           <button 
              onClick={() => navigate("/events")}
              className="group flex items-center gap-4 text-muted-foreground hover:text-primary transition-all"
            >
              <ArrowLeft className="h-5 w-5 stroke-[4] group-hover:-translate-x-2 transition-transform" /> 
              <span className="text-sm font-[900] uppercase tracking-widest">Back to Events</span>
            </button>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-[900] uppercase tracking-widest shadow-2xl">
                  {event.event_categories?.name}
                </span>
                <span className="px-6 py-2 rounded-full border-2 border-border text-muted-foreground text-sm font-[900] uppercase tracking-widest">
                  {isFree ? "FREE ENTRY" : `₹${fee} REGISTRATION`}
                </span>
                {evData.audience_type === 'college_only' ? (
                  <span className="px-6 py-2 rounded-full bg-amber-500/10 border-2 border-amber-500/50 text-amber-500 text-sm font-[900] uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> COLLEGE ONLY
                  </span>
                ) : (
                  <span className="px-6 py-2 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-500 text-sm font-[900] uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-4 w-4" /> OPEN TO PUBLIC
                  </span>
                )}
              </div>
              <h1 className="text-[10vw] sm:text-[8vw] font-[900] leading-[0.8] tracking-[-0.05em] uppercase text-foreground">
                {event.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end pt-12 border-t-2 border-border/50">
              <div className="lg:col-span-8">
                <div className="flex flex-wrap gap-12 text-sm font-[900] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-3"><Building2 className="h-4 w-4 text-primary" /> {event.colleges?.name}</span>
                  <span className="flex items-center gap-3"><Calendar className="h-4 w-4 text-primary" /> {format(new Date(event.start_date), "MMM d, yyyy")}</span>
                  <span className="flex items-center gap-3"><Clock className="h-4 w-4 text-primary" /> {format(new Date(event.start_date), "h:mm a")}</span>
                </div>
              </div>
              <div className="lg:col-span-4 flex justify-end">
                <button 
                  onClick={handleShare}
                  className="h-20 w-20 rounded-full border-2 border-border flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
                >
                  <Share2 className="h-6 w-6 stroke-[3]" />
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* CONTENT & ACTIONS */}
      <div className="container max-w-6xl px-6 grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-20">
          {/* Cover */}
          <div className="aspect-[16/9] w-full bg-card/80 rounded-[40px] overflow-hidden border-2 border-border/50 shadow-2xl">
            {event.cover_image_url ? (
               <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover opacity-80" />
            ) : (
               <div className="h-full w-full flex items-center justify-center">
                  <Zap className="h-32 w-32 text-muted-foreground/10" />
               </div>
            )}
          </div>

          <div className="space-y-10">
            <h2 className="text-4xl font-[900] uppercase tracking-tighter">Event <span className="text-muted-foreground/60">Info</span></h2>
            <p className="text-xl font-[900] uppercase tracking-tighter leading-[0.9] text-muted-foreground whitespace-pre-line">
              {event.description || "No details provided."}
            </p>
          </div>

          {event.venue && (
            <div className="p-12 bg-foreground text-background rounded-[40px] flex gap-10 items-start">
              <MapPin className="h-10 w-10 stroke-[4] text-primary" />
              <div className="space-y-3">
                <h3 className="text-3xl font-[900] uppercase tracking-tighter">LOCATION</h3>
                <p className="text-xl font-[900] uppercase tracking-tighter leading-none">{event.venue}</p>
                <p className="text-sm font-[900] uppercase tracking-widest opacity-40">{event.location}</p>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR ACTIONS */}
        <div className="lg:col-span-5">
          <div className="sticky top-40 p-12 bg-card border-2 border-border rounded-[40px] space-y-12">
            <div className="grid grid-cols-2 gap-8 border-b-2 border-border/50 pb-12">
               <div className="space-y-2">
                 <p className="text-sm font-[900] opacity-20 uppercase tracking-widest">{evData.event_type === "group" ? "TEAM CAPACITY" : "PARTICIPANT CAPACITY"}</p>
                 <p className="text-4xl font-[900] tracking-tighter">
                   {evData.event_type === "group" 
                     ? `${registrationTeamsCount}/${evData.max_teams || "∞"}`
                     : `${registrationCount}/${evData.max_participants || "∞"}`
                   }
                 </p>
               </div>
               <div className="space-y-2 text-right">
                 <p className="text-sm font-[900] opacity-20 uppercase tracking-widest">FEE</p>
                 <p className="text-4xl font-[900] tracking-tighter text-primary">{isFree ? "FREE" : `₹${fee}`}</p>
               </div>
            </div>

            <div className="space-y-4">
              {((event as any).activity_points > 0) && (
                <div className="h-16 px-8 rounded-full bg-primary text-primary-foreground flex items-center gap-4 font-[900] uppercase tracking-widest text-sm">
                  <Star className="h-4 w-4 fill-black" /> {(event as any).activity_points} Points
                </div>
              )}
              {evData.event_type === "group" && (
                <div className="h-16 px-8 rounded-full border-2 border-border/50 flex items-center gap-4 text-muted-foreground font-[900] uppercase tracking-widest text-sm">
                  <Users className="h-4 w-4" /> 
                  {evData.min_team_size === evData.max_team_size 
                    ? `${evData.min_team_size} members per team` 
                    : `${evData.min_team_size}-${evData.max_team_size} members per team`
                  }
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              {!user ? (
                <button onClick={() => navigate("/auth")} className="w-full h-24 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-sm hover:scale-[1.03] active:scale-95 transition-all">
                  Sign in to Register
                </button>
              ) : isRegistered ? (
                <div className="space-y-6">
                  <div className="h-24 w-full rounded-full border-2 border-emerald-500/20 text-emerald-500 flex items-center justify-center gap-4 text-sm font-[900] uppercase tracking-widest bg-emerald-500/5">
                    <CheckCircle2 className="h-5 w-5 stroke-[4]" /> REGISTERED
                  </div>
                  <TicketDownload 
                    registrationId={registration.id}
                    eventTitle={event.title}
                    studentName={registration.student_name}
                    usn={registration.usn}
                    eventDate={event.start_date}
                    eventLocation={event.venue || event.location}
                  />
                  <CertificateDownload eventId={id!} eventTitle={event.title} />
                </div>
              ) : !event.registrations_open ? (
                <div className="h-24 w-full rounded-full bg-muted text-muted-foreground/30 flex items-center justify-center text-sm font-[900] uppercase tracking-widest border-2 border-transparent">
                  CLOSED
                </div>
              ) : (
                <Dialog open={registering} onOpenChange={setRegistering}>
                  <DialogTrigger asChild>
                    <div className="space-y-4">
                      <button 
                        className={`w-full h-24 rounded-full font-[900] uppercase tracking-widest text-sm transition-all ${
                          isFull || (evData.audience_type === 'college_only' && !user?.email?.endsWith('@bmsce.ac.in'))
                            ? 'bg-muted text-muted-foreground/30 border-2 border-transparent cursor-not-allowed opacity-50' 
                            : 'bg-primary text-primary-foreground hover:scale-[1.03] active:scale-95 shadow-4xl shadow-primary/20'
                        }`} 
                        disabled={isFull || (evData.audience_type === 'college_only' && !user?.email?.endsWith('@bmsce.ac.in'))}
                      >
                        {isFull ? "Event Full" : (evData.audience_type === 'college_only' && !user?.email?.endsWith('@bmsce.ac.in') ? "Restricted" : "Register Now")}
                      </button>
                      {evData.audience_type === 'college_only' && !user?.email?.endsWith('@bmsce.ac.in') && (
                        <p className="text-[10px] text-center text-destructive font-black uppercase tracking-widest">
                          ⚠️ This event is restricted to BMSCE students only.
                        </p>
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-background border-2 border-border rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <div className="p-12 space-y-12">
                       <div className="space-y-4">
                          <div className="text-sm font-[900] uppercase tracking-widest text-primary">Registration Form</div>
                          <h2 className="text-6xl font-[900] uppercase tracking-tighter leading-none">Your<br /><span className="text-muted-foreground/60">Details</span></h2>
                       </div>
                       <div className="space-y-8">
                         {event.event_type === "individual" ? (
                           <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Full Name</label>
                                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" placeholder="Full Name" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">USN</label>
                                  <input value={formData.usn} onChange={(e) => setFormData({ ...formData, usn: e.target.value })} className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" placeholder="USN" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">College Email</label>
                                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" placeholder="you@bmsce.ac.in" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Department</label>
                                  <input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" placeholder="e.g. CSE" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Semester</label>
                                  <input value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" placeholder="1-8" />
                                </div>
                              </div>
                           </div>
                         ) : (
                            <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-6 custom-scrollbar">
                              <div className="space-y-4 mb-2 sticky top-0 bg-background pt-2 z-10 pb-4 border-b-2 border-border/30 flex justify-between items-center">
                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                   Team Members ({teamMembers.length})
                                </p>
                                <button 
                                  onClick={addMember}
                                  disabled={teamMembers.length >= (evData.max_team_size || 10)}
                                  className="h-10 px-6 rounded-full bg-primary/10 text-primary text-sm font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Plus className="h-3 w-3" /> Add Member
                                </button>
                              </div>
                              {teamMembers.map((member, index) => (
                                <div key={index} className="p-8 bg-card/80 border-2 border-border/50 rounded-[32px] space-y-6 relative group">
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs font-[900] text-primary uppercase tracking-[0.3em]">{index === 0 ? "TEAM LEADER" : `MEMBER ${index + 1}`}</p>
                                    {index >= (evData.min_team_size || 1) && (
                                      <button 
                                        onClick={() => removeMember(index)}
                                        className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <input value={member.name} onChange={(e) => { const nm = [...teamMembers]; nm[index].name = e.target.value; setTeamMembers(nm); }} className="w-full h-14 px-8 bg-background border-2 border-border/50 rounded-full font-[900] uppercase tracking-tighter" placeholder="NAME" />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input value={member.usn} onChange={(e) => { const nm = [...teamMembers]; nm[index].usn = e.target.value; setTeamMembers(nm); }} className="h-14 px-8 bg-background border-2 border-border/50 rounded-full font-[900] uppercase tracking-tighter" placeholder="USN" />
                                    <input value={member.email} onChange={(e) => { const nm = [...teamMembers]; nm[index].email = e.target.value; setTeamMembers(nm); }} className="h-14 px-8 bg-background border-2 border-border/50 rounded-full font-[900] uppercase tracking-tighter" placeholder="EMAIL" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <input value={member.department} onChange={(e) => { const nm = [...teamMembers]; nm[index].department = e.target.value; setTeamMembers(nm); }} className="h-14 px-8 bg-background border-2 border-border/50 rounded-full font-[900] uppercase tracking-tighter" placeholder="DEPT" />
                                    <input value={member.semester} onChange={(e) => { const nm = [...teamMembers]; nm[index].semester = e.target.value; setTeamMembers(nm); }} className="h-14 px-8 bg-background border-2 border-border/50 rounded-full font-[900] uppercase tracking-tighter" placeholder="SEM" />
                                  </div>
                                </div>
                              ))}
                            </div>
                         )}
                         <button onClick={() => registerMutation.mutate()} className="w-full h-20 rounded-full bg-primary text-primary-foreground font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all">
                            {registerMutation.isPending ? "REGISTERING..." : "CONFIRM REGISTRATION"}
                         </button>
                       </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* VOLUNTEER SECTION */}
              {!user ? (
                <button onClick={() => navigate("/auth")} className="w-full h-16 rounded-full border-2 border-foreground bg-transparent text-foreground font-[900] uppercase tracking-widest text-sm hover:bg-foreground hover:text-background active:scale-95 transition-all mt-4">
                  Sign in to Volunteer
                </button>
              ) : !isVolunteer ? (
                <Dialog open={volunteering} onOpenChange={setVolunteering}>
                  <DialogTrigger asChild>
                    <button className="w-full h-16 rounded-full border-2 border-foreground bg-transparent text-foreground font-[900] uppercase tracking-widest text-sm hover:bg-foreground hover:text-background active:scale-95 transition-all mt-4">
                      Apply to Volunteer
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-background border-2 border-border rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <div className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="text-sm font-[900] uppercase tracking-widest text-emerald-500">Join the Team</div>
                        <h2 className="text-4xl font-[900] uppercase tracking-tighter leading-none">Volunteer<br /><span className="text-muted-foreground/60">Application</span></h2>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Full Name</label>
                          <input value={volunteerFormData.name} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, name: e.target.value })} className="w-full h-14 px-6 bg-card border-2 border-border/50 focus:border-emerald-500/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter" placeholder="Full Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">USN</label>
                            <input value={volunteerFormData.usn} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, usn: e.target.value })} className="w-full h-14 px-6 bg-card border-2 border-border/50 focus:border-emerald-500/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter" placeholder="USN" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Dept</label>
                            <input value={volunteerFormData.department} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, department: e.target.value })} className="w-full h-14 px-6 bg-card border-2 border-border/50 focus:border-emerald-500/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter" placeholder="e.g. CSE" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">College Email</label>
                          <input type="email" value={volunteerFormData.email} onChange={(e) => setVolunteerFormData({ ...volunteerFormData, email: e.target.value })} className="w-full h-14 px-6 bg-card border-2 border-border/50 focus:border-emerald-500/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter" placeholder="you@bmsce.ac.in" />
                        </div>
                        <button onClick={() => volunteerMutation.mutate()} className="w-full h-16 rounded-full bg-emerald-500 text-background font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all">
                          {volunteerMutation.isPending ? "Sending..." : "Apply Now"}
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="h-16 w-full rounded-full border-2 border-emerald-500/20 text-emerald-500 flex items-center justify-center gap-4 text-sm font-[900] uppercase tracking-widest bg-emerald-500/5 mt-4">
                  <CheckCircle2 className="h-4 w-4 stroke-[4]" /> VOLUNTEER APPLIED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
