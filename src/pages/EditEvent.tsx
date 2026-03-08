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
  const [teamSize, setTeamSize] = useState("");
  const [activityPoints, setActivityPoints] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      setEventType((event as any).event_type || "individual");
      setTeamSize(String((event as any).team_size || ""));
      setActivityPoints(String((event as any).activity_points || 0));
      setImagePreview((event as any).cover_image_url || null);
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

      const { error } = await supabase.from("events").update({
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
        team_size: eventType === "group" ? parseInt(teamSize) : null,
        activity_points: activityPoints ? parseInt(activityPoints) : 0,
      } as any).eq("id", id!);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Save className="h-6 w-6 text-primary" /> Edit Event
            </CardTitle>
            {(event as any)?.clubs?.name && (
              <p className="text-sm text-muted-foreground">
                Editing event for <span className="font-semibold text-primary">{(event as any).clubs.name}</span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-5">
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div className="space-y-2">
                <Label>Event Name *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Registration Fee</Label>
                <Input type="number" min="0" value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} />
              </div>

              {/* Activity Points */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Activity Points</Label>
                <Input type="number" min="0" value={activityPoints} onChange={(e) => setActivityPoints(e.target.value)} />
                <p className="text-xs text-muted-foreground">Points awarded to attendees</p>
              </div>

              <div className="space-y-4 pt-2 pb-2 border-y border-border/50">
                <div className="space-y-2">
                  <Label>Registration Type *</Label>
                  <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Event</SelectItem>
                      <SelectItem value="group">Group Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {eventType === "group" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Team Size *
                    </Label>
                    <Input type="number" min="2" max="20" placeholder="e.g. 4"
                      value={teamSize} onChange={(e) => setTeamSize(e.target.value)} required />
                  </div>
                )}
              </div>
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
              <Button type="submit" className="w-full" size="lg" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
