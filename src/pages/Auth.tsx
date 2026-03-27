import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { heroReveal, staggerContainer } from "@/lib/motion-variants";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const fullName = form.get("fullName") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (!email.toLowerCase().endsWith("@bmsce.ac.in")) {
      setLoading(false);
      toast({ 
        title: "Access Restricted", 
        description: "Only @bmsce.ac.in email addresses are allowed.", 
        variant: "destructive" 
      });
      return;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setLoading(false);
    toast({ title: "Check your email", description: "We sent you a confirmation link." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden selection:bg-primary/30">
      <div className="w-full max-w-xl space-y-12 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-[900] text-primary uppercase tracking-[0.4em]">SECURE ACCESS / GATEWAY</span>
              <h1 className="text-[10vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-white">
                THE<br /><span className="text-white/20">PORTAL</span>
              </h1>
           </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white/[0.03] border-2 border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="p-10 pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-full h-16 p-2">
                <TabsTrigger value="signin" className="rounded-full font-[900] uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black transition-all">INITIALIZE</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full font-[900] uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black transition-all">REGISTER</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <div className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-[900] uppercase tracking-widest text-white/20">COLLEGE EMAIL</label>
                      <input name="email" type="email" required placeholder="YOU@BMSCE.AC.IN" className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" />
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between px-2">
                        <label className="text-[9px] font-[900] uppercase tracking-widest text-white/20">ACCESS CODE</label>
                        <Link to="/forgot-password" title="Recover Access" className="text-[9px] text-primary hover:text-white transition-colors font-[900] uppercase tracking-widest">
                          LOST KEY?
                        </Link>
                      </div>
                      <input name="password" type="password" required placeholder="••••••••" className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-20 rounded-full bg-white text-black font-[900] uppercase tracking-widest text-[10px] hover:bg-primary transition-all active:scale-95 flex items-center justify-center" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "AUTHENTICATE"}
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <div className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-[900] uppercase tracking-widest text-white/20">FULL NAME</label>
                      <input name="fullName" required placeholder="OPERATIVE NAME" className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-[900] uppercase tracking-widest text-white/20">COLLEGE EMAIL</label>
                      <input name="email" type="email" required placeholder="YOU@BMSCE.AC.IN" className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-[900] uppercase tracking-widest text-white/20">SECURE PASSWORD</label>
                      <input name="password" type="password" required minLength={6} placeholder="••••••••" className="w-full h-16 px-8 bg-white/[0.03] border-2 border-white/5 focus:border-primary/40 focus:outline-none rounded-full font-[900] uppercase tracking-tighter text-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-20 rounded-full bg-white text-black font-[900] uppercase tracking-widest text-[10px] hover:bg-primary transition-all active:scale-95 flex items-center justify-center" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "CREATE IDENTITY"}
                  </button>
                  <p className="text-[9px] text-center text-white/20 font-[900] uppercase tracking-widest leading-relaxed">
                    ACCESS IS RESTRICTED TO @BMSCE.AC.IN EMAILS ONLY.<br />
                    <span className="text-primary/40 italic">VALIDATION REQUIRED POST-REGISTRATION.</span>
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center">
           <Link to="/" className="text-[10px] font-[900] text-white/10 hover:text-white uppercase tracking-[0.5em] transition-all">
             EXIT_SESSION
           </Link>
        </div>
      </div>
    </div>
  );
}
