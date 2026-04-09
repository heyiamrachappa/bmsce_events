import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Search, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Award, 
    User, 
    Calendar,
    ShieldCheck,
    Building2,
    BookOpen
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";

export default function CertificateVerification() {
    const [certId, setCertId] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!certId.trim()) return;

        setVerifying(true);
        setResult(null);

        try {
            const { data, error } = await supabase
                .from("issued_certificates" as any)
                .select("*, events(*, clubs(*), colleges(*))")
                .eq("certificate_id", certId.trim())
                .maybeSingle();

            if (error) throw error;
            setResult(data || "not_found");
        } catch (err) {
            console.error(err);
            setResult("error");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container py-16 flex flex-col items-center">
                <div className="max-w-2xl w-full space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Verify Certificate</h1>
                        <p className="text-muted-foreground">
                            Enter a unique Certificate ID to verify its authenticity.
                        </p>
                    </div>

                    <Card className="shadow-2xl border-primary/20 bg-card/50 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <form onSubmit={handleVerify} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
                                        className="pl-10 h-12 bg-background/50"
                                        value={certId}
                                        onChange={(e) => setCertId(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    size="lg" 
                                    className="gradient-primary text-foreground border-0 px-8"
                                    disabled={verifying || !certId.trim()}
                                >
                                    {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {result === "not_found" && (
                            <Card className="border-red-500/30 bg-red-500/5 shadow-lg">
                                <CardContent className="p-10 text-center space-y-3">
                                    <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                                    <div>
                                        <h3 className="text-xl font-bold">Invalid Certificate</h3>
                                        <p className="text-muted-foreground">No certificate found with this ID. Please check the ID and try again.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {result === "error" && (
                            <Card className="border-amber-500/30 bg-amber-500/5 shadow-lg">
                                <CardContent className="p-10 text-center space-y-3">
                                    <Loader2 className="h-12 w-12 text-amber-500 mx-auto" />
                                    <div>
                                        <h3 className="text-xl font-bold">Verification Error</h3>
                                        <p className="text-muted-foreground">An error occurred while verifying the certificate. Please try again later.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {result && result !== "not_found" && result !== "error" && (
                            <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4">
                                    <Badge className="bg-emerald-500 text-foreground border-0 shadow-lg">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Valid 
                                    </Badge>
                                </div>
                                <CardHeader className="border-b border-emerald-500/10 pb-6">
                                    <CardTitle className="text-2xl font-black text-emerald-500 flex items-center gap-2">
                                        <Award className="h-7 w-7" /> Certificate Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                                <User className="h-3 w-3" /> Recipient Name
                                            </p>
                                            <p className="text-xl font-bold">{result.student_name}</p>
                                            <p className="text-base text-muted-foreground font-mono">{result.usn}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" /> Issued On
                                            </p>
                                            <p className="text-xl font-bold">{format(new Date(result.issued_at), "PPP")}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                                <BookOpen className="h-3 w-3" /> Event Title
                                            </p>
                                            <p className="text-xl font-bold">{result.events?.title}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3" /> Organized By
                                            </p>
                                            <p className="text-xl font-bold">{result.events?.clubs?.name}</p>
                                            <p className="text-base text-muted-foreground">{result.events?.colleges?.name}</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Certificate Hash ID</p>
                                            <p className="text-[11px] font-mono text-muted-foreground break-all">{result.certificate_id}</p>
                                        </div>
                                        {result.certificate_url && (
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={result.certificate_url} target="_blank" rel="noreferrer">
                                                    View Digital Copy
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                                <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
                            </Card>
                        )}
                    </div>

                    <div className="text-center pt-10">
                        <p className="text-sm text-muted-foreground italic flex items-center justify-center gap-1.5">
                             Verified by BMSCE-EVENTS Trust System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
