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

    // Fetch attended events for certificates
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

    const totalActivityPoints = attendedEvents.reduce((sum: number, a: any) => {
        return sum + ((a.events as any)?.activity_points || 0);
    }, 0);

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
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    const isAdmin = profile?.role === "admin";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container max-w-4xl py-10 space-y-8">
                <header className="space-y-1">
                    <h1 className="text-3xl font-black flex items-center gap-2">
                        <User className="h-8 w-8 text-primary" /> Account Settings
                    </h1>
                    <p className="text-muted-foreground">Manage your profile and club ownership.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Summary */}
                    <Card className="md:col-span-1 shadow-card border-border">
                        <CardHeader className="text-center">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                                <User className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle>{profile?.full_name}</CardTitle>
                            <CardDescription>{user?.email}</CardDescription>
                            <div className="flex justify-center pt-2">
                                {isAdmin ? (
                                    <Badge className="gradient-primary text-white border-0">Club Organizer</Badge>
                                ) : (
                                    <Badge variant="secondary">Student</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>{profile?.colleges?.name || "No College Linked"}</span>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-2 text-primary font-medium">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{profile?.clubs?.name} Admin</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-amber-400 font-medium pt-2 border-t border-border">
                                <Star className="h-4 w-4" />
                                <span>{totalActivityPoints} Activity Points</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Management */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Email Change */}
                        <Card className="shadow-card border-border">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-primary" /> Change Email
                                </CardTitle>
                                <CardDescription>Update your contact email address.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={updateEmailMutation} className="flex gap-2">
                                    <Input type="email" placeholder="new-email@college.edu"
                                        value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                                    <Button type="submit" disabled={emailLoading}>
                                        {emailLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Update"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Club Transfer System */}
                        {isAdmin && (
                            <Card className="shadow-card border-border border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ArrowRightLeft className="h-5 w-5 text-primary" /> Club Ownership Transfer
                                    </CardTitle>
                                    <CardDescription>Transfer your club to another student. This action is irreversible once completed.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Search Students */}
                                    <div className="space-y-3">
                                        <Label>Find a successor (Same College)</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Search student name..." className="pl-9"
                                                    value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                                            </div>
                                            <Button variant="secondary" onClick={handleSearchStudents} disabled={searching || studentSearch.length < 3}>
                                                Search
                                            </Button>
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="border rounded-md divide-y bg-background">
                                                {searchResults.map((s) => (
                                                    <div key={s.user_id} className="p-3 flex items-center justify-between">
                                                        <span className="font-medium">{s.full_name}</span>
                                                        <Button size="sm" variant="ghost" className="text-primary"
                                                            onClick={() => initiateTransfer.mutate(s.user_id)} disabled={initiateTransfer.isPending}>
                                                            Propose Transfer
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pending Transfers */}
                                    {transfers.length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="text-primary">Active Transfer Process</Label>
                                            {transfers.map((t: any) => (
                                                <div key={t.id} className="bg-background border p-4 rounded-lg space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold flex items-center gap-2">
                                                            Transferring {t.clubs?.name}
                                                        </h4>
                                                        <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div className="space-y-2">
                                                            <p className="text-muted-foreground">Departing Admin</p>
                                                            <div className="flex items-center gap-2">
                                                                {t.admin_confirmed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                                                                <span>{t.current_admin?.full_name} (You)</span>
                                                                {t.current_admin_id === user?.id && !t.admin_confirmed && (
                                                                    <Button size="sm" className="h-7 px-2" onClick={() => confirmDeparture.mutate(t.id)}>Confirm</Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-muted-foreground">New Admin</p>
                                                            <div className="flex items-center gap-2">
                                                                {t.new_admin_accepted ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                                                                <span>{t.new_admin?.full_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* If Student has incoming transfer */}
                        {!isAdmin && transfers.some((t: any) => t.new_admin_id === user?.id) && (
                            <Card className="shadow-card border-emerald-500 border-2 bg-emerald-500/5">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-emerald-500" /> Incoming Ownership Offer
                                    </CardTitle>
                                    <CardDescription>You have been selected to take over a club.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {transfers.filter((t: any) => t.new_admin_id === user?.id).map((t: any) => (
                                        <div key={t.id} className="flex flex-col gap-4">
                                            <p className="text-sm">
                                                <span className="font-bold text-emerald-600">{t.current_admin?.full_name}</span> wants to transfer
                                                ownership of <span className="font-bold">{t.clubs?.name}</span> to you.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => acceptTakeover.mutate(t.id)}>
                                                    Accept Takeover
                                                </Button>
                                                <Button variant="outline" className="text-destructive border-destructive"
                                                    onClick={() => { /* Implement cancel/reject if needed */ }}>
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* My Certificates Section */}
                <Card className="shadow-card border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-400" /> My Certificates
                        </CardTitle>
                        <CardDescription>
                            Certificates from events you attended. Only events with a certificate template uploaded by the organizer will appear.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {attendedEvents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No certificates available yet. Attend events to earn certificates!
                            </p>
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
            </div>
        </div>
    );
}

// Sparkles icon for the takeover badge
function Sparkles(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
    );
}
