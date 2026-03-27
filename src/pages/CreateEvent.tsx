import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MapPin, Clock, Send, ImagePlus, IndianRupee, Users, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { eventService } from "@/services/eventService";
import { motion } from "framer-motion";
import { heroReveal, staggerContainer } from "@/lib/motion-variants";

export default function CreateEvent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [eventType, setEventType] = useState<"individual" | "group">("individual");
  const [teamSize, setTeamSize] = useState("");
  const [activityPoints, setActivityPoints] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);

  // Time components
  const [startDateStr, setStartDateStr] = useState("");
  const [startHour, setStartHour] = useState("10");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  const [endDateStr, setEndDateStr] = useState("");
  const [endHour, setEndHour] = useState("05");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("PM");

  const combineDateTime = (date: string, hour: string, minute: string, period: string) => {
    if (!date) return null;
    let h = parseInt(hour);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(year, month - 1, day, h, parseInt(minute));
    return d.toISOString();
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Get the organizer's college and club from their profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, colleges(id, name), clubs(id, name)")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: adminRequest, isLoading: adminRequestLoading } = useQuery({
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

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("event_categories").select("*").order("name");
      return data || [];
    },
  });

  const isAdmin =
    (profile as any)?.role === "admin" ||
    (profile as any)?.account_type === "admin" ||
    adminRequest?.status === "approved";

  const collegeId = profile?.college_id;
  const collegeName = (profile as any)?.colleges?.name || "BMS College of Engineering";
  const clubName = (profile as any)?.clubs?.name || (adminRequest as any)?.clubs?.name;
  const clubId = (profile as any)?.club_id || (adminRequest as any)?.club_id;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!collegeId) {
        toast({
          title: "Profile Incomplete",
          description: "Your profile is not linked to a college. Please try logging out and back in, or contact support.",
          variant: "destructive"
        });
        throw new Error("You must be linked to a college to post events.");
      }
      if (!clubId) {
        toast({
          title: "Club Not Assigned",
          description: "You are not assigned to a club. Only club organizers can post events.",
          variant: "destructive"
        });
        throw new Error("You must be assigned to a club to post events.");
      }

      let coverImageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("event-covers") // Correct bucket
          .upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("event-covers")
          .getPublicUrl(path);
        coverImageUrl = urlData.publicUrl;
      }

      const fee = registrationFee ? parseFloat(registrationFee) : 0;
      const size = eventType === "group" ? parseInt(teamSize) : null;

      const event = await eventService.createEvent({
        title,
        description,
        location,
        venue,
        category_id: categoryId || null,
        college_id: collegeId,
        club_id: clubId,
        start_date: combineDateTime(startDateStr, startHour, startMinute, startPeriod)!,
        end_date: combineDateTime(endDateStr, endHour, endMinute, endPeriod),
        created_by: user!.id,
        is_published: true,
        cover_image_url: coverImageUrl, // Renamed
        registration_fee: fee,
        event_type: eventType,
        team_size: size,
        activity_points: activityPoints ? parseInt(activityPoints) : 0,
        registrations_open: registrationsOpen,
      });

      toast({
        title: "Success! 🎉",
        description: "Event created successfully.",
      });
    },
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create event",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = combineDateTime(startDateStr, startHour, startMinute, startPeriod);
    const endIso = combineDateTime(endDateStr, endHour, endMinute, endPeriod);

    if (!title || !startIso || !endIso) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const start = new Date(startIso);
    const end = new Date(endIso);
    if (start >= end) {
      toast({ title: "Invalid Dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }

    createMutation.mutate();
  };

  if (loading || profileLoading || adminRequestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <Navbar />
        <div className="container py-24 text-center space-y-5">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="text-5xl">🔒</motion.div>
          <h2 className="text-2xl font-black font-display">Organizer Access Required</h2>
          <p className="text-muted-foreground font-medium">Only club organizers can post events. Apply to become an organizer to get started.</p>
          <Button onClick={() => navigate("/dashboard")} className="gradient-primary border-0 rounded-xl font-bold btn-glow">Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Card className="glass-card rounded-2xl gradient-border overflow-visible">
          <CardHeader className="border-b border-white/[0.06] pb-5">
            <div className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
              <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-3 w-3" />
              </div>
              Create Event
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-black font-display tracking-tight">
              Post a New Event
            </CardTitle>
            <p className="text-sm text-muted-foreground/70 font-medium">
              Posting for <span className="font-semibold text-foreground">{collegeName || "your college"}</span>
              {clubName && <> as part of <span className="font-semibold text-primary">{clubName}</span></>}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Cover Image */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover Image</Label>
                <label className="group flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-primary/50 cursor-pointer transition-all duration-500 overflow-hidden bg-white/[0.02] hover:bg-white/[0.04]">
                  {imagePreview ? (
                    <div className="relative h-full w-full overflow-hidden">
                      <img src={imagePreview} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                        <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-500" />
                      </motion.div>
                      <p className="text-sm text-muted-foreground/60 font-medium">Click or drag to upload event cover</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Name *</Label>
                <Input id="title" placeholder="e.g. Annual Hackathon 2026" value={title}
                  onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea id="description" placeholder="Tell people what this event is about..." className="rounded-xl border-white/[0.12] bg-white/[0.04] focus:ring-primary/40 focus:border-primary/50 min-h-[120px] font-medium"
                  value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Venue & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue" className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Venue *
                  </Label>
                  <Input id="venue" placeholder="e.g. Main Auditorium" value={venue}
                    onChange={(e) => setVenue(e.target.value)} maxLength={200} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Address</Label>
                  <Input id="location" placeholder="e.g. Building A, Campus Road" value={location}
                    onChange={(e) => setLocation(e.target.value)} maxLength={300} />
                </div>
              </div>

              {/* Registration Fee */}
              <div className="space-y-2">
                <Label htmlFor="fee" className="flex items-center gap-1">
                  <IndianRupee className="h-3.5 w-3.5" /> Registration Fee
                </Label>
                <Input id="fee" type="number" min="0" step="1" placeholder="0 (free)"
                  value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} />
                <p className="text-xs text-muted-foreground">Leave empty or 0 for free events</p>
              </div>

              {/* Activity Points */}
              <div className="space-y-2">
                <Label htmlFor="activityPoints" className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> Activity Points
                </Label>
                <Input id="activityPoints" type="number" min="0" step="1" placeholder="0"
                  value={activityPoints} onChange={(e) => setActivityPoints(e.target.value)} />
                <p className="text-xs text-muted-foreground">Points awarded to attendees for participating</p>
              </div>

              {/* Registration Type */}
              <div className="space-y-4 pt-4 pb-4 border-y border-white/[0.06]">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration Type *</Label>
                  <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Event</SelectItem>
                      <SelectItem value="group">Group Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {eventType === "group" && (
                  <div className="space-y-2">
                    <Label htmlFor="teamSize" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Team Size *
                    </Label>
                    <Input id="teamSize" type="number" min="2" max="20" placeholder="e.g. 4"
                      value={teamSize} onChange={(e) => setTeamSize(e.target.value)} required />
                    <p className="text-xs text-muted-foreground/60">Number of members required per team</p>
                  </div>
                )}
              </div>
              
              {/* Registration Status */}
              <div className="space-y-4 pt-4 pb-4 border-b border-white/[0.06]">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration Status</Label>
                  <Select value={registrationsOpen ? "open" : "closed"} onValueChange={(val) => setRegistrationsOpen(val === "open")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open - Students can register</SelectItem>
                      <SelectItem value="closed">Closed - New sign-ups disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground/60">You can change this anytime from your dashboard.</p>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Start Date & Time *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Input type="date" className="flex-1 min-w-[150px]" value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)} required />
                    <div className="flex gap-1">
                      <Select value={startHour} onValueChange={setStartHour}>
                        <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={h.toString().padStart(2, '0')}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startMinute} onValueChange={setStartMinute}>
                        <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['00', '15', '30', '45'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startPeriod} onValueChange={setStartPeriod}>
                        <SelectTrigger className="w-[75px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" /> End Date & Time *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Input type="date" className="flex-1 min-w-[150px]" value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)} required />
                    <div className="flex gap-1">
                      <Select value={endHour} onValueChange={setEndHour}>
                        <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={h.toString().padStart(2, '0')}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endMinute} onValueChange={setEndMinute}>
                        <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['00', '15', '30', '45'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endPeriod} onValueChange={setEndPeriod}>
                        <SelectTrigger className="w-[75px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary border-0 h-12 rounded-xl font-bold text-base shadow-glow btn-glow" size="lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Publish Event</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
}
