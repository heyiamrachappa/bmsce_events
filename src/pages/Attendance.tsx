import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  Award, 
  ArrowLeft,
  CalendarDays,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const eventId = searchParams.get("event_id");
  const token = searchParams.get("token");
  
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; points?: number } | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event_minimal", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("title, venue, location, start_date")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast.info("Please sign in to mark your attendance.");
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!eventId || !token) {
      setResult({ success: false, message: "Invalid attendance link. Missing parameters." });
      return;
    }

    const verify = async () => {
      setVerifying(true);
      try {
        const { data, error } = await supabase.rpc("verify_live_attendance" as any, {
          p_event_id: eventId,
          p_token: token
        });

        if (error) throw error;

        const res = data as any;
        setResult({
          success: res.success,
          message: res.message,
          points: res.points_awarded
        });

        if (res.success) {
          toast.success("Attendance marked successfully! 🎯");
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        setResult({ success: false, message: err.message || "Verification failed." });
        toast.error("Failed to verify attendance.");
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [user, authLoading, eventId, token, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary/30">
      <Navbar />

      <main className="container max-w-2xl py-32 md:py-48 px-6 space-y-12 text-center">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-center mb-8">
            <button 
              onClick={() => navigate("/dashboard")}
              className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-sm font-[900] uppercase tracking-widest"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
            </button>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-[900] leading-[0.85] tracking-[-0.04em] uppercase">
            ATTENDANCE<br />
            <span className="text-muted-foreground/40">VERIFICATION</span>
          </h1>
        </div>

        {/* Event Context */}
        {event && (
          <div className="p-8 rounded-[32px] bg-card border-2 border-border/50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-[900] uppercase tracking-tight text-primary">{event.title}</h2>
            <div className="flex flex-wrap justify-center gap-6 text-sm font-[900] uppercase tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.venue || event.location}</span>
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {new Date(event.start_date).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 blur-[100px] -z-10 rounded-full" />
          
          <div className="p-12 sm:p-16 rounded-[48px] bg-card/80 border-2 border-border shadow-2xl backdrop-blur-xl">
            {verifying || authLoading || (eventId && !event && eventLoading) ? (
              <div className="space-y-8">
                <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-xl font-[900] uppercase tracking-widest text-muted-foreground animate-pulse">
                  Authenticating Sequence...
                </p>
              </div>
            ) : result ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-10"
              >
                {result.success ? (
                  <div className="space-y-8">
                    <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-500/30 flex items-center justify-center mx-auto shadow-4xl shadow-emerald-500/20">
                      <CheckCircle2 className="h-16 w-16 text-emerald-500 stroke-[3]" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-4xl font-[900] uppercase tracking-tighter">Status: Confirmed</h3>
                      <p className="text-muted-foreground/80 font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                        {result.message}
                      </p>
                    </div>
                    {result.points && (
                      <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500">
                        <Award className="h-6 w-6" />
                        <span className="font-black text-lg tracking-tighter">+{result.points} ACTIVITY POINTS</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/30 flex items-center justify-center mx-auto shadow-4xl shadow-red-500/20">
                      <XCircle className="h-16 w-16 text-red-500 stroke-[3]" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-4xl font-[900] uppercase tracking-tighter">Verification Failed</h3>
                      <p className="text-red-400/80 font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                        {result.message}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate("/dashboard")}
                      className="h-16 px-10 rounded-full border-2 border-border text-foreground font-[900] uppercase tracking-widest hover:bg-foreground hover:text-background transition-all"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}
                
                <div className="pt-8 border-t border-border/50 flex items-center justify-center gap-3 text-xs font-[900] text-muted-foreground/40 uppercase tracking-[0.3em]">
                  <ShieldCheck className="h-4 w-4" /> Secure Verification System
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <XCircle className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-black uppercase tracking-widest">
                  Invalid Request State
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs font-[900] text-muted-foreground/30 uppercase tracking-[0.5em]">
          BMSCE CAMPUS CONNECT HUB
        </p>
      </main>
    </div>
  );
}
