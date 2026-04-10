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
    CheckCircle2, XCircle, Loader2, Search, UserMinus, Award, Star,
    Download, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CertificateDownload from "@/components/CertificateDownload";
import { PaymentAccountSettings } from "@/components/profile/PaymentAccountSettings";
import { StepDownAdmin } from "@/components/profile/StepDownAdmin";
import { motion, AnimatePresence } from "framer-motion";
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
    const [activeTab, setActiveTab] = useState<"general" | "club" | "assets">("general");

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
                .from("event_attendance")
                .select("event_id, events(id, title, activity_points)")
                .eq("user_id", user!.id);
            return attendance || [];
        },
        enabled: !!user,
    });

    const { data: activityPointsRecords = [] } = useQuery({
        queryKey: ["my_activity_points_records", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("activity_points")
                .select("points")
                .eq("user_id", user!.id);
            return data || [];
        },
        enabled: !!user,
    });

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
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

    const totalActivityPoints = activityPointsRecords.reduce((sum: number, r: any) => sum + (r.points || 0), 0);

    const updateEmailMutation = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newEmail) {
            toast({ 
                title: "Invalid Email", 
                description: "Please enter a valid email address.", 
                variant: "destructive" 
            });
            return;
        }

        setEmailLoading(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        setEmailLoading(false);
        
        if (error) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ 
                title: "Confirmation Required", 
                description: "Check both your current and new email inboxes to confirm this change. Your email will not change until both links are clicked.",
                duration: 10000
            });
            setNewEmail("");
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
            toast({ title: "Departure Confirmed", description: "Waiting for the new organiser to accept." });
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
        },
    });

    const acceptTakeover = useMutation({
        mutationFn: async (requestId: string) => {
            const { error } = await supabase.rpc("accept_transfer_takeover", { _request_id: requestId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Welcome, Organiser!", description: "You are now the club organiser." });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
        },
    });

    if (authLoading || profileLoading || rolesLoading || adminRequestLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const isAdmin = profile?.role === "admin" || 
                    profile?.account_type === "admin" || 
                    roles.some((r: any) => r.role === "college_admin" || r.role === "admin") || 
                    adminRequest?.status === "approved";

    const activeClubId = profile?.club_id || adminRequest?.club_id;
    const activeClubName = profile?.clubs?.name || adminRequest?.clubs?.name;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="w-full max-w-5xl mx-auto py-12 md:py-24 px-4 sm:px-6 lg:px-8 relative">
                <div className="space-y-12">
                    {/* Header: Unified Theme Style */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="text-sm font-black uppercase tracking-[0.3em] text-primary">ACCOUNT PORTAL</div>
                        <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
                            {activeTab === "general" && <>PROFILE <span className="text-muted-foreground">HUB</span></>}
                            {activeTab === "club" && <>CLUB <span className="text-muted-foreground">CONSOLE</span></>}
                            {activeTab === "assets" && <>MY <span className="text-muted-foreground">ASSETS</span></>}
                        </h1>
                    </motion.div>

                    {/* Tab Navigation: Standard pill style */}
                    <div className="flex flex-wrap gap-2 p-1.5 bg-card border-2 border-border rounded-2xl sm:rounded-full w-full sm:w-fit">
                        <button 
                            onClick={() => setActiveTab("general")}
                            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                        >
                            Profile
                        </button>
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab("club")}
                                className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'club' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                            >
                                Club Management
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab("assets")}
                            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                        >
                            Assets
                        </button>
                    </div>

                    <div className="pt-8">
                        <AnimatePresence mode="wait">
                            {activeTab === "general" && (
                                <motion.div 
                                    key="general" 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 10 }}
                                    className="grid grid-cols-1 lg:grid-cols-3 gap-12"
                                >
                                    {/* Profile Sidebar */}
                                    <div className="lg:col-span-1 space-y-8">
                                        <div className="bg-card border-2 border-border rounded-3xl sm:rounded-[40px] p-6 sm:p-10 space-y-8">
                                            <div className="text-center space-y-6">
                                                <div className="h-32 w-32 rounded-full mx-auto bg-background border-2 border-border flex items-center justify-center relative group">
                                                    <div className="absolute inset-x-[-10px] inset-y-[-10px] rounded-full border border-primary/20 scale-0 group-hover:scale-100 transition-transform duration-500" />
                                                    <User className="h-12 w-12 text-primary" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight break-all">{profile?.full_name}</h2>
                                                    <p className="text-sm text-muted-foreground font-black uppercase tracking-widest mt-1 break-all">{user?.email}</p>
                                                </div>
                                                <div className="inline-block bg-primary text-black px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest">
                                                    {isAdmin ? "CLUB ORGANISER" : "STUDENT"}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-6 pt-8 border-t-2 border-border/50">
                                                <div className="flex items-center gap-4">
                                                    <Building2 className="h-4 w-4 text-muted-foreground/60" />
                                                    <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">{profile?.colleges?.name || "BMSCE"}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Star className="h-4 w-4 text-amber-400" />
                                                    <span className="text-sm font-black uppercase tracking-widest text-amber-400">{totalActivityPoints} XP</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="lg:col-span-2 space-y-12">
                                        <div className="bg-card border-2 border-border rounded-3xl sm:rounded-[40px] p-6 sm:p-10 space-y-10">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black uppercase tracking-tighter">Security Credentials</h3>
                                                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Update your contact identity</p>
                                            </div>
                                            
                                            <form onSubmit={updateEmailMutation} className="space-y-6">
                                                <div className="space-y-4">
                                                    <label className="text-sm font-black uppercase tracking-widest ml-4 text-muted-foreground">New College Email</label>
                                                    <div className="space-y-2 relative group">
                                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary" />
                                                        <Input 
                                                            type="email" 
                                                            placeholder="YOU@EXAMPLE.COM"
                                                            className="h-16 rounded-full border-2 border-border bg-background font-black text-sm uppercase pl-14 pr-8 focus:border-primary/40 transition-all"
                                                            value={newEmail} 
                                                            onChange={(e) => setNewEmail(e.target.value)} 
                                                            required 
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground/60 font-black uppercase tracking-widest px-8">Requires dual-identity verification</p>
                                                </div>
                                                <Button 
                                                    type="submit" 
                                                    size="lg"
                                                    className="w-full h-16 rounded-full font-black text-sm uppercase tracking-widest bg-foreground text-background hover:bg-primary transition-all"
                                                    disabled={emailLoading}
                                                >
                                                    {emailLoading ? "Synchronizing..." : "Update Email"}
                                                </Button>
                                            </form>
                                        </div>

                                        {!isAdmin && transfers.some((t: any) => t.new_admin_id === user?.id) && (
                                            <div className="bg-emerald-400/5 border-2 border-emerald-400/20 p-10 rounded-[40px] space-y-8">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Command Alert</p>
                                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Ownership Takeover Available</h3>
                                                </div>
                                                {transfers.filter((t: any) => t.new_admin_id === user?.id).map((t: any) => (
                                                    <div key={t.id} className="space-y-6">
                                                        <p className="text-base font-bold uppercase text-muted-foreground leading-relaxed">
                                                            {t.current_admin?.full_name} is delegating command of <span className="text-white">{t.clubs?.name}</span> to you.
                                                        </p>
                                                        <Button 
                                                            onClick={() => acceptTakeover.mutate(t.id)}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-sm rounded-full h-14 px-10 transition-all hover:scale-[1.02]"
                                                        >
                                                            Accept Command
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "club" && isAdmin && (
                                <motion.div 
                                    key="club" 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 10 }}
                                    className="space-y-12"
                                >
                                    <div className="bg-card border-2 border-border rounded-3xl sm:rounded-[40px] p-6 sm:p-10 space-y-12">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-8 border-b-2 border-border/50">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-primary uppercase tracking-widest">Authorized Club</p>
                                                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{activeClubName}</h2>
                                            </div>
                                            <div className="bg-muted px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                                Lead Club Organiser
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                            {/* Admin Actions */}
                                            <div className="space-y-12">
                                                <PaymentAccountSettings clubId={activeClubId} />
                                                <StepDownAdmin clubId={activeClubId} />
                                            </div>

                                            {/* User Search & Transfer */}
                                            <div className="bg-background/50 border-2 border-border/80 p-6 sm:p-10 rounded-3xl sm:rounded-[40px] space-y-8">
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-black uppercase tracking-tighter">Transition Authority</h4>
                                                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Delegate control to a verified member</p>
                                                </div>
                                                
                                                <div className="space-y-6">
                                                    <div className="relative group">
                                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 transition-colors group-focus-within:text-primary" />
                                                        <input 
                                                            placeholder="SEARCH BY NAME..." 
                                                            className="w-full h-16 bg-card border-2 border-border rounded-full pl-14 pr-8 font-black text-sm uppercase tracking-widest focus:border-primary/40 transition-all outline-none"
                                                            value={studentSearch} 
                                                            onChange={(e) => setStudentSearch(e.target.value)} 
                                                        />
                                                    </div>
                                                    <Button onClick={handleSearchStudents} disabled={searching} className="w-full h-16 rounded-full font-black uppercase text-sm hover:scale-[1.01] transition-all">
                                                        {searching ? "Searching Network..." : "Search Members"}
                                                    </Button>

                                                    {searchResults.length > 0 && (
                                                        <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl divide-y divide-border/50">
                                                            {searchResults.map((s) => (
                                                                <div key={s.user_id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                                    <span className="font-black uppercase text-[12px]">{s.full_name}</span>
                                                                    <Button size="sm" onClick={() => initiateTransfer.mutate(s.user_id)} className="font-black uppercase text-xs rounded-full h-10 px-6 border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-black transition-all">
                                                                        Offer Command
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {transfers.length > 0 && (
                                                    <div className="space-y-4 pt-6 border-t-2 border-border/50">
                                                        <p className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                                            <Clock className="h-3 w-3" /> PENDING TRANSFERS
                                                        </p>
                                                        {transfers.map((t: any) => (
                                                            <div key={t.id} className="p-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl flex items-center justify-between">
                                                                <span className="text-sm font-black uppercase text-muted-foreground">{t.new_admin?.full_name}</span>
                                                                {t.current_admin_id === user?.id && !t.admin_confirmed && (
                                                                    <Button size="sm" onClick={() => confirmDeparture.mutate(t.id)} className="bg-amber-400 hover:bg-amber-500 text-black h-8 px-4 text-xs font-black uppercase">Finalize</Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "assets" && (
                                <motion.div 
                                    key="assets" 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 10 }}
                                    className="space-y-12"
                                >
                                    {attendedEvents.length === 0 ? (
                                        <div className="text-center py-32 bg-card border-2 border-border rounded-[40px] space-y-6">
                                            <Award className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                                            <div className="space-y-2">
                                                <p className="text-xl font-black uppercase text-muted-foreground">No Assets Detected</p>
                                                <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Attend events to unlock certifications</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {attendedEvents.map((a: any) => (
                                                <div key={a.event_id} className="bg-card border-2 border-border p-8 rounded-[40px] hover:border-primary/40 transition-all group">
                                                    <CertificateDownload
                                                        eventId={a.event_id}
                                                        eventTitle={(a.events as any)?.title || "Asset"}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
    );
}
