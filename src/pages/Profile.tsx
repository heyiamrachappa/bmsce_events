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
        <div className="min-h-screen bg-[#0A0A0B] text-foreground">
            <Navbar />
            <div className="container max-w-4xl py-10 space-y-8">
                <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <h1 className="text-3xl font-black flex items-center gap-2.5 font-display tracking-tight">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        Account Settings
                    </h1>
                    <p className="text-muted-foreground/70 font-medium">Manage your profile and club ownership.</p>
                </motion.header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Summary */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="md:col-span-1 glass-card rounded-2xl gradient-border">
                            <CardHeader className="text-center pt-8">
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="h-24 w-24 rounded-full mx-auto mb-3 relative"
                                >
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-pink-500 to-cyan-400 animate-spin-slow" />
                                    <div className="absolute inset-[3px] rounded-full bg-[#0A0A0B] flex items-center justify-center">
                                        <User className="h-10 w-10 text-primary" />
                                    </div>
                                </motion.div>
                                <CardTitle className="font-display">{profile?.full_name}</CardTitle>
                                <CardDescription className="text-muted-foreground/60">{user?.email}</CardDescription>
                                <div className="flex justify-center pt-3">
                                    {isAdmin ? (
                                        <Badge className="gradient-primary text-white border-0 px-3 py-1 font-bold text-xs shadow-glow">Club Organizer</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="px-3 py-1 rounded-lg font-semibold text-xs">Student</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm pb-7">
                                <div className="flex items-center gap-2.5 text-muted-foreground/70">
                                    <Building2 className="h-4 w-4 text-cyan-400" />
                                    <span className="font-medium">{profile?.colleges?.name || "No College Linked"}</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center gap-2.5 text-primary font-semibold">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{profile?.clubs?.name} Admin</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5 pt-3 border-t border-white/[0.06]">
                                    <Star className="h-4 w-4 text-amber-400" />
                                    <span className="font-bold text-amber-400">{totalActivityPoints} Activity Points</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Account Management */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Email Change */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="glass-card rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 font-display">
                                        <Mail className="h-5 w-5 text-primary" /> Change Email
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground/60">Update your contact email address.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={updateEmailMutation} className="flex gap-2">
                                        <Input type="email" placeholder="new-email@college.edu"
                                            value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                                        <Button type="submit" className="gradient-primary border-0 rounded-xl font-bold" disabled={emailLoading}>
                                            {emailLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Update"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Club Transfer System */}
                        {isAdmin && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="glass-card rounded-2xl border-primary/20 bg-primary/[0.03]">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2 font-display">
                                            <ArrowRightLeft className="h-5 w-5 text-primary" /> Club Ownership Transfer
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground/60">Transfer your club to another student. This action is irreversible once completed.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Find a successor (Same College)</Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                                    <Input placeholder="Search student name..." className="pl-10"
                                                        value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                                                </div>
                                                <Button variant="secondary" onClick={handleSearchStudents} disabled={searching || studentSearch.length < 3} className="rounded-xl font-semibold">
                                                    Search
                                                </Button>
                                            </div>
                                            {searchResults.length > 0 && (
                                                <div className="border border-white/[0.08] rounded-xl divide-y divide-white/[0.06] bg-white/[0.02] overflow-hidden">
                                                    {searchResults.map((s) => (
                                                        <div key={s.user_id} className="p-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                                                            <span className="font-semibold">{s.full_name}</span>
                                                            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 rounded-lg"
                                                                onClick={() => initiateTransfer.mutate(s.user_id)} disabled={initiateTransfer.isPending}>
                                                                Propose Transfer
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {transfers.length > 0 && (
                                            <div className="space-y-3">
                                                <Label className="text-primary font-bold text-xs uppercase tracking-wider">Active Transfer Process</Label>
                                                {transfers.map((t: any) => (
                                                    <div key={t.id} className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-bold flex items-center gap-2 font-display">
                                                                Transferring {t.clubs?.name}
                                                            </h4>
                                                            <Badge variant="outline" className="text-amber-400 border-amber-500/30 rounded-lg text-[10px] font-bold">Pending</Badge>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                                            <div className="space-y-2">
                                                                <p className="text-muted-foreground/60 font-semibold uppercase tracking-wider text-[10px]">Departing Admin</p>
                                                                <div className="flex items-center gap-2">
                                                                    {t.admin_confirmed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />}
                                                                    <span className="font-medium">{t.current_admin?.full_name} (You)</span>
                                                                    {t.current_admin_id === user?.id && !t.admin_confirmed && (
                                                                        <Button size="sm" className="h-7 px-2.5 gradient-primary border-0 rounded-lg text-xs font-bold" onClick={() => confirmDeparture.mutate(t.id)}>Confirm</Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <p className="text-muted-foreground/60 font-semibold uppercase tracking-wider text-[10px]">New Admin</p>
                                                                <div className="flex items-center gap-2">
                                                                    {t.new_admin_accepted ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />}
                                                                    <span className="font-medium">{t.new_admin?.full_name}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Incoming transfer for students */}
                        {!isAdmin && transfers.some((t: any) => t.new_admin_id === user?.id) && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="glass-card rounded-2xl border-emerald-500/30 bg-emerald-500/[0.04]">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2 font-display">
                                            <Sparkles className="h-5 w-5 text-emerald-400" /> Incoming Ownership Offer
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground/60">You have been selected to take over a club.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {transfers.filter((t: any) => t.new_admin_id === user?.id).map((t: any) => (
                                            <div key={t.id} className="flex flex-col gap-4">
                                                <p className="text-sm font-medium">
                                                    <span className="font-bold text-emerald-400">{t.current_admin?.full_name}</span> wants to transfer
                                                    ownership of <span className="font-bold">{t.clubs?.name}</span> to you.
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold" onClick={() => acceptTakeover.mutate(t.id)}>
                                                        Accept Takeover
                                                    </Button>
                                                    <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl font-bold"
                                                        onClick={() => { /* Implement cancel/reject if needed */ }}>
                                                        Decline
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* My Certificates Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="glass-card rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 font-display">
                                <Award className="h-5 w-5 text-amber-400" /> My Certificates
                            </CardTitle>
                            <CardDescription className="text-muted-foreground/60">
                                Certificates from events you attended. Only events with a certificate template uploaded by the organizer will appear.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {attendedEvents.length === 0 ? (
                                <div className="text-center py-8 space-y-3">
                                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="text-4xl">
                                        🎓
                                    </motion.div>
                                    <p className="text-sm text-muted-foreground/60 font-medium">
                                        No certificates available yet. Attend events to earn certificates!
                                    </p>
                                </div>
                            ) : (
                                attendedEvents.map((a: any) => (
                                    <CertificateDownload
                                        key={a.event_id}
                                        eventId={a.event_id}
                                        eventTitle={(a.events as any)?.title || "Event"}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>
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
