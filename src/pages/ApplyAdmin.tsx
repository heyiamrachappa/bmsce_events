import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApplyAdmin() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedClubId, setSelectedClubId] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) navigate("/auth");
    }, [user, authLoading, navigate]);

    // Check if user already has a pending/approved request
    const { data: existingRequest } = useQuery({
        queryKey: ["my_admin_request", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("admin_requests")
                .select("*, clubs(name, category)")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            return data;
        },
        enabled: !!user,
    });

    // Fetch all clubs
    const { data: allClubs = [] } = useQuery({
        queryKey: ["clubs"],
        queryFn: async () => {
            const { data } = await supabase.from("clubs").select("*").order("name");
            return data || [];
        },
    });

    // Fetch club_ids that already have an organizer
    const { data: takenClubIds = [] } = useQuery({
        queryKey: ["taken_clubs"],
        queryFn: async () => {
            const { data } = await supabase
                .from("profiles")
                .select("club_id")
                .eq("role", "admin") // Changed from 'organizer'
                .not("club_id", "is", null);
            return (data || []).map((p: any) => p.club_id);
        },
    });

    // Distinct categories
    const categories = [...new Set(allClubs.map((c: any) => c.category))].sort();

    // Clubs filtered by category, excluding taken ones
    const availableClubs = allClubs.filter(
        (c: any) => c.category === selectedCategory && !takenClubIds.includes(c.id)
    );

    // Reset club when category changes
    useEffect(() => {
        setSelectedClubId("");
    }, [selectedCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClubId) {
            toast({ title: "Club Required", description: "Please select a club from the dropdown.", variant: "destructive" });
            return;
        }
        if (!proofFile) {
            toast({ title: "Proof Required", description: "Please upload a proof document (PDF, JPG, PNG).", variant: "destructive" });
            return;
        }
        if (!user) return;

        setSubmitting(true);
        setUploadProgress(10);
        try {
            // Upload proof
            const ext = proofFile.name.split(".").pop();
            const path = `${user.id}/${Date.now()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from("admin-proofs")
                .upload(path, proofFile);

            if (uploadErr) throw uploadErr;
            setUploadProgress(60);

            // Insert request
            const { error: insertErr } = await supabase.from("admin_requests").insert({
                user_id: user.id,
                club_id: selectedClubId,
                proof_url: path,
                status: "pending",
            });

            if (insertErr) {
                // Cleanup uploaded file if insert fails
                await supabase.storage.from("admin-proofs").remove([path]);
                throw insertErr;
            }

            setUploadProgress(100);
            toast({ title: "Application submitted!", description: "Your request is under review." });
            navigate("/dashboard");
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    // Already has a request
    if (existingRequest && (existingRequest.status === "pending" || existingRequest.status === "approved")) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container max-w-xl py-32 text-center space-y-8">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                    <h2 className="text-5xl sm:text-7xl font-[900] uppercase tracking-[-0.04em] leading-none text-foreground">
                        {existingRequest.status === "pending" ? <><span className="text-muted-foreground/60">UNDER</span><br/>REVIEW</> : <><span className="text-primary">VERIFIED</span><br/>ORGANIZER</>}
                    </h2>
                    <p className="text-[10px] font-[900] text-muted-foreground uppercase tracking-widest">
                        {existingRequest.status === "pending"
                            ? `YOUR REQUEST TO MANAGE ${((existingRequest as any).clubs?.name || "A CLUB").toUpperCase()} IS BEING REVIEWED.`
                            : `YOU ARE THE VERIFIED ORGANIZER FOR ${((existingRequest as any).clubs?.name || "YOUR CLUB").toUpperCase()}.`}
                    </p>
                    <button onClick={() => navigate("/dashboard")} className="h-16 px-12 rounded-full bg-foreground text-background text-[10px] font-[900] uppercase tracking-widest hover:bg-primary transition-all active:scale-95">RETURN TO DASHBOARD</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container max-w-4xl py-20 px-6">
              <div className="space-y-16">
                {/* Header */}
                <div className="space-y-4 border-b-2 border-border pb-8">
                  <span className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">BECOME AN ORGANIZER</span>
                  <h1 className="text-5xl sm:text-7xl font-[900] uppercase tracking-[-0.04em] leading-none">
                    APPLY<br/><span className="text-muted-foreground/60">NOW</span>
                  </h1>
                  <p className="text-[10px] font-[900] text-muted-foreground uppercase tracking-widest">
                    SELECT YOUR CLUB AND UPLOAD PROOF TO BECOME ITS ORGANIZER. ONE ORGANIZER PER CLUB.
                  </p>
                </div>

                {existingRequest?.status === "rejected" && (
                    <div className="p-8 rounded-[32px] bg-red-500/5 border-2 border-red-500/10 text-[10px] font-[900] uppercase tracking-widest text-red-400">
                        YOUR PREVIOUS APPLICATION WAS REJECTED. YOU MAY APPLY AGAIN.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* Category Dropdown */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">01. CLUB CATEGORY</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger id="category-select" className="h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-[10px] px-8 outline-none focus:ring-0">
                                <SelectValue placeholder="SELECT CATEGORY" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat} className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Club Dropdown */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">02. CLUB NAME</label>
                        <Select
                            value={selectedClubId}
                            onValueChange={setSelectedClubId}
                            disabled={!selectedCategory}
                        >
                            <SelectTrigger id="club-select" className="h-16 bg-card border-2 border-border/50 rounded-full font-[900] uppercase tracking-widest text-[10px] px-8 outline-none focus:ring-0">
                                <SelectValue placeholder={!selectedCategory ? "SELECT A CATEGORY FIRST" : "SELECT A CLUB"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-2 border-border text-foreground rounded-2xl">
                                {availableClubs.length === 0 ? (
                                    <div className="p-4 text-[10px] font-[900] text-muted-foreground/60 text-center uppercase tracking-widest">
                                        NO AVAILABLE CLUBS
                                    </div>
                                ) : (
                                    availableClubs.map((club: any) => (
                                        <SelectItem key={club.id} value={club.id} className="font-bold uppercase text-[10px] tracking-widest focus:bg-accent">{club.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {selectedCategory && availableClubs.length === 0 && (
                            <p className="text-[9px] font-[900] text-amber-500 uppercase tracking-widest px-4">ALL CLUBS IN THIS CATEGORY ALREADY HAVE AN ORGANIZER.</p>
                        )}
                    </div>

                    {/* Proof Upload */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">03. PROOF DOCUMENT</label>
                        <label className="group flex items-center gap-6 p-8 rounded-[32px] border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-all duration-500 bg-card/80">
                            <Upload className="h-8 w-8 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                            <div>
                              <span className="text-xs font-[900] text-muted-foreground uppercase tracking-widest block truncate">
                                  {proofFile ? proofFile.name.toUpperCase() : "UPLOAD CLUB ID CARD, APPOINTMENT LETTER, ETC."}
                              </span>
                              <span className="text-[9px] font-[900] text-muted-foreground/30 uppercase tracking-widest">ACCEPTED: IMAGES, PDF</span>
                            </div>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                required
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="pt-8">
                      <button
                          type="submit"
                          className="w-full h-20 rounded-full bg-primary text-primary-foreground font-[900] text-xl uppercase tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                          disabled={submitting || !selectedClubId || !proofFile}
                      >
                          {submitting ? (
                              <span className="flex items-center justify-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</span>
                          ) : (
                              "Submit Application"
                          )}
                      </button>
                    </div>
                </form>
              </div>
            </div>
        </div>
    );
}
