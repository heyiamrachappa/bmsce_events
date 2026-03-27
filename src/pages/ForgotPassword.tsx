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
    <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden selection:bg-primary/30">
      <div className="w-full max-w-xl space-y-12 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-[900] text-primary uppercase tracking-[0.4em]">SECURITY / RECOVERY</span>
              <h1 className="text-[10vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-white">
                LOST<br /><span className="text-white/20">KEY</span>
              </h1>
              <p className="text-[10px] font-[900] text-white/40 uppercase tracking-widest max-w-xs">
                INITIALIZE ACCESS RESTORATION SEQUENCE. PROVIDE IDENTIFIER.
              </p>
           </div>
        </div>

        {/* Recovery Card */}
        <div className="bg-white/[0.03] border-2 border-white/5 rounded-[40px] overflow-hidden shadow-2xl p-12">
          <form onSubmit={handleReset} className="space-y-10">
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-[9px] font-[900] uppercase tracking-widest text-primary">COLLEGE EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  placeholder="YOU@BMSCE.AC.IN" 
                  className="w-full h-20 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-2xl text-center" 
                />
              </div>
            </div>

            <div className="space-y-6">
              <button 
                type="submit" 
                className="w-full h-24 rounded-full bg-white text-black font-[900] uppercase tracking-widest text-sm hover:bg-primary transition-all active:scale-95 flex items-center justify-center" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "TRANSMIT RESET LINK"}
              </button>
              
              <div className="flex justify-center">
                <Link to="/auth" className="group flex items-center gap-3 text-[10px] font-[900] text-white/20 hover:text-white uppercase tracking-widest transition-all">
                  <ArrowLeft className="h-4 w-4 stroke-[4] group-hover:-translate-x-1 transition-transform" /> 
                  RETURN TO GATEWAY
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
