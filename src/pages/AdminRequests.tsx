import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, X, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminRequests() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!authLoading && !user) navigate("/auth");
    }, [user, authLoading, navigate]);

    // Check if user is super_admin
    const { data: isSuperAdmin = false } = useQuery({
        queryKey: ["is_super_admin", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user!.id)
                .eq("role", "super_admin")
                .maybeSingle();
            return !!data;
        },
        enabled: !!user,
    });

    // Fetch all pending requests
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["all_admin_requests"],
        queryFn: async () => {
            const { data } = await supabase
                .from("admin_requests")
                .select("*, clubs(name, category), profiles!admin_requests_user_id_fkey(full_name, user_id)")
                .order("created_at", { ascending: false });
            return data || [];
        },
        enabled: !!user && isSuperAdmin,
    });

    const approveMutation = useMutation({
        mutationFn: async ({ requestId, approved }: { requestId: string; approved: boolean }) => {
            const { error } = await supabase.rpc("approve_admin_request", {
                _request_id: requestId,
                _approved: approved,
            });
            if (error) throw error;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["all_admin_requests"] });
            toast.success(vars.approved ? "Request approved! User is now an organizer." : "Request rejected.");
        },
        onError: (err: any) => {
            toast.error(err.message || "Operation failed");
        },
    });

    if (authLoading || (!isSuperAdmin && !authLoading)) {
        if (!authLoading && !isSuperAdmin) {
            return (
                <div className="min-h-screen bg-background text-foreground">
                    <Navbar />
                    <div className="container max-w-4xl py-32 px-6 text-center space-y-12">
                        <div className="text-8xl">🔒</div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-[900] uppercase tracking-[-0.04em]">ACCESS <span className="text-muted-foreground/60">DENIED</span></h2>
                            <p className="text-[10px] text-muted-foreground font-[900] uppercase tracking-widest">RESTRICTED TO SUPER ADMIN CLEARANCE ONLY</p>
                        </div>
                        <button 
                            onClick={() => navigate("/dashboard")}
                            className="h-16 px-12 bg-foreground text-background rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-primary transition-colors"
                        >
                            RETURN TO BASE
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const pending = requests.filter((r: any) => r.status === "pending");
    const processed = requests.filter((r: any) => r.status !== "pending");

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container max-w-5xl py-20 px-6">
                <div className="space-y-20">
                    <div className="space-y-4 border-b-2 border-border pb-12">
                        <div className="text-[10px] font-[900] uppercase tracking-[0.2em] text-primary">COMMAND CENTER / VERIFICATION</div>
                        <h1 className="text-5xl sm:text-7xl font-[900] uppercase tracking-[-0.04em] leading-none mb-4">
                            ORGANIZER <span className="text-muted-foreground">REQUESTS</span>
                        </h1>
                        <p className="text-xs text-muted-foreground font-[900] uppercase tracking-widest">VALIDATE AND PROVISION CLUB ACCESS</p>
                    </div>

                    <div className="grid grid-cols-1 gap-16">
                        {/* Pending */}
                        <div className="space-y-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-[900] uppercase tracking-tighter">PENDING <span className="text-muted-foreground/60">QUEUE</span></h2>
                                <div className="bg-accent px-4 py-1 rounded-full text-[10px] font-[900] uppercase tracking-widest">{pending.length} ACTIVE</div>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[1, 2].map((i) => <div key={i} className="h-48 rounded-[40px] bg-card/80 border-2 border-border/50 animate-pulse" />)}
                                </div>
                            ) : pending.length === 0 ? (
                                <div className="py-20 bg-card/80 border-2 border-border/50 rounded-[40px] text-center">
                                    <p className="text-[10px] text-muted-foreground/60 font-[900] uppercase tracking-widest">NO PENDING APPLICATIONS DETECTED</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {pending.map((req: any) => (
                                        <div key={req.id} className="bg-card/80 border-2 border-border/50 rounded-[40px] p-8 space-y-8 hover:border-border transition-all flex flex-col justify-between">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <p className="font-[900] uppercase tracking-tighter text-lg">{req.profiles?.full_name || "REDACTED"}</p>
                                                        <p className="text-[10px] text-muted-foreground font-[900] uppercase tracking-widest">{format(new Date(req.created_at), "MMM d, yyyy h:mm a")}</p>
                                                    </div>
                                                    <div className="bg-amber-400 text-background px-3 py-1 rounded-full text-[9px] font-[900] uppercase tracking-widest">PENDING</div>
                                                </div>

                                                <div className="space-y-3 pt-6 border-t border-border/50">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] text-muted-foreground/60 font-[900] uppercase tracking-widest">TARGET CLUB</label>
                                                        <p className="text-sm font-[900] uppercase tracking-tight">{req.clubs?.name}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] text-muted-foreground/60 font-[900] uppercase tracking-widest">SECTOR</label>
                                                        <p className="text-[10px] font-[900] uppercase tracking-widest text-primary">{req.clubs?.category}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-8 border-t border-border/50 space-y-4">
                                                <button
                                                    className="w-full h-14 bg-muted text-foreground border-2 border-border/50 rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-accent transition-colors flex items-center justify-center gap-2"
                                                    onClick={() => {
                                                        supabase.storage.from("admin-proofs").createSignedUrl(req.proof_url, 300).then(({ data, error }) => {
                                                            if (error) {
                                                                toast.error("Could not generate proof link");
                                                                return;
                                                            }
                                                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                                        });
                                                    }}
                                                >
                                                    <FileText className="h-4 w-4" /> VIEW CREDENTIALS
                                                </button>
                                                
                                                <div className="flex gap-4">
                                                    <button
                                                        className="flex-1 h-14 bg-muted text-red-500 border-2 border-red-500/10 rounded-full font-[900] text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                        disabled={approveMutation.isPending}
                                                        onClick={() => approveMutation.mutate({ requestId: req.id, approved: false })}
                                                    >
                                                        REJECT
                                                    </button>
                                                    <button
                                                        className="flex-1 h-14 bg-primary text-primary-foreground rounded-full font-[900] text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center"
                                                        disabled={approveMutation.isPending}
                                                        onClick={() => approveMutation.mutate({ requestId: req.id, approved: true })}
                                                    >
                                                        {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-background" /> : "APPROVE"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Processed */}
                        {processed.length > 0 && (
                            <div className="space-y-10 pt-16 border-t-2 border-border">
                                <h2 className="text-2xl font-[900] uppercase tracking-tighter text-muted-foreground">HISTORY <span className="text-muted-foreground/30">ARCHIVE</span></h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {processed.map((req: any) => (
                                        <div key={req.id} className="bg-card/20 border-2 border-border/30 p-6 rounded-[24px] flex items-center justify-between group grayscale hover:grayscale-0 transition-all">
                                            <div className="space-y-1 min-w-0">
                                                <p className="font-[900] uppercase tracking-tighter text-sm truncate">{req.profiles?.full_name || "IDENTIFIED USER"}</p>
                                                <p className="text-[9px] text-muted-foreground/60 font-[900] uppercase tracking-widest truncate">{req.clubs?.name}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-[900] uppercase tracking-widest ${
                                                req.status === "approved" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                                            }`}>
                                                {req.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
