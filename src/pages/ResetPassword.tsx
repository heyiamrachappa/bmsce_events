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
    <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden selection:bg-primary/30">
      <div className="w-full max-w-xl space-y-12 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-[900] text-primary uppercase tracking-[0.4em]">SECURITY / OVERRIDE</span>
              <h1 className="text-[10vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-white">
                RESET<br /><span className="text-white/20">ACCESS</span>
              </h1>
              <p className="text-[10px] font-[900] text-white/40 uppercase tracking-widest max-w-xs">
                INITIALIZE COMMAND OVERRIDE. ESTABLISH NEW SECURITY CREDENTIALS.
              </p>
           </div>
        </div>

        {/* Reset Card */}
        <div className="bg-white/[0.03] border-2 border-white/5 rounded-[40px] overflow-hidden shadow-2xl p-12">
          <form onSubmit={handleUpdatePassword} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-[900] uppercase tracking-widest text-primary">NEW SECURITY CODE</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-[900] uppercase tracking-widest text-primary">CONFIRM SECURITY CODE</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <button 
                type="submit" 
                className="w-full h-24 rounded-full bg-white text-black font-[900] uppercase tracking-widest text-sm hover:bg-primary transition-all active:scale-95 flex items-center justify-center" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "UPDATE CREDENTIALS"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
