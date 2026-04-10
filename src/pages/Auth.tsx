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
      toast({ title: "Login failed", description: error.message || "Please check your email and password.", variant: "destructive" });
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

    if (!fullName || fullName.trim().length < 2) {
      setLoading(false);
      toast({ 
        title: "Name Required", 
        description: "Please enter your full name.", 
        variant: "destructive" 
      });
      return;
    }

    if (!email) {
      setLoading(false);
      toast({ 
        title: "Email Required", 
        description: "Please enter your email address to sign up.", 
        variant: "destructive" 
      });
      return;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden selection:bg-primary/30">
      <div className="w-full max-w-xl space-y-12 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
              <span className="text-sm font-[900] text-primary uppercase tracking-[0.4em]">Campus Hub</span>
              <h1 className="text-[10vw] font-[900] leading-[0.75] tracking-[-0.05em] uppercase text-foreground">
                Get<br /><span className="text-muted-foreground/60">Started</span>
              </h1>
           </div>
        </div>

        {/* Auth Card */}
        <div className="bg-card border-2 border-border/50 rounded-[40px] overflow-hidden shadow-2xl">
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="p-10 pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-muted rounded-full h-16 p-2">
                <TabsTrigger value="signin" className="rounded-full font-[900] uppercase tracking-widest text-sm data-[state=active]:bg-primary data-[state=active]:text-background transition-all">SIGN IN</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full font-[900] uppercase tracking-widest text-sm data-[state=active]:bg-primary data-[state=active]:text-background transition-all">SIGN UP</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <div className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">EMAIL ADDRESS</label>
                      <input name="email" type="email" required placeholder="you@example.com" className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-base normal-case" />
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between px-2">
                        <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">PASSWORD</label>
                        <Link to="/forgot-password" title="Forgot Password" className="text-xs text-primary hover:text-foreground transition-colors font-[900] uppercase tracking-widest">
                          FORGOT?
                        </Link>
                      </div>
                      <input name="password" type="password" required placeholder="••••••••" className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-base normal-case" />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-20 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-sm hover:bg-primary transition-all active:scale-95 flex items-center justify-center" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SIGN IN"}
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <div className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">FULL NAME</label>
                      <input name="fullName" required placeholder="Your Full Name" className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-base normal-case" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">EMAIL ADDRESS</label>
                      <input name="email" type="email" required placeholder="you@example.com" className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-base normal-case" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">PASSWORD</label>
                      <input name="password" type="password" required minLength={6} placeholder="••••••••" className="w-full h-16 px-8 bg-card border-2 border-border/50 focus:border-primary/40 focus:outline-none rounded-full font-medium text-base normal-case" />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-20 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-sm hover:bg-primary transition-all active:scale-95 flex items-center justify-center" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "CREATE ACCOUNT"}
                  </button>
                  <p className="text-xs text-center text-muted-foreground/60 font-[900] uppercase tracking-widest leading-relaxed">
                    Open to everyone. @bmsce.ac.in emails get college benefits.<br />
                    <span className="text-primary/40">Check your inbox for a verification link after signing up.</span>
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center">
           <Link to="/" className="text-sm font-[900] text-muted-foreground/30 hover:text-foreground uppercase tracking-[0.5em] transition-all">
             BACK TO HOME
           </Link>
        </div>
      </div>
    </div>
  );
}
