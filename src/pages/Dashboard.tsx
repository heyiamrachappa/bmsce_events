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
import { CalendarDays, Users, Building2, PlusCircle, Trash2, Pencil, ExternalLink, Sparkles, Clock, XCircle, CheckCircle2, ShieldCheck, Heart, Search, ChevronRight, X, ClipboardCheck, Award, FileSpreadsheet, Download, PlayCircle, StopCircle, QrCode, Zap, Rocket } from "lucide-react";
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
      const { data } = await supabase
        .from("event_registrations")
        .select("id, event_id, student_name, usn, events(id, title, start_date, end_date, location, venue, colleges(name), cover_image_url, archived)")
        .eq("user_id", user!.id)
        .order("registered_at", { ascending: false });
      return data || [];
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
    return <div className="min-h-screen flex items-center justify-center bg-black/90"><p className="text-primary animate-pulse font-black uppercase tracking-widest">Initialising Portal...</p></div>;
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
      
      <div className="container py-24 sm:py-32 space-y-8 sm:space-y-12 relative z-10">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> Portal for the Elite
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter font-display text-white italic uppercase leading-[0.9]">
              WELCOME BACK, <br />
              <span className="text-premium-gradient hero-title-mask block mt-1">{profile?.full_name?.split(' ')[0] || "COMMANDER"}</span>
            </h1>
            <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
              {isAdmin ? (
                <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Club Organizer
                </div>
              ) : (
                <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Elite Student
                </div>
              )}
              <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <Award className="h-3 w-3" /> {activityPoints} Points Earned
              </div>
              {adminRequest?.status === "approved" && (adminRequest as any).clubs?.name && (
                <div className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-white">
                  {(adminRequest as any).clubs.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 min-w-[280px]">
            <Button 
              onClick={() => setShowScanner(true)}
              className="btn-vivid h-16 rounded-[20px] shadow-2xl group border-0"
            >
              <QrCode className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest">Mark Attendance</span>
            </Button>
          </div>
        </motion.div>

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Organizer Card / Apply Card */}
          {isAdmin && adminRequest?.status === "approved" ? (
            <div className="md:col-span-2 relative overflow-hidden rounded-[32px] glass-panel border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20 opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-emerald-500/20 flex items-center justify-center shadow-inner" style={{ boxShadow: "var(--glow-emerald)" }}>
                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-pulse" />
              </div>
              <div className="relative z-10 space-y-1 sm:space-y-2 text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Verified Organization</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none uppercase font-display">
                  {profile?.clubs?.name || (adminRequest as any)?.clubs?.name || "Verified Organizer"}
                </h2>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Leading the BMSCE ecosystem
                </p>
              </div>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-emerald-500" />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => navigate("/apply-admin")}
              className="md:col-span-2 relative overflow-hidden rounded-[32px] glass-card-premium border border-white/5 hover:border-primary/30 p-8 flex items-center justify-between group cursor-pointer transition-all duration-500"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Lead Your Own Tribe</h2>
                  <p className="text-sm font-medium text-muted-foreground">Apply for club organizer access and build your legacy.</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </div>
          )}

          {/* College Info Card */}
          {collegeName && (
            <div 
              onClick={() => navigate(`/events?college=${collegeId}`)}
              className="relative overflow-hidden rounded-[32px] glass-card-premium border border-white/5 hover:border-amber-500/30 p-8 flex flex-col justify-between group cursor-pointer transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Building2 className="w-10 h-10 text-amber-500/60 mb-4 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-500" />
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{collegeName}</h3>
                <p className="text-xs font-bold text-muted-foreground tracking-widest group-hover:text-amber-400 transition-colors">CAMPUS UPDATES & ALERTS</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-15 transition-opacity">
                <Rocket className="w-24 h-24 text-amber-500" />
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
                <p className="font-black text-amber-500 text-xs uppercase tracking-widest mb-1">Status: Extraction In Progress</p>
                <p className="text-sm font-medium text-amber-200/80">
                  Your request to manage <span className="text-white">{(adminRequest as any).clubs?.name}</span> is being processed by the council. Stay sharp.
                </p>
              </div>
            </motion.div>
          )}

          {adminRequest?.status === "rejected" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="font-black text-red-500 text-xs uppercase tracking-widest mb-1">Status: Access Denied</p>
                <p className="text-sm font-medium text-red-200/80">
                  Your request for <span className="text-white">{(adminRequest as any).clubs?.name}</span> was neutralized. Re-evaluate and apply again.
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto text-red-400 font-bold uppercase tracking-tighter mt-2" onClick={() => navigate("/apply-admin")}>Re-apply Now</Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* My Registered Events */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase font-display flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-500 fill-pink-500" /> My Experiences
            </h2>
            <Link to="/events">
              <Button variant="ghost" className="text-muted-foreground hover:text-white group text-xs uppercase font-black tracking-widest">
                Watch All <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform text-primary" />
              </Button>
            </Link>
          </div>

          {registeredEvents.length === 0 ? (
            <div className="rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.02] p-20 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-xl text-white uppercase tracking-tight">No deployments yet</p>
                <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                  Your dashboard is empty. Find upcoming events to join.
                </p>
              </div>
              <Link to="/events">
                <Button className="btn-vivid h-14 px-8 rounded-2xl font-black uppercase tracking-widest">Explore Events</Button>
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
                    className={`group relative overflow-hidden rounded-[40px] glass-card-premium border border-white/5 ${window.matchMedia("(hover: hover)").matches ? "hover:border-primary/20" : ""} transition-all duration-500 ${expired ? "opacity-60 saturate-50" : ""}`}
                    onClick={() => navigate(`/events/${reg.event_id}`)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      {reg.events?.cover_image_url ? (
                        <img 
                          src={reg.events.cover_image_url} 
                          alt="" 
                          className={`h-full w-full object-cover transition-transform duration-700 ${window.matchMedia("(hover: hover)").matches ? "group-hover:scale-110" : ""}`} 
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
                      
                      <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                        {expired && <Badge className="bg-black/80 text-white border-white/10 uppercase font-black text-[8px] tracking-[0.2em] px-3">PAST</Badge>}
                        <Badge className="bg-primary/80 text-white border-0 uppercase font-black text-[8px] tracking-[0.2em] px-3">REGISTERED</Badge>
                      </div>
                    </div>

                    <div className="p-8 -mt-12 relative z-20">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-primary mb-1">
                          {reg.events?.colleges?.name || "CAMPUS EVENT"}
                        </p>
                        <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                          {reg.events?.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider pt-2">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {reg.events?.start_date && format(new Date(reg.events.start_date), "MMM d, yyyy")}</span>
                          {reg.events?.venue && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" /> {reg.events.venue}</span>}
                        </div>
                        
                        <div className="pt-6 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Volunteering Section */}
        {!isAdmin && volunteeringEvents.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase font-display flex items-center gap-3">
              <Zap className="h-8 w-8 text-emerald-500 fill-emerald-500" /> Crew Operations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {volunteeringEvents.map((vol: any, i: number) => {
                const expired = vol.events?.end_date ? isPast(new Date(vol.events.end_date)) : (vol.events?.start_date ? isPast(new Date(vol.events.start_date)) : false);
                return (
                  <motion.div
                    key={vol.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative overflow-hidden rounded-[40px] bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 ${expired ? "opacity-60 grayscale" : ""}`}
                    onClick={() => navigate(`/events/${vol.event_id}`)}
                  >
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-emerald-500" />
                        </div>
                        <Badge className={`${
                          vol.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/20' :
                          vol.status === 'rejected' ? 'bg-red-500 shadow-red-500/20' :
                          'bg-amber-500 shadow-amber-500/20'
                        } text-white border-0 font-black text-[8px] tracking-[0.2em] p-2`}>
                          {vol.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-emerald-500">Volunteering Crew</p>
                        <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:text-emerald-500 transition-colors line-clamp-2">
                          {vol.events?.title}
                        </h3>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 text-white/50">
                          <Clock className="h-3.5 w-3.5" />
                          {vol.events?.start_date && format(new Date(vol.events.start_date), "MMM d, yyyy")}
                        </div>

                        <div className="pt-2" onClick={(e) => e.stopPropagation()}>
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
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase font-display flex items-center gap-3">
                <Rocket className="h-8 w-8 text-cyan-400 animate-float" /> Event Manager
              </h2>
              <Link to="/create-event">
                <Button className="btn-cyber h-14 px-8 rounded-2xl font-black uppercase tracking-widest gap-2">
                  <PlusCircle className="h-5 w-5" /> Launch Event
                </Button>
              </Link>
            </div>

            {postedEvents.length === 0 ? (
              <div className="rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.02] p-16 text-center">
                <p className="font-black text-muted-foreground uppercase tracking-[0.2em]">No events deployed to the grid yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {postedEvents.map((event: any) => {
                  const expired = event.end_date ? isPast(new Date(event.end_date)) : isPast(new Date(event.start_date));
                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className={`group relative overflow-hidden rounded-[32px] glass-panel border border-white/5 hover:border-white/10 p-6 flex flex-col lg:flex-row items-center gap-8 transition-all duration-300 ${expired ? "opacity-60 saturate-50" : ""}`}
                    >
                      <div className="relative h-24 w-40 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
                        {event.cover_image_url ? (
                          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                        )}
                        {event.registrations_open && (
                          <div className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2 text-center lg:text-left">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">{event.title}</h3>
                        <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {format(new Date(event.start_date), "MMM d, h:mm a")}</span>
                          <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {event.venue || "CAMPUS"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <div className="flex gap-2 p-2 bg-white/5 rounded-2xl border border-white/5">
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/20" title="Live Attendance" onClick={() => setLiveAttendanceEvent(event)}>
                            <QrCode className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-500 hover:bg-emerald-500/20" title="Manual Attendance" onClick={() => setAttendanceEvent(event)}>
                            <ClipboardCheck className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-pink-500 hover:bg-pink-500/20" title="Volunteers" onClick={() => setSelectedEventForVolunteers(event)}>
                            <Heart className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-2 p-2 bg-white/5 rounded-2xl border border-white/5">
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-500 hover:bg-blue-500/20" title="Registrations" onClick={() => setSelectedEventForRegs(event)}>
                            <Users className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-amber-500 hover:bg-amber-500/20" title="Certificates" onClick={() => setCertificateEvent(event)}>
                            <Award className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-indigo-500 hover:bg-indigo-500/20" onClick={() => downloadCsvMutation.mutate(event)} title="Export CSV">
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="flex gap-2 p-2 bg-white/5 rounded-2xl border border-white/5">
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-primary/10" onClick={() => navigate(`/events/${event.id}`)}>
                            <ExternalLink className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-primary/10" onClick={() => navigate(`/edit-event/${event.id}`)}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500/60 hover:bg-red-500/20" onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(event.id); }}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Event Registrants: {selectedEventForRegs?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student credentials..."
                  className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 transition-all font-medium text-white"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-14 bg-white/5 border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white">
                  <SelectValue placeholder="Access Level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all">ALL OPERATIVES</SelectItem>
                  <SelectItem value="paid">PAID MISSIONS</SelectItem>
                  <SelectItem value="free">FREE ACCESS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[32px] border border-white/10 overflow-hidden bg-white/[0.02]">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-white/70">Student</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-white/70">ID / USN</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-white/70">Dept</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-white/70">Status</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-right text-white/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing...</TableCell>
                    </TableRow>
                  ) : registrationsForEvent
                    .filter((r: any) => {
                      const matchesSearch =
                        r.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.usn?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.college_email?.toLowerCase().includes(studentSearch.toLowerCase());

                      const matchesFilter =
                        studentFilter === "all" ||
                        (studentFilter === "paid" && r.payment_status !== "free") ||
                        (studentFilter === "free" && r.payment_status === "free");

                      return matchesSearch && matchesFilter;
                    })
                    .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 font-black uppercase tracking-[0.2em] text-muted-foreground">No records found.</TableCell>
                    </TableRow>
                  ) : registrationsForEvent
                    .filter((r: any) => {
                      const matchesSearch =
                        r.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.usn?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        r.college_email?.toLowerCase().includes(studentSearch.toLowerCase());

                      const matchesFilter =
                        studentFilter === "all" ||
                        (studentFilter === "paid" && r.payment_status !== "free") ||
                        (studentFilter === "free" && r.payment_status === "free");

                      return matchesSearch && matchesFilter;
                    })
                    .map((reg: any) => (
                    <TableRow key={reg.id} className="border-white/5 hover:bg-white/[0.05] transition-colors">
                      <TableCell className="font-bold py-6 px-6">
                        <div>
                          <p className="text-white uppercase tracking-tight">{reg.student_name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{reg.college_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-xs tracking-widest text-primary">{reg.usn}</TableCell>
                      <TableCell className="font-bold text-xs text-muted-foreground uppercase">{reg.department || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className={`${reg.payment_status === "paid" || reg.payment_status === "free" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-amber-500/20 text-amber-400 border-amber-500/20"} uppercase font-black text-[8px] tracking-[0.2em] px-3`}>
                          {reg.payment_status?.toUpperCase() || "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {reg.payment_status === "pending" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-full border border-primary/30 text-primary hover:bg-primary font-black text-[10px] tracking-widest"
                            onClick={() => verifyPaymentMutation.mutate(reg.id)}
                            disabled={verifyPaymentMutation.isPending}
                          >
                            VERIFY
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEventForVolunteers} onOpenChange={(open) => !open && setSelectedEventForVolunteers(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Crew Manifest: {selectedEventForVolunteers?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:border-emerald-500/50 transition-all font-medium text-white"
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                />
              </div>
              <Select value={volunteerStatusFilter} onValueChange={setVolunteerStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-14 bg-white/5 border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white">
                  <SelectValue placeholder="Security Clearance" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all">ALL CLEARANCES</SelectItem>
                  <SelectItem value="pending">PENDING ACCESS</SelectItem>
                  <SelectItem value="approved">AUTHORIZED</SelectItem>
                  <SelectItem value="rejected">REVOKED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[32px] border border-white/10 overflow-hidden bg-white/[0.02]">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-6 text-white/70">Crew Member</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-white/70">ID / USN</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-white/70">Clearance</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 text-right text-white/70">Auth Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteersLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Scanning biometric data...</TableCell>
                    </TableRow>
                  ) : volunteersForEvent
                    .filter((v: any) => {
                      const matchesSearch =
                        v.full_name?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.usn?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.college_email?.toLowerCase().includes(volunteerSearch.toLowerCase());

                      const matchesFilter =
                        volunteerStatusFilter === "all" || v.status === volunteerStatusFilter;

                      return matchesSearch && matchesFilter;
                    })
                    .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 font-black uppercase tracking-[0.2em] text-muted-foreground">No crew members on record.</TableCell>
                    </TableRow>
                  ) : volunteersForEvent
                    .filter((v: any) => {
                      const matchesSearch =
                        v.full_name?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.usn?.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        v.college_email?.toLowerCase().includes(volunteerSearch.toLowerCase());

                      const matchesFilter =
                        volunteerStatusFilter === "all" || v.status === volunteerStatusFilter;

                      return matchesSearch && matchesFilter;
                    })
                    .map((vol: any) => (
                    <TableRow key={vol.id} className="border-white/5 hover:bg-white/[0.05] transition-colors">
                      <TableCell className="font-bold py-6 px-6">
                        <div>
                          <p className="text-white uppercase tracking-tight">{vol.full_name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{vol.college_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-xs tracking-widest text-emerald-500">{vol.usn}</TableCell>
                      <TableCell>
                        <Badge className={`${
                          vol.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                          vol.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                          'bg-amber-500/20 text-amber-400 border-amber-500/20'
                        } uppercase font-black text-[8px] tracking-[0.2em] px-3`}>
                          {vol.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {vol.status !== "approved" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-50 font-black text-[10px] tracking-widest"
                              onClick={() => updateVolunteerMutation.mutate({ id: vol.id, status: "approved" })}
                              disabled={updateVolunteerMutation.isPending}
                            >
                              GRANT
                            </Button>
                          )}
                          {vol.status !== "rejected" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 rounded-full border border-red-500/30 text-red-400 hover:bg-red-50 font-black text-[10px] tracking-widest"
                              onClick={() => updateVolunteerMutation.mutate({ id: vol.id, status: "rejected" })}
                              disabled={updateVolunteerMutation.isPending}
                            >
                              REVOKE
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
