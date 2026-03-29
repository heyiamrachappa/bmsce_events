import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Building2, PlusCircle, Trash2, Pencil, ExternalLink, Sparkles, Clock, XCircle, CheckCircle2, ShieldCheck, Heart, Search, ChevronRight, X, ClipboardCheck, Award, FileSpreadsheet, Download, PlayCircle, StopCircle, QrCode, Zap, Rocket, HandHeart } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { eventService } from "@/services/eventService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AttendanceManager from "@/components/AttendanceManager";
import CertificateDesigner from "@/components/CertificateDesigner";
import TicketDownload from "@/components/TicketDownload";
import LiveAttendanceOrganizer from "@/components/LiveAttendanceOrganizer";
import LiveAttendanceScanner from "@/components/LiveAttendanceScanner";
import CertificateDownload from "@/components/CertificateDownload";

const EventCardStats = ({ eventId, eventType, maxParticipants, maxTeams }: { eventId: string, eventType: string, maxParticipants: number | null, maxTeams?: number | null }) => {
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ["card_reg_count", eventId, eventType],
    queryFn: async () => {
      if (eventType === 'group') {
        const { count } = await supabase
          .from("registration_teams")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId);
        return count || 0;
      }

      const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "confirmed")
        .in("payment_status", ["free", "paid"]);
      return count || 0;
    }
  });

  if (isLoading) return <span className="animate-pulse bg-muted rounded h-4 w-12 inline-block ml-2"></span>;
  
  const limit = eventType === 'group' ? maxTeams : maxParticipants;
  const isFull = limit ? count >= limit : false;
  
  return (
    <div className={`mt-4 p-4 rounded-2xl flex items-center justify-between text-[10px] font-[900] uppercase tracking-widest border-2 transition-all ${isFull ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-foreground/5 border-border/50 text-foreground'}`}>
      <span>{eventType === 'group' ? 'TEAMS SECURED' : 'SEATS SECURED'}</span>
      <span className={`text-base font-black ${isFull ? 'text-red-500' : 'text-primary'}`}>{count} {limit ? `/ ${limit}` : ''}</span>
    </div>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, colleges(id, name, slug), clubs(id, name)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: activityPoints = 0 } = useQuery({
    queryKey: ["activity_points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_points" as any)
        .select("points")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]).reduce((acc, curr) => acc + curr.points, 0);
    },
    enabled: !!user,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("*, colleges(name, slug)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Admin request status
  const { data: adminRequest } = useQuery({
    queryKey: ["my_admin_request", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_requests")
        .select("*, club_id, clubs(id, name, category)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = (profile as any)?.role === "admin" || (profile as any)?.account_type === "admin" || roles.some((r: any) => r.role === "college_admin" || r.role === "admin") || adminRequest?.status === "approved";

  // Events the user registered for
  const { data: registeredEvents = [] } = useQuery({
    queryKey: ["my_registrations", user?.id],
    queryFn: async () => {
      // Fetch direct registrations
      const { data: directRegs } = await supabase
        .from("event_registrations")
        .select("id, event_id, student_name, usn, events(id, title, start_date, end_date, location, venue, colleges(name), cover_image_url, archived)")
        .eq("user_id", user!.id);

      // Fetch team member registrations by email match
      const { data: teamMemberRegs } = await supabase
        .from("team_members")
        .select("id, team_id, registration_teams(event_id, events(id, title, start_date, end_date, location, venue, colleges(name), cover_image_url, archived))")
        .eq("college_email", user!.email || "");

      const result = [...(directRegs || [])];
      const seenEventIds = new Set(result.map(r => r.event_id));

      if (teamMemberRegs) {
        teamMemberRegs.forEach((tm: any) => {
          const event = tm.registration_teams?.events;
          const eventId = tm.registration_teams?.event_id;
          if (event && eventId && !seenEventIds.has(eventId)) {
            result.push({
              id: tm.id,
              event_id: eventId,
              student_name: user?.user_metadata?.full_name || "Team Member",
              usn: "Team Participant",
              events: event
            });
            seenEventIds.add(eventId);
          }
        });
      }

      return result.sort((a, b) => {
        const dateA = a.events?.start_date ? new Date(a.events.start_date).getTime() : 0;
        const dateB = b.events?.start_date ? new Date(b.events.start_date).getTime() : 0;
        return dateB - dateA;
      });
    },
    enabled: !!user,
  });

  // Events the user volunteered for
  const { data: volunteeringEvents = [] } = useQuery({
    queryKey: ["my_volunteering", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_volunteers")
        .select("id, status, event_id, events(id, title, start_date, end_date, location, venue, colleges(name), cover_image_url, archived)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Events posted by admin
  const { data: postedEvents = [] } = useQuery({
    queryKey: ["my_posted_events", user?.id],
    queryFn: async () => eventService.fetchOrganizerEvents(user!.id),
    enabled: !!user && isAdmin,
  });

  // All Clubs for selection
  const { data: allClubs = [] } = useQuery({
    queryKey: ["all_clubs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Admin and category logic
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all"); // all, paid, free
  const [attendanceEvent, setAttendanceEvent] = useState<any>(null);
  const [certificateEvent, setCertificateEvent] = useState<any>(null);
  const [selectedEventForVolunteers, setSelectedEventForVolunteers] = useState<any>(null);
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteerStatusFilter, setVolunteerStatusFilter] = useState("all");
  const [liveAttendanceEvent, setLiveAttendanceEvent] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  const { data: volunteersForEvent = [], isLoading: volunteersLoading } = useQuery({
    queryKey: ["event_volunteers_management", selectedEventForVolunteers?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_volunteers")
        .select("*")
        .eq("event_id", selectedEventForVolunteers!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventForVolunteers,
  });

  const updateVolunteerMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from("event_volunteers")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_volunteers_management", selectedEventForVolunteers?.id] });
      toast.success("Volunteer status updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update volunteer status"),
  });

  const { data: registrationsForEvent = [], isLoading: regsLoading } = useQuery({
    queryKey: ["event_registrations_students", selectedEventForRegs?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", selectedEventForRegs!.id)
        .eq("registration_status", "confirmed")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventForRegs,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ payment_status: "paid", registration_status: "confirmed" })
        .eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_registrations_students", selectedEventForRegs?.id] });
      toast.success("Payment verified and registration confirmed!");
    },
    onError: () => toast.error("Failed to verify payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_posted_events"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });

  const downloadCsvMutation = useMutation({
    mutationFn: async (event: any) => {
      toast.loading("Fetching registrant data...");
      
      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", event.id)
        .eq("registration_status", "confirmed");

      if (regError) throw regError;

      const rows: string[][] = [["Student Name", "USN", "Department", "Semester", "Type"]];
      
      (registrations || []).forEach((reg: any) => {
        rows.push([
          reg.student_name || "N/A",
          reg.usn || "N/A",
          reg.department || "N/A",
          reg.semester || "N/A",
          reg.registration_type || "individual"
        ]);
      });

      const { data: teams, error: teamsError } = await supabase
        .from("registration_teams")
        .select("id")
        .eq("event_id", event.id);

      if (!teamsError && teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("*")
          .in("team_id", teamIds);

        if (!membersError && members) {
          members.forEach((m: any) => {
            const exists = rows.some(row => row[1] === m.usn);
            if (!exists) {
              rows.push([
                m.name || "N/A",
                m.usn || "N/A",
                m.department || "N/A",
                m.semester || "N/A",
                "team_member"
              ]);
            }
          });
        }
      }

      const csvContent = rows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Registrants_${event.title.replace(/\s+/g, "_")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss();
      return { count: rows.length - 1 };
    },
    onSuccess: (data) => {
      toast.success(`Exported ${data.count} registrants to CSV`);
    },
    onError: (err: any) => {
      toast.dismiss();
      toast.error(err.message || "Failed to download CSV");
    },
  });

  const toggleRegistrationMutation = useMutation({
    mutationFn: async ({ eventId, currentStatus }: { eventId: string, currentStatus: boolean }) => {
      const { error } = await supabase
        .from("events")
        .update({ registrations_open: !currentStatus })
        .eq("id", eventId);
      if (error) throw error;
      return !currentStatus;
    },
    onSuccess: (isOpen) => {
      queryClient.invalidateQueries({ queryKey: ["admin_events"] });
      toast.success(isOpen ? "Registrations opened" : "Registrations stopped");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update registration status"),
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-primary animate-pulse font-black uppercase tracking-widest">Loading...</p></div>;
  }

  const collegeName = profile?.colleges?.name;
  const collegeId = profile?.college_id;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pb-32">
      {/* Grid Overlay - Simplified for mobile */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] sm:bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Dynamic Orbs - Simplified for mobile */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden sm:block">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[180px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" 
        />
      </div>

      <Navbar />
      
      <div className="container py-12 md:py-24 lg:py-32 space-y-12 md:space-y-20 relative z-10 px-4 sm:px-6">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className="flex flex-col gap-8"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-primary font-[900] uppercase tracking-[0.2em] text-[10px] sm:text-xs">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Welcome back
            </div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-[900] tracking-tight md:tracking-[-0.06em] text-foreground uppercase leading-[1.1] md:leading-[0.85] break-words">
              WELCOME <br className="hidden sm:block" />
              <span className="text-primary">{profile?.full_name?.split(' ')[0] || "STUDENT"}</span>
            </h1>
            <div className="flex gap-4 flex-wrap items-center">
              {isAdmin ? (
                <div className="px-6 py-2 rounded-full border-2 border-primary text-[10px] font-[900] uppercase tracking-widest text-primary">
                  Organizer
                </div>
              ) : (
                <div className="px-6 py-2 rounded-full border-2 border-border/80 text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">
                  Student
                </div>
              )}
              <div className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-[900] uppercase tracking-widest flex items-center gap-2">
                <Award className="h-3 w-3" /> {activityPoints} ACTIVITY POINTS
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full sm:w-auto h-14 md:h-20 px-8 md:px-10 rounded-full bg-foreground text-background font-[900] uppercase tracking-tighter text-lg md:text-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-primary hover:text-background shadow-2xl"
            >
              <QrCode className="h-5 w-5 md:h-6 md:w-6" />
              Mark Attendance
            </button>
            {isAdmin && (
              <Link to="/create-event" className="w-full sm:w-auto">
                <button className="w-full h-14 md:h-20 px-8 md:px-10 rounded-full border-2 border-foreground text-foreground font-[900] uppercase tracking-tighter text-lg md:text-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-foreground hover:text-background flex-1">
                  <PlusCircle className="h-5 w-5 md:h-6 md:w-6" />
                  Create Event
                </button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Organizer Card / Apply Card */}
          {isAdmin && adminRequest?.status === "approved" ? (
            <div className="md:col-span-2 flex relative h-full w-full overflow-hidden rounded-[40px] group shadow-2xl">
              {/* Animated gradient background border */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-amber-500/40 via-primary/40 to-purple-500/40 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="absolute inset-[2px] bg-card/95 backdrop-blur-3xl rounded-[38px] transition-all duration-700"></div>
              
              <div className="relative h-full w-full p-6 sm:p-12 flex flex-col sm:flex-row items-center gap-8 overflow-hidden rounded-[40px]">
                {/* Background ambient glow */}
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-700"></div>
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_40px_rgba(251,191,36,0.3)] shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_60px_rgba(251,191,36,0.5)] transition-all duration-500">
                    <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center border border-amber-500/20">
                      <Award className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                    </div>
                    {/* Sparkles */}
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full"
                    >
                      <Sparkles className="absolute -top-3 left-1/2 w-6 h-6 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                      <Sparkles className="absolute bottom-1 -right-2 w-4 h-4 text-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    </motion.div>
                  </div>
                </div>

                <div className="relative z-10 space-y-3 text-center sm:text-left break-words flex-1">
                  <div className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <p className="text-[10px] sm:text-xs font-[900] uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-primary">
                      {profile?.full_name || "Organizer"}
                    </p>
                    <div className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                      <span className="text-[10px] sm:text-xs font-[900] uppercase tracking-widest text-amber-500 mt-[1px]">Verified Organiser</span>
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-[900] text-foreground tracking-tighter leading-none uppercase drop-shadow-lg">
                    {profile?.clubs?.name || (adminRequest as any)?.clubs?.name || "VERIFIED CLUB"}
                  </h2>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => navigate("/apply-admin")}
              className="md:col-span-2 relative overflow-hidden rounded-[40px] bg-card border-2 border-border hover:border-primary p-6 sm:p-12 flex items-center justify-between group cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 rounded-full border-2 border-border/80 flex items-center justify-center group-hover:border-primary transition-colors">
                  <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-4xl font-[900] text-foreground uppercase tracking-tighter">Become an Organizer</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Apply to manage events for your club</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </div>
          )}

          {/* College Info Card */}
          {collegeName && (
            <div 
              onClick={() => navigate(`/events?college=${collegeId}`)}
              className="relative overflow-hidden rounded-[40px] bg-primary border-2 border-primary p-6 sm:p-12 flex flex-col justify-between group cursor-pointer transition-all duration-300"
            >
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-background mb-8 sm:mb-12" />
              <div className="break-words">
                <p className="text-[10px] font-[900] text-background/60 uppercase tracking-widest mb-1">Your College</p>
                <h3 className="text-xl sm:text-3xl font-[900] text-background uppercase tracking-tighter leading-none">{collegeName}</h3>
              </div>
            </div>
          )}
        </div>

        {/* Alerts Section */}
        <div className="space-y-4">
          {adminRequest?.status === "pending" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
              <Clock className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <p className="font-black text-amber-500 text-xs uppercase tracking-widest mb-1">Application Pending</p>
                <p className="text-sm font-medium text-amber-200/80">
                  Your request to manage <span className="text-foreground">{(adminRequest as any).clubs?.name}</span> is being reviewed. You'll be notified once it's approved.
                </p>
              </div>
            </motion.div>
          )}

          {adminRequest?.status === "rejected" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="font-black text-red-500 text-xs uppercase tracking-widest mb-1">Application Rejected</p>
                <p className="text-sm font-medium text-red-200/80">
                  Your request for <span className="text-foreground">{(adminRequest as any).clubs?.name}</span> was not approved. You can submit a new application.
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto text-red-400 font-bold uppercase tracking-tighter mt-2" onClick={() => navigate("/apply-admin")}>Re-apply Now</Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* My Registered Events */}
        <div className="space-y-12">
          <div className="flex items-end justify-between border-b-2 border-border pb-6">
            <h2 className="text-4xl sm:text-6xl font-[900] text-foreground tracking-[-0.04em] uppercase leading-none">
              MY <span className="text-primary">EVENTS</span>
            </h2>
            <Link to="/events" className="hidden sm:block">
              <button className="px-6 py-2 rounded-full border-2 border-border/80 text-[10px] font-[900] text-foreground uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
                VIEW ALL
              </button>
            </Link>
          </div>

          {registeredEvents.length === 0 ? (
            <div className="rounded-[40px] border-2 border-dashed border-border bg-card/80 p-20 text-center flex flex-col items-center gap-8">
              <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <p className="font-[900] text-2xl text-foreground uppercase tracking-tighter">NO EVENTS YET</p>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">YOU HAVEN'T REGISTERED FOR ANY EVENTS</p>
              </div>
              <Link to="/events">
                <button className="h-16 px-10 rounded-full bg-primary text-primary-foreground font-[900] uppercase tracking-tighter active:scale-95 transition-all">BROWSE EVENTS</button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {registeredEvents.map((reg: any, i: number) => {
                const expired = reg.events?.end_date ? isPast(new Date(reg.events.end_date)) : (reg.events?.start_date ? isPast(new Date(reg.events.start_date)) : false);
                return (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative overflow-hidden rounded-[40px] bg-card border-2 border-border/50 hover:border-primary/40 transition-all duration-500 ${expired ? "opacity-40" : ""}`}
                    onClick={() => navigate(`/events/${reg.event_id}`)}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {reg.events?.cover_image_url ? (
                        <img 
                          src={reg.events.cover_image_url} 
                          alt="" 
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="h-full w-full bg-neutral-900" />
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      
                      <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                        {expired && <div className="bg-background text-foreground px-3 py-1 rounded-full text-[8px] font-[900] uppercase tracking-widest border border-border/80">PAST</div>}
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[8px] font-[900] uppercase tracking-widest">REGISTERED</div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-[900] text-primary tracking-widest">
                          {reg.events?.colleges?.name || "CAMPUS"}
                        </div>
                        <h3 className="text-2xl font-[900] text-foreground leading-[1.1] uppercase tracking-tighter line-clamp-2">
                          {reg.events?.title}
                        </h3>
                      </div>
                      
                      <div className="pt-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                        <TicketDownload 
                          registrationId={reg.id}
                          eventTitle={reg.events?.title || "Event"}
                          studentName={reg.student_name}
                          usn={reg.usn}
                          eventDate={reg.events?.start_date}
                          eventLocation={reg.events?.venue || reg.events?.location}
                          compact
                        />
                        <CertificateDownload 
                          eventId={reg.event_id}
                          eventTitle={reg.events?.title}
                          compact
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Volunteering Section */}
        {!isAdmin && volunteeringEvents.length > 0 && (
          <div className="space-y-12">
            <div className="flex items-end justify-between border-b-2 border-border pb-6">
              <h2 className="text-4xl sm:text-6xl font-[900] text-foreground tracking-[-0.04em] uppercase leading-none">
                VOLUNTEERING
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {volunteeringEvents.map((vol: any, i: number) => {
                const expired = vol.events?.end_date ? isPast(new Date(vol.events.end_date)) : (vol.events?.start_date ? isPast(new Date(vol.events.start_date)) : false);
                return (
                  <motion.div
                    key={vol.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative overflow-hidden rounded-[40px] bg-card border-2 border-border/50 hover:border-emerald-500/40 transition-all duration-500 ${expired ? "opacity-40" : ""}`}
                    onClick={() => navigate(`/events/${vol.event_id}`)}
                  >
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 flex items-center justify-center bg-background">
                          <Users className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className={`${
                          vol.status === 'approved' ? 'bg-emerald-500' :
                          vol.status === 'rejected' ? 'bg-red-500' :
                          'bg-amber-500'
                        } text-background px-4 py-1 rounded-full font-[900] text-[8px] uppercase tracking-widest`}>
                          {vol.status?.toUpperCase() || 'PENDING'}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-[900] text-emerald-500 tracking-widest">VOLUNTEERING FOR</p>
                          <h3 className="text-2xl font-[900] text-foreground leading-[1.1] uppercase tracking-tighter line-clamp-2">
                            {vol.events?.title}
                          </h3>
                        </div>

                        <div className="pt-4" onClick={(e) => e.stopPropagation()}>
                          <CertificateDownload 
                            eventId={vol.event_id}
                            eventTitle={vol.events?.title}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Posted Events Section */}
        {isAdmin && (
          <div className="space-y-12">
            <div className="flex items-end justify-between border-b-2 border-border pb-6">
              <h2 className="text-4xl sm:text-6xl font-[900] text-foreground tracking-[-0.04em] uppercase leading-none">
                EVENT <span className="text-cyan-400">MANAGEMENT</span>
              </h2>
              <Link to="/create-event" className="hidden sm:block">
                <button className="h-16 px-10 rounded-full bg-cyan-400 text-background font-[900] uppercase tracking-tighter active:scale-95 transition-all">
                  CREATE EVENT
                </button>
              </Link>
            </div>

            {postedEvents.length === 0 ? (
              <div className="rounded-[40px] border-2 border-dashed border-border bg-card/80 p-16 text-center">
                <p className="font-[900] text-muted-foreground/60 uppercase tracking-widest">NO EVENTS CREATED YET</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {postedEvents.map((event: any) => {
                  const expired = event.end_date ? isPast(new Date(event.end_date)) : isPast(new Date(event.start_date));
                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className={`group relative overflow-hidden rounded-[32px] bg-card border-2 border-border/50 hover:border-border/80 p-6 flex flex-col lg:flex-row items-center gap-8 transition-all duration-300 ${expired ? "opacity-40" : ""}`}
                    >
                      <div className="relative h-32 w-full lg:w-48 rounded-2xl overflow-hidden shrink-0 border-2 border-border">
                        {event.cover_image_url ? (
                          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="h-full w-full bg-neutral-900" />
                        )}
                        {event.registrations_open && (
                          <div className="absolute top-4 right-4 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2 text-center lg:text-left">
                        <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 text-[10px] font-[900] uppercase tracking-widest text-muted-foreground mb-1">
                          <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> {format(new Date(event.start_date), "MMM d, h:mm a")}</span>
                          <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-primary" /> {event.venue || "CAMPUS"}</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-[900] text-foreground uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{event.title}</h3>
                        <EventCardStats eventId={event.id} eventType={event.event_type} maxParticipants={event.max_participants} maxTeams={(event as any).max_teams} />
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <div className="flex gap-2 p-2 bg-background rounded-full border-2 border-border/50">
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-background transition-all" title="Live Attendance" onClick={() => setLiveAttendanceEvent(event)}>
                            <QrCode className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-background transition-all" title="Manual Attendance" onClick={() => setAttendanceEvent(event)}>
                            <ClipboardCheck className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-pink-500 hover:bg-pink-500 hover:text-background transition-all" title="Volunteers" onClick={() => setSelectedEventForVolunteers(event)}>
                            <HandHeart className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="flex gap-2 p-2 bg-background rounded-full border-2 border-border/50">
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-background transition-all" title="Registrations" onClick={() => setSelectedEventForRegs(event)}>
                            <Users className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-background transition-all" title="Certificates" onClick={() => setCertificateEvent(event)}>
                            <Award className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-indigo-500 hover:bg-indigo-500 hover:text-background transition-all" onClick={() => downloadCsvMutation.mutate(event)} title="Export CSV">
                            <Download className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="flex gap-2 p-2 bg-background rounded-full border-2 border-border/50">
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" onClick={() => navigate(`/events/${event.id}`)}>
                            <ExternalLink className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all" onClick={() => navigate(`/edit-event/${event.id}`)}>
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button className="h-12 w-12 rounded-full flex items-center justify-center text-red-500/60 hover:text-red-500 transition-all" onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(event.id); }}>
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AttendanceManager 
        event={attendanceEvent} 
        open={!!attendanceEvent} 
        onOpenChange={(open) => !open && setAttendanceEvent(null)} 
      />

      <CertificateDesigner 
        event={certificateEvent} 
        open={!!certificateEvent} 
        onOpenChange={(open) => !open && setCertificateEvent(null)} 
      />

      <LiveAttendanceOrganizer
        event={liveAttendanceEvent}
        open={!!liveAttendanceEvent}
        onOpenChange={(open) => !open && setLiveAttendanceEvent(null)}
      />

      <LiveAttendanceScanner
        open={showScanner}
        onOpenChange={setShowScanner}
      />

      <Dialog open={!!selectedEventForRegs} onOpenChange={(open) => !open && setSelectedEventForRegs(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-2 border-border text-foreground rounded-[24px] sm:rounded-[40px] p-0">
          <div className="p-6 sm:p-12 space-y-8 sm:space-y-12">
            <DialogHeader className="space-y-4">
              <div className="text-[10px] font-[900] uppercase tracking-widest text-primary">REGISTRATIONS</div>
              <DialogTitle className="text-4xl sm:text-5xl font-[900] uppercase tracking-tighter leading-none">
                REGISTRANTS: <span className="text-muted-foreground">{selectedEventForRegs?.title}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  placeholder="Search by name, USN..."
                  className="w-full pl-14 pr-6 h-16 bg-card border-2 border-border/50 rounded-full focus:border-primary/40 outline-none transition-all font-medium text-sm normal-case text-foreground placeholder:text-muted-foreground/60"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger className="w-full sm:w-[240px] h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-[10px] text-foreground outline-none focus:ring-0">
                  <SelectValue placeholder="ACCESS LEVEL" />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                  <SelectItem value="all" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">ALL STUDENTS</SelectItem>
                  <SelectItem value="paid" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">PAID</SelectItem>
                  <SelectItem value="free" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">FREE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[24px] sm:rounded-[32px] border-2 border-border/50 overflow-x-auto bg-card/80">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-muted">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">STUDENT</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">ID / USN</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">DEPT</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 font-[900] uppercase tracking-widest text-muted-foreground/60 animate-pulse">Loading registrations...</TableCell>
                    </TableRow>
                  ) : (() => {
                    const filtered = registrationsForEvent.filter((r: any) => {
                      const matchesSearch =
                        r.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.usn?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.college_email?.toLowerCase().includes(studentSearch.toLowerCase());

                      const matchesFilter =
                        studentFilter === "all" ||
                        (studentFilter === "paid" && r.payment_status !== "free") ||
                        (studentFilter === "free" && r.payment_status === "free");

                      return matchesSearch && matchesFilter;
                    });

                    if (filtered.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20 font-[900] uppercase tracking-widest text-muted-foreground/60">No matching records found</TableCell>
                        </TableRow>
                      );
                    }

                    return filtered.map((reg: any) => (
                      <TableRow key={reg.id} className="border-border/50 hover:bg-accent/50 transition-colors">
                        <TableCell className="py-8 px-8 border-r-2 border-border/50">
                          <div>
                            <p className="text-foreground font-[900] uppercase tracking-tight text-sm">{reg.student_name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{reg.college_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-[900] text-xs tracking-widest text-primary py-8 px-8 border-r-2 border-border/50">{reg.usn}</TableCell>
                        <TableCell className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest py-8 px-8 border-r-2 border-border/50">{reg.department || "N/A"}</TableCell>
                        <TableCell className="py-8 px-8 text-right">
                          <div className="flex items-center justify-between gap-4">
                            <div className={`${reg.payment_status === "paid" || reg.payment_status === "free" ? "bg-emerald-500" : "bg-amber-500"} text-background px-4 py-1 rounded-full font-[900] text-[8px] uppercase tracking-widest`}>
                              {reg.payment_status?.toUpperCase() || "PENDING"}
                            </div>
                            {reg.payment_status === "pending" && (
                              <button 
                                className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-[900] text-[10px] tracking-widest uppercase hover:scale-105 transition-all"
                                onClick={() => verifyPaymentMutation.mutate(reg.id)}
                                disabled={verifyPaymentMutation.isPending}
                              >
                                {verifyPaymentMutation.isPending ? "OK..." : "VERIFY"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEventForVolunteers} onOpenChange={(open) => !open && setSelectedEventForVolunteers(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-2 border-border text-foreground rounded-[24px] sm:rounded-[40px] p-0">
          <div className="p-6 sm:p-12 space-y-8 sm:space-y-12">
            <DialogHeader className="space-y-4">
              <div className="text-[10px] font-[900] uppercase tracking-widest text-emerald-500">VOLUNTEER MANAGEMENT</div>
              <DialogTitle className="text-4xl sm:text-5xl font-[900] uppercase tracking-tighter leading-none">
                VOLUNTEERS: <span className="text-muted-foreground">{selectedEventForVolunteers?.title}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  placeholder="SEARCH VOLUNTEERS..."
                  className="w-full pl-14 pr-6 h-16 bg-card border-2 border-border/50 rounded-full focus:border-emerald-500/40 outline-none transition-all font-[900] text-xs tracking-widest uppercase text-foreground placeholder:text-muted-foreground/60"
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                />
              </div>
              <Select value={volunteerStatusFilter} onValueChange={setVolunteerStatusFilter}>
                <SelectTrigger className="w-full sm:w-[240px] h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-[10px] text-foreground outline-none focus:ring-0">
                  <SelectValue placeholder="STATUS" />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                  <SelectItem value="all" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">ALL STATUSES</SelectItem>
                  <SelectItem value="pending" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">PENDING</SelectItem>
                  <SelectItem value="approved" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">APPROVED</SelectItem>
                  <SelectItem value="rejected" className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[24px] sm:rounded-[32px] border-2 border-border/50 overflow-x-auto bg-card/80">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-muted">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">VOLUNTEER</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">ID / USN</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">DEPT</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground border-r-2 border-border/50">STATUS</TableHead>
                    <TableHead className="font-[900] uppercase tracking-widest text-[10px] py-8 px-8 text-muted-foreground">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 font-[900] uppercase tracking-widest text-muted-foreground/60 animate-pulse">LOADING VOLUNTEERS...</TableCell>
                    </TableRow>
                  ) : (() => {
                    const filtered = volunteersForEvent.filter((v: any) => {
                      const matchesSearch =
                        v.full_name?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.usn?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.college_email?.toLowerCase().includes(volunteerSearch.toLowerCase());

                      const matchesFilter =
                        volunteerStatusFilter === "all" || v.status === volunteerStatusFilter;

                      return matchesSearch && matchesFilter;
                    });

                    if (filtered.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-20 font-[900] uppercase tracking-widest text-muted-foreground/60">NO VOLUNTEERS FOUND</TableCell>
                        </TableRow>
                      );
                    }

                    return filtered.map((vol: any) => (
                      <TableRow key={vol.id} className="border-border/50 hover:bg-accent/50 transition-colors">
                        <TableCell className="py-8 px-8 border-r-2 border-border/50">
                          <div>
                            <p className="text-foreground font-[900] uppercase tracking-tight text-sm">{vol.full_name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{vol.college_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-[900] text-xs tracking-widest text-emerald-500 py-8 px-8 border-r-2 border-border/50">{vol.usn}</TableCell>
                        <TableCell className="font-[900] text-[10px] tracking-widest text-muted-foreground uppercase py-8 px-8 border-r-2 border-border/50">{vol.department || "N/A"}</TableCell>
                        <TableCell className="py-8 px-8 border-r-2 border-border/50">
                          <div className={`${
                            vol.status === 'approved' ? 'bg-emerald-500' :
                            vol.status === 'rejected' ? 'bg-red-500' :
                            'bg-amber-500'
                          } text-background px-4 py-1 rounded-full font-[900] text-[8px] uppercase tracking-widest inline-block`}>
                            {vol.status?.toUpperCase() || 'PENDING'}
                          </div>
                        </TableCell>
                        <TableCell className="py-8 px-8 text-right">
                          <div className="flex justify-end gap-2">
                            {vol.status !== "approved" && (
                              <button 
                                className="px-6 py-2 rounded-full border-2 border-emerald-500 text-emerald-500 font-[900] text-[10px] tracking-widest uppercase hover:bg-emerald-500 hover:text-background transition-all"
                                onClick={() => updateVolunteerMutation.mutate({ id: vol.id, status: "approved" })}
                                disabled={updateVolunteerMutation.isPending}
                              >
                                APPROVE
                              </button>
                            )}
                            {vol.status !== "rejected" && (
                              <button 
                                className="px-6 py-2 rounded-full border-2 border-red-500 text-red-500 font-[900] text-[10px] tracking-widest uppercase hover:bg-red-500 hover:text-background transition-all"
                                onClick={() => updateVolunteerMutation.mutate({ id: vol.id, status: "rejected" })}
                                disabled={updateVolunteerMutation.isPending}
                              >
                                REJECT
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
