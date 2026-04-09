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
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden selection:bg-primary/30">
      <div className="w-full max-w-xl space-y-12 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
              <span className="text-sm font-[900] text-primary uppercase tracking-[0.4em]">Password Recovery</span>
              <h1 className="text-[10vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-foreground">
                Forgot<br /><span className="text-muted-foreground/60">Password?</span>
              </h1>
              <p className="text-sm font-[900] text-muted-foreground uppercase tracking-widest max-w-xs">
                Enter your college email and we'll send you a recovery link.
              </p>
           </div>
        </div>

        {/* Recovery Card */}
        <div className="bg-card border-2 border-border/50 rounded-[40px] overflow-hidden shadow-2xl p-12">
          <form onSubmit={handleReset} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-xs font-[900] uppercase tracking-widest text-primary">Your college email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  placeholder="you@bmsce.ac.in" 
                  className="w-full h-20 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-lg text-center normal-case" 
                />
              </div>
            </div>

            <div className="space-y-6">
              <button 
                type="submit" 
                className="w-full h-24 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-base hover:bg-primary transition-all active:scale-95 flex items-center justify-center" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "SEND RESET LINK"}
              </button>
              
              <div className="flex justify-center">
                <Link to="/auth" className="group flex items-center gap-3 text-sm font-[900] text-muted-foreground/60 hover:text-foreground uppercase tracking-widest transition-all">
                  <ArrowLeft className="h-4 w-4 stroke-[4] group-hover:-translate-x-1 transition-transform" /> 
                  BACK TO SIGN IN
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
