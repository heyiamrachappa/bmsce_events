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
                <div className="min-h-screen bg-background">
                    <Navbar />
                    <div className="container py-20 text-center space-y-4">
                        <p className="text-5xl">🔒</p>
                        <h2 className="text-2xl font-bold">Super Admin Access Required</h2>
                        <p className="text-muted-foreground">Only super admins can view organizer requests.</p>
                        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
                    </div>
                </div>
            );
        }
        return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
    }

    const pending = requests.filter((r: any) => r.status === "pending");
    const processed = requests.filter((r: any) => r.status !== "pending");

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container py-10 space-y-8 max-w-3xl">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Organizer Requests
                    </h1>
                    <p className="text-muted-foreground">Review and approve club organizer applications</p>
                </div>

                {/* Pending */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Pending ({pending.length})</h2>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2].map((i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
                        </div>
                    ) : pending.length === 0 ? (
                        <Card className="shadow-card">
                            <CardContent className="p-6 text-center text-muted-foreground">
                                No pending requests.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pending.map((req: any) => (
                                <Card key={req.id} className="shadow-card">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <p className="font-bold">{req.profiles?.full_name || "User"}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Applying for: <span className="font-medium text-foreground">{req.clubs?.name}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Category: {req.clubs?.category} • {format(new Date(req.created_at), "MMM d, yyyy h:mm a")}
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 shrink-0">Pending</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Open proof in new tab
                                                    supabase.storage.from("admin-proofs").createSignedUrl(req.proof_url, 300).then(({ data, error }) => {
                                                        if (error) {
                                                            toast.error("Could not generate proof link");
                                                            return;
                                                        }
                                                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                                    });
                                                }}
                                            >
                                                <FileText className="h-4 w-4 mr-1" /> View Proof
                                            </Button>
                                            <div className="flex-1" />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                disabled={approveMutation.isPending}
                                                onClick={() => approveMutation.mutate({ requestId: req.id, approved: false })}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={approveMutation.isPending}
                                                onClick={() => approveMutation.mutate({ requestId: req.id, approved: true })}
                                            >
                                                {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                                Approve
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Processed */}
                {processed.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Processed</h2>
                        <div className="space-y-3">
                            {processed.map((req: any) => (
                                <Card key={req.id} className="shadow-card opacity-70">
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate">{req.profiles?.full_name || "User"}</p>
                                            <p className="text-sm text-muted-foreground truncate">{req.clubs?.name}</p>
                                        </div>
                                        <Badge className={req.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                                            {req.status}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
