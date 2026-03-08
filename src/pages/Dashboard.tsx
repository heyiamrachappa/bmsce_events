import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Building2, PlusCircle, Trash2, Pencil, ExternalLink, Sparkles, Clock, XCircle, CheckCircle2, ShieldCheck, Heart, Search, ChevronRight, X, ClipboardCheck, Award } from "lucide-react";
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

  // Events the user registered for (active only)
  const { data: registeredEvents = [] } = useQuery({
    queryKey: ["my_registrations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, event_id, events(id, title, start_date, end_date, location, venue, colleges(name), cover_image_url, archived)")
        .eq("user_id", user!.id);
      // Filter out expired or archived events
      return (data || []).filter((r: any) => {
        const endDate = r.events?.end_date || r.events?.start_date;
        return !isPast(new Date(endDate)) && !r.events?.archived;
      });
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
      const { data } = await supabase.from("clubs").select("*").order("name");
      return data || [];
    },
  });

  const categories = Array.from(new Set(allClubs.map((c: any) => c.category)));

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all"); // all, paid, free
  const [attendanceEvent, setAttendanceEvent] = useState<any>(null);
  const [certificateEvent, setCertificateEvent] = useState<any>(null);

  const { data: registrationsForEvent = [], isLoading: regsLoading } = useQuery({
    queryKey: ["event_registrations_students", selectedEventForRegs?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations" as any)
        .select("*")
        .eq("event_id", selectedEventForRegs!.id)
        .eq("registration_status", "confirmed")
        .order("registered_at", { ascending: false });
      if (error) throw (error as any);
      return (data as any) || [];
    },
    enabled: !!selectedEventForRegs,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase
        .from("event_registrations" as any)
        .update({ payment_status: "paid", registration_status: "confirmed" } as any)
        .eq("id", regId);
      if (error) throw (error as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_registrations_students", selectedEventForRegs?.id] });
      toast.success("Payment verified and registration confirmed!");
    },
    onError: () => toast.error("Failed to verify payment"),
  });



  const filteredClubs = allClubs.filter(club =>
    club.category === selectedCategory &&
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Auto-delete expired registrations
  useEffect(() => {
    if (!user) return;
    const cleanup = async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, events(end_date, start_date)")
        .eq("user_id", user.id);
      const expired = (data || []).filter((r: any) => {
        const endDate = r.events?.end_date || r.events?.start_date;
        return isPast(new Date(endDate));
      });
      for (const r of expired) {
        await supabase.from("event_registrations").delete().eq("id", r.id);
      }
      if (expired.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["my_registrations"] });
      }
    };
    cleanup();
  }, [user, queryClient]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const collegeName = profile?.colleges?.name;
  const collegeId = profile?.college_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 space-y-8">
        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black">
            Welcome back, {profile?.full_name || "User"} 👋
          </h1>
          <div className="flex gap-2 flex-wrap">
            {isAdmin ? (
              <Badge className="gradient-primary text-white border-0">Club Organizer</Badge>
            ) : (
              <Badge variant="secondary">Student</Badge>
            )}
            {adminRequest?.status === "approved" && (adminRequest as any).clubs?.name && (
              <Badge variant="outline">{(adminRequest as any).clubs.name}</Badge>
            )}
          </div>
        </div>

        {/* Admin Request Status */}
        {adminRequest?.status === "pending" && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 shadow-card">
            <CardContent className="flex items-start gap-4 p-5">
              <Clock className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Organizer application pending</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Your request to manage <span className="font-medium">{(adminRequest as any).clubs?.name}</span> is under review.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {adminRequest?.status === "rejected" && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 shadow-card">
            <CardContent className="flex items-start gap-4 p-5">
              <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">Application rejected</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  Your request for <span className="font-medium">{(adminRequest as any).clubs?.name}</span> was not approved.
                </p>
                <Link to="/apply-admin">
                  <Button variant="link" size="sm" className="px-0 text-red-600">Apply again</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && adminRequest?.status === "approved" && (
          <Card className="relative overflow-hidden border-0 shadow-2xl group transition-all duration-300 hover:scale-[1.01]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 opacity-90 animate-gradient-xy" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-3xl" />

            <CardContent className="relative flex items-center gap-6 p-8 text-white">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30">
                <Sparkles className="h-8 w-8 text-amber-200 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold px-2 py-0">
                    Verified Organizer
                  </Badge>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <h2 className="text-3xl font-black tracking-tight drop-shadow-md">
                  {profile?.clubs?.name || (adminRequest as any)?.clubs?.name || "Verified Organizer"}
                </h2>
                <p className="text-white/80 font-medium flex items-center gap-1.5 text-sm">
                  <Building2 className="h-4 w-4" /> Leading the charge in the Campus Hub
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply for Admin link — only for students with no pending/approved request */}
        {!isAdmin && (!adminRequest || adminRequest.status === "rejected") && (
          <Card className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate("/apply-admin")}>
            <CardContent className="flex items-center gap-4 p-5">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Want to manage a club?</p>
                <p className="text-sm text-muted-foreground">Apply to become a club admin</p>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* College Box */}
        {collegeName && (
          <Card className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
            onClick={() => navigate(`/events?college=${collegeId}`)}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-muted text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{collegeName}-Events</p>
                <p className="text-sm text-muted-foreground">Click to see all events from your college</p>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Admin: Posted Events */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> My Posted Events
              </h2>
              <Link to="/create-event">
                <Button size="sm">
                  <PlusCircle className="h-4 w-4 mr-1" /> Post Event
                </Button>
              </Link>
            </div>
            {postedEvents.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>You haven't posted any events yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {postedEvents.map((event: any) => {
                  const expired = event.end_date ? isPast(new Date(event.end_date)) : isPast(new Date(event.start_date));
                  return (
                    <Card key={event.id} className={`shadow-card ${expired ? "opacity-50" : ""}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {event.cover_image_url ? (
                            <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full gradient-primary opacity-60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.start_date), "MMM d, yyyy h:mm a")}
                            {expired && " • Expired"}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" title="Mark Attendance"
                            onClick={() => setAttendanceEvent(event)}>
                            <ClipboardCheck className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Certificate Template"
                            onClick={() => setCertificateEvent(event)}>
                            <Award className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Registered Students"
                            onClick={() => setSelectedEventForRegs(event)}>
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${event.id}`)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/edit-event/${event.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive"
                            onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(event.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Registered Events (both admin & student) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" /> My Registered Events
          </h2>
          {registeredEvents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>No upcoming registered events.</p>
                <Link to="/events">
                  <Button variant="link" className="mt-2">Browse Events</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registeredEvents.map((reg: any) => (
                <Card key={reg.id} className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
                  onClick={() => navigate(`/events/${reg.event_id}`)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {reg.events?.cover_image_url ? (
                        <img src={reg.events.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full gradient-primary opacity-60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{reg.events?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.events?.start_date && format(new Date(reg.events.start_date), "MMM d, yyyy")}
                        {reg.events?.colleges?.name && ` • ${reg.events.colleges.name}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>


      </div>

      <Dialog open={!!selectedEventForRegs} onOpenChange={(open) => !open && setSelectedEventForRegs(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Registered Students: {selectedEventForRegs?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, USN, or email..."
                  className="pl-9"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Registered At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
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
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No students found.
                      </TableCell>
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
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.student_name || "N/A"}</TableCell>
                        <TableCell>{reg.usn || "N/A"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{reg.college_email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={reg.payment_status === "free" ? "secondary" : "outline"}>
                            {reg.payment_status === "free" ? "Free" : "Paid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            reg.payment_status === "paid" ? "bg-emerald-500" :
                              reg.payment_status === "free" ? "bg-indigo-500" :
                                "bg-amber-500"
                          }>
                            {reg.payment_status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(reg.registered_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.payment_status === "pending" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2"
                              onClick={() => {
                                if (confirm("Confirm payment received?")) verifyPaymentMutation.mutate(reg.id);
                              }}
                              disabled={verifyPaymentMutation.isPending}
                            >
                              Verify
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

      {/* Attendance Manager */}
      <AttendanceManager
        event={attendanceEvent}
        open={!!attendanceEvent}
        onOpenChange={(open) => !open && setAttendanceEvent(null)}
      />

      {/* Certificate Designer */}
      <CertificateDesigner
        event={certificateEvent}
        open={!!certificateEvent}
        onOpenChange={(open) => !open && setCertificateEvent(null)}
      />
    </div>
  );
}
