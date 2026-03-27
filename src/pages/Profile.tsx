import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    User, Mail, Building2, ShieldCheck, ArrowRightLeft,
    CheckCircle2, XCircle, Loader2, Search, UserMinus, Award, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CertificateDownload from "@/components/CertificateDownload";
import { motion } from "framer-motion";
import { revealUp, staggerContainer, cardReveal } from "@/lib/motion-variants";

export default function Profile() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [newEmail, setNewEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) navigate("/auth");
    }, [user, authLoading, navigate]);

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

    const { data: transfers = [] } = useQuery({
        queryKey: ["transfers", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("club_transfer_requests")
                .select("*, clubs(name), current_admin:current_admin_id(full_name), new_admin:new_admin_id(full_name)")
                .eq("status", "pending")
                .or(`current_admin_id.eq.${user!.id},new_admin_id.eq.${user!.id}`);
            return data || [];
        },
        enabled: !!user,
    });

    const { data: attendedEvents = [] } = useQuery({
        queryKey: ["my_attended_events", user?.id],
        queryFn: async () => {
            const { data: attendance } = await supabase
                .from("event_attendance" as any)
                .select("event_id, events(id, title, activity_points)")
                .eq("user_id", user!.id);
            return (attendance as any[]) || [];
        },
        enabled: !!user,
    });

    const { data: activityPointsRecords = [] } = useQuery({
        queryKey: ["my_activity_points_records", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("activity_points" as any)
                .select("points")
                .eq("user_id", user!.id);
            return (data as any[]) || [];
        },
        enabled: !!user,
    });

    const totalActivityPoints = activityPointsRecords.reduce((sum: number, r: any) => sum + (r.points || 0), 0);

    const updateEmailMutation = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailLoading(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        setEmailLoading(false);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Verification Sent", description: "Please check both your old and new emails to confirm the change." });
        }
    };

    const handleSearchStudents = async () => {
        if (studentSearch.length < 3) return;
        setSearching(true);
        const { data } = await supabase
            .from("profiles")
            .select("user_id, full_name, role")
            .eq("college_id", profile?.college_id)
            .eq("role", "student")
            .neq("user_id", user!.id)
            .ilike("full_name", `%${studentSearch}%`)
            .limit(5);
        setSearchResults(data || []);
        setSearching(false);
    };

    const initiateTransfer = useMutation({
        mutationFn: async (targetUserId: string) => {
            const { data, error } = await supabase.rpc("initiate_club_transfer", { _new_admin_id: targetUserId });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast({ title: "Transfer Initiated", description: "Please confirm your departure below." });
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            setSearchResults([]);
            setStudentSearch("");
        },
        onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    });

    const confirmDeparture = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase.rpc("confirm_transfer_departure", { _request_id: requestId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Departure Confirmed", description: "Waiting for the new admin to accept." });
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
        },
    });

    const acceptTakeover = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase.rpc("accept_transfer_takeover", { _request_id: requestId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Welcome, Admin!", description: "You are now the club organizer." });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
        },
    });

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const isAdmin = profile?.role === "admin";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container max-w-5xl py-20 px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-20">
                    <div className="space-y-4 border-b-2 border-border pb-12">
                        <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">USER IDENTITY / CORE PROFILE</div>
                        <h1 className="text-5xl sm:text-7xl font-[900] uppercase tracking-[-0.04em] leading-none mb-4">
                            ACCOUNT <span className="text-muted-foreground">SETTINGS</span>
                        </h1>
                        <p className="text-xs text-muted-foreground font-[900] uppercase tracking-widest">MANAGE YOUR DIGITAL ASSETS AND CLUB STATUS</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Profile Summary */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
                            <div className="bg-card/80 border-2 border-border/50 rounded-[40px] p-10 space-y-8 h-full">
                                <div className="text-center space-y-6">
                                    <div className="h-32 w-32 rounded-full mx-auto relative group">
                                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse group-hover:bg-primary/40 transition-colors" />
                                        <div className="absolute inset-2 rounded-full bg-background border-2 border-border flex items-center justify-center">
                                            <User className="h-12 w-12 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-[900] uppercase tracking-tighter leading-tight">{profile?.full_name}</h2>
                                        <p className="text-[10px] text-muted-foreground font-[900] uppercase tracking-widest mt-1">{user?.email}</p>
                                    </div>
                                    <div className="flex justify-center">
                                        {isAdmin ? (
                                            <div className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-[900] text-[10px] uppercase tracking-widest">
                                                CLUB ORGANIZER
                                            </div>
                                        ) : (
                                            <div className="bg-accent text-foreground px-6 py-2 rounded-full font-[900] text-[10px] uppercase tracking-widest">
                                                STUDENT
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6 pt-8 border-t-2 border-border/50">
                                    <div className="flex items-center gap-4">
                                        <Building2 className="h-4 w-4 text-muted-foreground/60" />
                                        <span className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">{profile?.colleges?.name || "UNLINKED"}</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex items-center gap-4 text-primary">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span className="text-[10px] font-[900] uppercase tracking-widest">{profile?.clubs?.name} COMMAND</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 group">
                                        <Star className="h-4 w-4 text-amber-400" />
                                        <span className="text-[10px] font-[900] uppercase tracking-widest text-amber-400">{totalActivityPoints} ACTIVITY POINTS</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Account Management */}
                        <div className="lg:col-span-2 space-y-12">
                            {/* Email Change */}
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                <div className="space-y-6">
                                    <label className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground">IDENTIFICATION UPDATE</label>
                                    <form onSubmit={updateEmailMutation} className="flex flex-col sm:flex-row gap-4">
                                        <input 
                                            type="email" 
                                            placeholder="NEW-IDENTIFIER@COLLEGE.EDU"
                                            className="flex-1 h-16 bg-card border-2 border-border/50 rounded-full px-8 font-[900] text-[10px] uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                                            value={newEmail} 
                                            onChange={(e) => setNewEmail(e.target.value)} 
                                            required 
                                        />
                                        <button 
                                            type="submit" 
                                            className="h-16 px-10 bg-foreground text-background rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-primary transition-colors disabled:opacity-50" 
                                            disabled={emailLoading}
                                        >
                                            {emailLoading ? "SYNCING..." : "UPDATE"}
                                        </button>
                                    </form>
                                    <p className="text-[9px] text-muted-foreground/60 font-[900] uppercase tracking-widest px-8">UPDATE YOUR REGISTERED EMAIL ACCESS KEY</p>
                                </div>
                            </motion.div>

                            {/* Club Transfer System */}
                            {isAdmin && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-8 pt-8 border-t-2 border-border">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-[900] uppercase tracking-widest text-primary">COMMAND TRANSFER PROTOCOL</label>
                                        <p className="text-xs text-muted-foreground font-[900] uppercase tracking-widest">DELEGATE CLUB OWNERSHIP TO A NEW REPRESENTATIVE</p>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                                <input 
                                                    placeholder="SEARCH BY NAME / IDENTIFIER..." 
                                                    className="w-full h-16 bg-card border-2 border-border/50 rounded-full pl-14 pr-8 font-[900] text-[10px] uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                                                    value={studentSearch} 
                                                    onChange={(e) => setStudentSearch(e.target.value)} 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSearchStudents} 
                                                disabled={searching || studentSearch.length < 3} 
                                                className="h-16 px-10 bg-muted text-foreground border-2 border-border/50 rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-20"
                                            >
                                                {searching ? "SEARCHING..." : "INITIATE"}
                                            </button>
                                        </div>

                                        {searchResults.length > 0 && (
                                            <div className="bg-card/80 border-2 border-border/50 rounded-[32px] overflow-hidden">
                                                {searchResults.map((s) => (
                                                    <div key={s.user_id} className="p-6 flex items-center justify-between hover:bg-muted transition-colors border-b last:border-0 border-border/50">
                                                        <span className="font-[900] uppercase tracking-tighter text-sm">{s.full_name}</span>
                                                        <button 
                                                            className="text-[10px] font-[900] uppercase tracking-widest text-primary hover:text-foreground transition-colors"
                                                            onClick={() => initiateTransfer.mutate(s.user_id)} 
                                                            disabled={initiateTransfer.isPending}
                                                        >
                                                            PROPOSE TRANSFER
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {transfers.length > 0 && (
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-[900] uppercase tracking-widest text-amber-400 px-4">ACTIVE TRANSFERS</label>
                                            {transfers.map((t: any) => (
                                                <div key={t.id} className="bg-amber-400/[0.03] border-2 border-amber-400/20 p-8 rounded-[40px] space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-[900] uppercase tracking-tighter text-lg">
                                                            {t.clubs?.name} <span className="text-amber-400/40">TAKEOVER</span>
                                                        </h4>
                                                        <div className="bg-amber-400 text-background px-4 py-1 rounded-full text-[9px] font-[900] uppercase tracking-widest">PENDING</div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-amber-400/10">
                                                        <div className="space-y-3">
                                                            <p className="text-[9px] text-amber-400/40 font-[900] uppercase tracking-widest">DEPARTING COMMAND</p>
                                                            <div className="flex items-center gap-3">
                                                                {t.admin_confirmed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />}
                                                                <span className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground/80">{t.current_admin?.full_name}</span>
                                                                {t.current_admin_id === user?.id && !t.admin_confirmed && (
                                                                    <button className="bg-amber-400 text-background px-4 py-1.5 rounded-full text-[9px] font-[900] uppercase tracking-widest ml-auto" onClick={() => confirmDeparture.mutate(t.id)}>CONFIRM</button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <p className="text-[9px] text-amber-400/40 font-[900] uppercase tracking-widest">INCOMING COMMAND</p>
                                                            <div className="flex items-center gap-3">
                                                                {t.new_admin_accepted ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />}
                                                                <span className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground/80">{t.new_admin?.full_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Incoming transfer for students */}
                            {!isAdmin && transfers.some((t: any) => t.new_admin_id === user?.id) && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                                    <div className="bg-emerald-400/[0.03] border-2 border-emerald-400/20 p-10 rounded-[40px] space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-[900] uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                                <Sparkles className="h-4 w-4" /> INCOMING COMMAND OFFER
                                            </label>
                                            <h3 className="text-2xl font-[900] uppercase tracking-tighter leading-none">TAKEOVER REQUESTED</h3>
                                        </div>
                                        
                                        {transfers.filter((t: any) => t.new_admin_id === user?.id).map((t: any) => (
                                            <div key={t.id} className="space-y-8">
                                                <p className="text-sm font-[900] uppercase tracking-tight text-muted-foreground leading-relaxed">
                                                    <span className="text-foreground">{t.current_admin?.full_name}</span> IS DELEGATING 
                                                    COMMAND OF <span className="text-foreground">{t.clubs?.name}</span> TO YOU.
                                                </p>
                                                <div className="flex flex-wrap gap-4">
                                                    <button className="h-14 px-10 bg-emerald-400 text-background rounded-full font-[900] text-[10px] uppercase tracking-widest hover:scale-105 transition-transform" onClick={() => acceptTakeover.mutate(t.id)}>
                                                        ACCEPT TAKEOVER
                                                    </button>
                                                    <button className="h-14 px-10 bg-muted text-foreground border-2 border-border/50 rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-accent transition-colors">
                                                        DECLINE
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* My Certificates Section */}
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-12 border-t-2 border-border">
                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-[10px] font-[900] uppercase tracking-widest text-primary">RESOURCES / CERTIFICATIONS</label>
                                <h2 className="text-4xl font-[900] uppercase tracking-tighter">EARNED <span className="text-muted-foreground">ASSETS</span></h2>
                                <p className="text-[10px] text-muted-foreground font-[900] uppercase tracking-widest">ONLY EVENTS WITH VERIFIED TEMPLATES ARE SHOWN</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {attendedEvents.length === 0 ? (
                                    <div className="md:col-span-2 text-center py-20 bg-card/80 border-2 border-border/50 rounded-[40px] space-y-6">
                                        <div className="text-6xl grayscale opacity-20">🎓</div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-muted-foreground font-[900] uppercase tracking-widest">NO ASSETS DETECTED</p>
                                            <p className="text-xs text-muted-foreground/60 font-[900] uppercase tracking-widest">ATTEND EVENTS TO UNLOCK CERTIFICATIONS</p>
                                        </div>
                                    </div>
                                ) : (
                                    attendedEvents.map((a: any) => (
                                        <div key={a.event_id} className="bg-card border-2 border-border/50 p-8 rounded-[40px] hover:border-primary/40 transition-all group">
                                            <CertificateDownload
                                                eventId={a.event_id}
                                                eventTitle={(a.events as any)?.title || "Event"}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
    );
}
