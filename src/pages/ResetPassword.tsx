import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we have a valid session (Supabase handles the token in the URL automatically)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast({ title: "Session Expired", description: "Please request a new reset link.", variant: "destructive" });
                navigate("/forgot-password");
            }
        };
        checkSession();
    }, [navigate, toast]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Your password has been updated." });
            navigate("/auth");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-white p-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] mx-auto flex items-center justify-center overflow-hidden">
                        <img src="/bmsce-logo.png" alt="BMSCE Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase">BMSCE EVENTS</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Account Security</p>
                    </div>
                </div>

                <Card className="shadow-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Reset Password
                        </CardTitle>
                        <CardDescription>Enter your new password below.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUpdatePassword}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    required minLength={6} placeholder="••••••••" className="bg-muted/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    required minLength={6} placeholder="••••••••" className="bg-muted/50" />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Update Password
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </div>
    );
}
