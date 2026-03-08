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
        return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
    }

    // Already has a request
    if (existingRequest && (existingRequest.status === "pending" || existingRequest.status === "approved")) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container max-w-lg py-16 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                    <h2 className="text-2xl font-bold">
                        {existingRequest.status === "pending" ? "Application Under Review" : "You're a Club Organizer!"}
                    </h2>
                    <p className="text-muted-foreground">
                        {existingRequest.status === "pending"
                            ? `Your request to manage ${(existingRequest as any).clubs?.name || "a club"} is being reviewed by a super admin.`
                            : `You are the verified organizer for ${(existingRequest as any).clubs?.name || "your club"}.`}
                    </p>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container max-w-lg py-10">
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            Apply for Club Organizer
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Select your club and upload proof to become its organizer. Only one organizer is allowed per club.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {existingRequest?.status === "rejected" && (
                            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 text-sm text-red-700 dark:text-red-400">
                                Your previous application was rejected. You may apply again.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Category Dropdown */}
                            <div className="space-y-2">
                                <Label>Club Category *</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger id="category-select">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Club Dropdown — disabled until category is selected */}
                            <div className="space-y-2">
                                <Label>Club Name *</Label>
                                <Select
                                    value={selectedClubId}
                                    onValueChange={setSelectedClubId}
                                    disabled={!selectedCategory}
                                >
                                    <SelectTrigger id="club-select">
                                        <SelectValue placeholder={!selectedCategory ? "Select a category first" : "Select a club"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableClubs.length === 0 ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">
                                                No available clubs in this category
                                            </div>
                                        ) : (
                                            availableClubs.map((club: any) => (
                                                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {selectedCategory && availableClubs.length === 0 && (
                                    <p className="text-xs text-amber-600">All clubs in this category already have an organizer.</p>
                                )}
                            </div>

                            {/* Proof Upload */}
                            <div className="space-y-2">
                                <Label>Proof Document *</Label>
                                <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                                    <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <span className="text-sm text-muted-foreground truncate">
                                        {proofFile ? proofFile.name : "Upload club ID card, appointment letter, etc."}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        required
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                                <p className="text-xs text-muted-foreground">Accepted: images, PDF</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={submitting || !selectedClubId || !proofFile}
                            >
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                                ) : (
                                    "Submit Application"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
