import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, ImagePlus, IndianRupee, Users, Clock, CalendarDays, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { eventService } from "@/services/eventService";
import { motion } from "framer-motion";

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [eventType, setEventType] = useState<"individual" | "group">("individual");
  const [teamSize, setTeamSize] = useState(""); // Legacy
  const [minTeamSize, setMinTeamSize] = useState("1");
  const [maxTeamSize, setMaxTeamSize] = useState("1");
  const [maxTeams, setMaxTeams] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
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

  const parseDateTime = (iso: string | null) => {
    if (!iso) return { date: "", hour: "12", minute: "00", period: "AM" };
    const d = new Date(iso);
    const date = d.toISOString().split('T')[0];
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return { date, hour: h.toString().padStart(2, '0'), minute: m, period };
  };

  const combineDateTime = (date: string, hour: string, minute: string, period: string) => {
    if (!date) return null;
    let h = parseInt(hour);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(year, month - 1, day, h, parseInt(minute));
    return d.toISOString();
  };

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*, clubs(name), colleges(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase.from("event_categories").select("*").order("name");
      return data || [];
    },
  });

  const { data: paymentAccount } = useQuery({
    queryKey: ["payment_account", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizer_payment_accounts")
        .select("*")
        .eq("organizer_user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setLocation(event.location || "");
      setVenue((event as any).venue || "");
      setCategoryId(event.category_id || "");
      setRegistrationFee(String((event as any).registration_fee || 0));

      const start = parseDateTime(event.start_date);
      setStartDateStr(start.date);
      setStartHour(start.hour);
      setStartMinute(start.minute);
      setStartPeriod(start.period);

      const end = parseDateTime(event.end_date);
      setEndDateStr(end.date);
      setEndHour(end.hour);
      setEndMinute(end.minute);
      setEndPeriod(end.period);

      setEventType((event as any).event_type || "individual");
      setTeamSize(String((event as any).team_size || ""));
      setMinTeamSize(String((event as any).min_team_size || "1"));
      setMaxTeamSize(String((event as any).max_team_size || "1"));
      setMaxTeams((event as any).max_teams ? String((event as any).max_teams) : "");
      setMaxParticipants((event as any).max_participants ? String((event as any).max_participants) : "");
      setActivityPoints(String((event as any).activity_points || 0));
      setImagePreview((event as any).cover_image_url || null);
      setRegistrationsOpen((event as any).registrations_open ?? true);
    }
  }, [event]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (event && user && event.created_by !== user.id) navigate("/dashboard");
  }, [user, authLoading, event, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      let coverImageUrl = (event as any)?.cover_image_url || null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("event-covers").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("event-covers").getPublicUrl(path);
        coverImageUrl = urlData.publicUrl;
      }

      const { error } = await (eventService as any).updateEvent(id!, {
        title,
        description,
        location,
        venue,
        category_id: categoryId || null,
        start_date: combineDateTime(startDateStr, startHour, startMinute, startPeriod)!,
        end_date: combineDateTime(endDateStr, endHour, endMinute, endPeriod),
        cover_image_url: coverImageUrl,
        registration_fee: parseFloat(registrationFee) || 0,
        event_type: eventType,
        team_size: eventType === "group" ? parseInt(maxTeamSize) : null,
        min_team_size: eventType === "group" ? parseInt(minTeamSize) : null,
        max_team_size: eventType === "group" ? parseInt(maxTeamSize) : null,
        max_teams: eventType === "group" && maxTeams ? parseInt(maxTeams) : null,
        max_participants: eventType === "individual" && maxParticipants ? parseInt(maxParticipants) : null,
        activity_points: activityPoints ? parseInt(activityPoints) : 0,
        registrations_open: registrationsOpen,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["my_posted_events"] });
      toast({
        title: "Success! 🎉",
        description: "Event updated successfully."
      });
      navigate("/dashboard");
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message || "Operation failed", variant: "destructive" });
    },
  });

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container max-w-4xl py-20 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-16">
          <div className="space-y-4 border-b-2 border-border pb-8">
            <div className="text-sm font-[900] uppercase tracking-[0.2em] text-primary">Organizer Tools</div>
            <h1 className="text-5xl sm:text-7xl font-[900] uppercase tracking-[-0.04em] leading-none">
              EDIT <span className="text-muted-foreground">EVENT</span>
            </h1>
            {(event as any)?.clubs?.name && (
              <p className="text-sm text-muted-foreground font-[900] uppercase tracking-widest">
                Editing for <span className="text-foreground">{(event as any).clubs.name}</span>
              </p>
            )}
          </div>

          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const fee = registrationFee ? parseFloat(registrationFee) : 0;
            if (fee > 0 && (!paymentAccount || paymentAccount.account_status !== 'active')) {
              toast({ title: "Payment Account Required", description: "You must connect your Razorpay account in your profile before changing this to a paid event.", variant: "destructive" });
              return;
            }
            updateMutation.mutate(); 
          }} className="space-y-12">
            {/* Cover Image */}
            <div className="space-y-4">
              <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">01. VISUAL IDENTITY</label>
              <label className="group relative flex flex-col items-center justify-center h-64 rounded-[40px] border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-all duration-500 overflow-hidden bg-card/80">
                {imagePreview ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={imagePreview} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground/30 group-hover:text-primary transition-colors duration-500" />
                    <p className="text-sm text-muted-foreground/60 font-[900] uppercase tracking-widest">Update cover image</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            {/* Title & Description */}
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">02. CORE METADATA</label>
                <input 
                  placeholder="EVENT TITLE / CODE NAME" 
                  className="w-full h-20 bg-card border-2 border-border/50 rounded-full px-10 text-xl font-[900] uppercase tracking-tighter placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required 
                />
              </div>

              <div className="space-y-4">
                <textarea 
                  placeholder="MISSION OBJECTIVES / DESCRIPTION" 
                  className="w-full min-h-[200px] bg-card border-2 border-border/50 rounded-[40px] p-10 font-[900] text-base uppercase tracking-tight placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>

            {/* Category & Venue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">03. CLASSIFICATION</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-sm px-8 outline-none focus:ring-0">
                    <SelectValue placeholder="SELECT CATEGORY" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-sm tracking-widest focus:bg-accent">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">04. DEPLOYMENT ZONE</label>
                <input 
                  placeholder="SPECIFIC VENUE (E.G. AUDITORIUM)" 
                  className="w-full h-16 bg-card border-2 border-border/50 rounded-full px-8 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required 
                />
              </div>
            </div>

            {/* Fee & Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">05. ENTRY FEE</label>
                <div className="relative">
                  <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input 
                    type="number" 
                    placeholder="FREE"
                    className="w-full h-16 bg-card border-2 border-border/50 rounded-full pl-12 pr-6 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                  />
                </div>
                {parseFloat(registrationFee || "0") > 0 && (!paymentAccount || paymentAccount.account_status !== 'active') && (
                  <p className="text-sm text-destructive font-[900] uppercase tracking-wide mt-2">
                    ⚠️ PLEASE CONNECT YOUR PAYMENT ACCOUNT IN PROFILE SETTINGS BEFORE CHARGING FOR EVENTS.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">06. ACTIVITY POINTS</label>
                <div className="relative">
                  <Star className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full h-16 bg-card border-2 border-border/50 rounded-full pl-12 pr-6 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                    value={activityPoints}
                    onChange={(e) => setActivityPoints(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">
                  {eventType === "individual" ? "07. MAX PARTICIPANTS" : "07. MAX TEAMS"}
                </label>
                <div className="relative">
                  {eventType === "individual" ? (
                    <>
                      <Users className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                      <input 
                        type="number" 
                        placeholder="∞ UNLIMITED"
                        className="w-full h-16 bg-card border-2 border-border/50 rounded-full pl-12 pr-6 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <Users className="absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                      <input 
                        type="number" 
                        placeholder="∞ UNLIMITED TEAMS"
                        className="w-full h-16 bg-card border-2 border-border/50 rounded-full pl-12 pr-6 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                        value={maxTeams}
                        onChange={(e) => setMaxTeams(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">08. TEAM PROTOCOL</label>
                <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                  <SelectTrigger className="h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-sm px-8 outline-none focus:ring-0 text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                    <SelectItem value="individual" className="font-bold uppercase text-sm tracking-widest focus:bg-accent">INDIVIDUAL</SelectItem>
                    <SelectItem value="group" className="font-bold uppercase text-sm tracking-widest focus:bg-accent">TEAM / GROUP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {eventType === "group" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-8 bg-primary/5 p-10 rounded-[40px] border-2 border-primary/10">
                <div className="flex flex-col gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-[900] uppercase tracking-widest text-primary">TEAM SIZE CONFIGURATION</label>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <p className="text-xs font-[900] text-muted-foreground uppercase tracking-widest">MIN MEMBERS</p>
                        <div className="relative">
                          <Users className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                          <input 
                            type="number" 
                            className="w-full h-14 bg-background border-2 border-border/50 rounded-full px-12 font-black text-base outline-none focus:border-primary/40 transition-all"
                            value={minTeamSize}
                            onChange={(e) => setMinTeamSize(e.target.value)}
                            min="1"
                            required 
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-[900] text-muted-foreground uppercase tracking-widest">MAX MEMBERS</p>
                        <div className="relative">
                          <Users className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                          <input 
                            type="number" 
                            className="w-full h-14 bg-background border-2 border-border/50 rounded-full px-12 font-black text-base outline-none focus:border-primary/40 transition-all"
                            value={maxTeamSize}
                            onChange={(e) => setMaxTeamSize(e.target.value)}
                            min={minTeamSize}
                            required 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground/60 italic font-medium px-2">
                    * Set Min = Max for a mandatory fixed team size (e.g. 4 members precisely).
                  </p>
                </div>
              </motion.div>
            )}

            {/* Time Management */}
            <div className="space-y-8">
              <label className="text-sm font-[900] uppercase tracking-widest text-muted-foreground">09. MISSION TIMELINE</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* START */}
                <div className="space-y-6">
                  <label className="flex items-center gap-3 text-sm font-[900] uppercase tracking-widest text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" /> START SEQUENCE
                  </label>
                  <div className="space-y-4">
                    <input 
                      type="date" 
                      className="w-full h-14 bg-card border-2 border-border/50 rounded-full px-8 font-[900] text-sm uppercase tracking-widest text-foreground outline-none focus:border-primary/40 transition-all"
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      required 
                    />
                    <div className="flex gap-2">
                      <Select value={startHour} onValueChange={setStartHour}>
                        <SelectTrigger className="flex-1 h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-6 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={h.toString().padStart(2, '0')} className="font-bold text-sm">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startMinute} onValueChange={setStartMinute}>
                        <SelectTrigger className="flex-1 h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-6 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          {['00', '15', '30', '45'].map(m => (
                            <SelectItem key={m} value={m} className="font-bold text-sm">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startPeriod} onValueChange={setStartPeriod}>
                        <SelectTrigger className="w-[80px] h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-4 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          <SelectItem value="AM" className="font-bold text-sm">AM</SelectItem>
                          <SelectItem value="PM" className="font-bold text-sm">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* END */}
                <div className="space-y-6">
                  <label className="flex items-center gap-3 text-sm font-[900] uppercase tracking-widest text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" /> END SEQUENCE
                  </label>
                  <div className="space-y-4">
                    <input 
                      type="date" 
                      className="w-full h-14 bg-card border-2 border-border/50 rounded-full px-8 font-[900] text-sm uppercase tracking-widest text-foreground outline-none focus:border-primary/40 transition-all"
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      required 
                    />
                    <div className="flex gap-2">
                      <Select value={endHour} onValueChange={setEndHour}>
                        <SelectTrigger className="flex-1 h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-6 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <SelectItem key={h} value={h.toString().padStart(2, '0')} className="font-bold text-sm">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endMinute} onValueChange={setEndMinute}>
                        <SelectTrigger className="flex-1 h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-6 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          {['00', '15', '30', '45'].map(m => (
                            <SelectItem key={m} value={m} className="font-bold text-sm">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endPeriod} onValueChange={setEndPeriod}>
                        <SelectTrigger className="w-[80px] h-12 bg-card border-2 border-border/50 rounded-full font-[900] text-sm px-4 outline-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-2 border-border text-foreground">
                          <SelectItem value="AM" className="font-bold text-sm">AM</SelectItem>
                          <SelectItem value="PM" className="font-bold text-sm">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-12">
              <button 
                type="submit" 
                className="w-full h-20 rounded-full bg-primary text-primary-foreground font-[900] text-xl uppercase tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
