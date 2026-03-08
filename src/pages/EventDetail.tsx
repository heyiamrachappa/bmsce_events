import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowLeft, Clock, Building2, IndianRupee, Star } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import CertificateDownload from "@/components/CertificateDownload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, AlertCircle } from "lucide-react";

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
        .select("id")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
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
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Initialize team members when event data is available
  useEffect(() => {
    const ev = event as any;
    if (ev?.event_type === "group" && ev?.team_size) {
      setTeamMembers(Array(ev.team_size).fill(0).map(() => ({ name: "", usn: "", email: "" })));
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
          college_email: m.email
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 space-y-8 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/events")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
        </Button>

        <div className="relative h-64 md:h-80 rounded-xl overflow-hidden">
          {(event as any).cover_image_url ? (
            <img src={(event as any).cover_image_url} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full gradient-primary opacity-80" />
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            {event.event_categories?.name && (
              <Badge className="text-sm border-0"
                style={{ backgroundColor: event.event_categories.color || "hsl(var(--primary))", color: "white" }}>
                {event.event_categories.name}
              </Badge>
            )}
            <Badge className={`text-sm border-0 ${isFree ? "bg-emerald-500" : "bg-amber-500"} text-white`}>
              {isFree ? "Free" : `₹${fee}`}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                {event.colleges?.name}
              </p>
              <h1 className="text-3xl md:text-4xl font-black">{event.title}</h1>
            </div>
            {event.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
            )}
          </div>

          <Card className="shadow-card h-fit">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>{format(new Date(event.start_date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{format(new Date(event.start_date), "h:mm a")}
                    {event.end_date && ` – ${format(new Date(event.end_date), "MMM d, h:mm a")}`}
                  </span>
                </div>
                {((event as any).venue || event.location) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span>{(event as any).venue}{event.location && `, ${event.location}`}</span>
                  </div>
                )}
                {event.colleges?.name && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{event.colleges.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-primary shrink-0" />
                  <span>{isFree ? "Free entry" : `₹${fee}`}</span>
                </div>
                {event.max_participants && (
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span>{registrationCount} / {event.max_participants} registered</span>
                  </div>
                )}
                {(event as any).activity_points > 0 && (
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{(event as any).activity_points} Activity Points</span>
                  </div>
                )}
              </div>

              {/* Certificate Download (only visible if template exists and user attended) */}
              {user && id && (
                <div className="pt-2">
                  <CertificateDownload eventId={id} eventTitle={event.title} compact />
                </div>
              )}

              {user ? (
                isRegistered ? (
                  <Button variant="outline" className="w-full" disabled>
                    Already Registered ✅
                  </Button>
                ) : (
                  <Dialog open={registering} onOpenChange={setRegistering}>
                    <DialogTrigger asChild>
                      <Button className="w-full gradient-primary text-white" disabled={isFull}>
                        {isFull ? "Event Full" : "Register Now 🎟️"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Register for {event.title}</DialogTitle>
                        <DialogDescription>
                          {(event as any).event_type === "group"
                            ? `Enter details for all ${(event as any).team_size} team members.`
                            : "Provide your details to register for this event."}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {(event as any).event_type === "individual" ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your Name" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="usn">USN</Label>
                              <Input id="usn" value={formData.usn} onChange={(e) => setFormData({ ...formData, usn: e.target.value })} placeholder="1BM22XX..." />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">College Email (@bmsce.ac.in)</Label>
                              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="name.dept@bmsce.ac.in" />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {teamMembers.map((member, index) => (
                              <div key={index} className="space-y-4 p-4 rounded-lg border bg-muted/30">
                                <h3 className="font-bold flex items-center gap-2">
                                  <Users className="h-4 w-4" /> Member {index + 1} {index === 0 && <Badge variant="secondary" className="text-[10px]">Leader</Badge>}
                                </h3>
                                <div className="space-y-2">
                                  <Label>Full Name</Label>
                                  <Input
                                    value={member.name}
                                    onChange={(e) => {
                                      const newMembers = [...teamMembers];
                                      newMembers[index].name = e.target.value;
                                      setTeamMembers(newMembers);
                                    }}
                                    placeholder="Name"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>USN</Label>
                                    <Input
                                      value={member.usn}
                                      onChange={(e) => {
                                        const newMembers = [...teamMembers];
                                        newMembers[index].usn = e.target.value;
                                        setTeamMembers(newMembers);
                                      }}
                                      placeholder="USN"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      type="email"
                                      value={member.email}
                                      onChange={(e) => {
                                        const newMembers = [...teamMembers];
                                        newMembers[index].email = e.target.value;
                                        setTeamMembers(newMembers);
                                      }}
                                      placeholder="Email"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <p>Only students with a valid <strong>@bmsce.ac.in</strong> email can register. {fee > 0 && `This event has a registration fee of ₹${fee}.`}</p>
                        </div>

                        <Button
                          className="w-full gradient-primary text-white"
                          onClick={() => registerMutation.mutate()}
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? "Registering..." : fee > 0 ? `Proceed to Payment (₹${fee})` : "Confirm Registration 🎟️"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )
              ) : (
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  Sign in to Register
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
