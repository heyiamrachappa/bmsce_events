import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const { toast } = useToast();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Verify your email", description: "If an account exists, you will receive a reset link." });
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
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Account Recovery</p>
                    </div>
                </div>

                <Card className="shadow-card border-border">
                    <CardHeader>
                        <CardTitle>Forgot Password</CardTitle>
                        <CardDescription>Enter your email to receive a password reset link.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleReset}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    required placeholder="you@college.edu" className="bg-muted/50" />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Send Reset Link
                            </Button>
                            <div className="text-center">
                                <Link to="/auth" className="text-sm text-primary flex items-center justify-center gap-1 hover:underline">
                                    <ArrowLeft className="h-3 w-3" /> Back to Sign In
                                </Link>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </div>
    );
}
