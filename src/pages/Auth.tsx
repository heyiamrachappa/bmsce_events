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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        {/* Logo & Title */}
        <motion.div variants={heroReveal} className="text-center space-y-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="h-20 w-20 rounded-3xl bg-white p-3 shadow-glow mx-auto flex items-center justify-center overflow-hidden border border-white/20"
          >
            <img src="/bmsce-logo.png" alt="BMSCE Logo" className="h-full w-full object-contain" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-white font-display uppercase leading-none">
              EVENT <span className="text-primary">ACCESS</span>
            </h1>
            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em]">BMSCE Events Portal</p>
          </div>
        </motion.div>

        {/* Auth Card */}
        <motion.div variants={heroReveal}>
          <Card className="glass-panel border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
            <Tabs defaultValue={defaultTab}>
              <CardHeader className="pb-4 pt-8 px-8">
                <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-2xl h-14 p-1">
                  <TabsTrigger value="signin" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Join Us</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn}>
                  <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-[10px] font-black uppercase tracking-widest text-primary">College Email</Label>
                      <Input id="signin-email" name="email" type="email" required placeholder="you@bmsce.ac.in" className="h-14 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-[10px] font-black uppercase tracking-widest text-primary">Password</Label>
                        <Link to="/forgot-password" title="Recover Access" className="text-[10px] text-primary hover:text-white transition-colors font-black uppercase tracking-widest">
                          Forgot Password?
                        </Link>
                      </div>
                      <Input id="signin-password" name="password" type="password" required placeholder="••••••••" className="h-14 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <Button type="submit" className="btn-vivid w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-sm" disabled={loading}>
                      {loading && <Loader2 className="h-5 w-5 mr-3 animate-spin" />}
                      Sign In to Portal
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp}>
                  <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-[10px] font-black uppercase tracking-widest text-primary">Full Name</Label>
                      <Input id="signup-name" name="fullName" required placeholder="John Doe" className="h-14 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-widest text-primary">College Email (@bmsce.ac.in)</Label>
                      <Input id="signup-email" name="email" type="email" required placeholder="you@bmsce.ac.in" className="h-14 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-widest text-primary">Set Password</Label>
                      <Input id="signup-password" name="password" type="password" required minLength={6} placeholder="••••••••" className="h-14 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <Button type="submit" className="btn-vivid w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-sm" disabled={loading}>
                      {loading && <Loader2 className="h-5 w-5 mr-3 animate-spin" />}
                      Create Account
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground/50 font-bold uppercase tracking-widest leading-relaxed">
                      All accounts start as regular students. <br />
                      <span className="text-primary/60">Apply for organizer status from the dashboard.</span>
                    </p>
                  </CardContent>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
