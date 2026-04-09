import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { IndianRupee, CreditCard, ShieldCheck, ArrowLeft, CheckCircle2, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Payment() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [completed, setCompleted] = useState(false);

    const { data: event, isLoading } = useQuery({
        queryKey: ["event", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*, clubs(name), colleges(name)")
                .eq("id", id!)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const { data: registration } = useQuery({
        queryKey: ["registration_for_payment", id, user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_registrations")
                .select("*")
                .eq("event_id", id!)
                .eq("user_id", user!.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id && !!user,
    });

    const fee = (event as any)?.registration_fee;

    const completePaymentMutation = useMutation({
        mutationFn: async () => {
            setIsProcessing(true);
            // Simulate payment delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const ref = `SIM-${Date.now()}`;

            const { error: updateError } = await supabase
                .from("event_registrations")
                .update({
                    payment_status: 'paid',
                    registration_status: 'confirmed',
                    payment_reference: ref
                })
                .eq('event_id', id!)
                .eq('user_id', user!.id);

            if (updateError) throw updateError;

            if (registration) {
                const { error: insertError } = await supabase.from("event_payments").insert({
                    event_id: id!,
                    user_id: user!.id,
                    amount: fee,
                    payment_status: 'completed',
                    payment_reference: ref,
                    participant_name: registration.student_name,
                    participant_usn: registration.usn
                });
                if (insertError) console.error("Payment logging failed:", insertError);
            }

            setCompleted(true);
            setIsProcessing(false);
        },
        onSuccess: () => {
            toast.success("Payment Received! 🎉");
        },
        onError: (err: any) => {
            toast.error(err.message || "Transfer failed.");
            setIsProcessing(false);
        }
    });

    if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-32 animate-pulse h-96 bg-foreground/5 rounded-[60px]" /></div>;
    if (!event) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6"><Navbar /><h2 className="text-4xl font-black">EVENT NOT FOUND</h2><button onClick={() => navigate("/events")} className="h-16 px-12 rounded-full border-2 border-foreground font-black uppercase tracking-tighter hover:bg-foreground hover:text-background transition-all">BACK TO EVENTS</button></div>;

    if (completed) {
        return (
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
                <Navbar />
                <div className="container max-w-2xl py-40 px-6 space-y-12 text-center">
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mx-auto w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-4xl shadow-emerald-500/20"
                    >
                        <CheckCircle2 className="h-16 w-16 text-background stroke-[3]" />
                    </motion.div>
                    <div className="space-y-6">
                        <h1 className="text-[10vw] sm:text-[6vw] font-[900] uppercase leading-[0.8] tracking-[-0.05em]">
                            Payment<br /><span className="text-emerald-500">Confirmed</span>
                        </h1>
                        <p className="text-base font-[900] uppercase tracking-widest text-muted-foreground/60 max-w-md mx-auto">
                            Your spot at {event.title} is secured. See you there!
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate("/dashboard")} 
                        className="w-full h-24 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-4xl"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-32">
            <Navbar />
            
            <main className="container max-w-4xl py-32 px-6 space-y-20">
                {/* Header */}
                <div className="space-y-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-4 text-muted-foreground hover:text-primary transition-all"
                    >
                        <ArrowLeft className="h-5 w-5 stroke-[4] group-hover:-translate-x-2 transition-transform" /> 
                        <span className="text-sm font-[900] uppercase tracking-widest">Back</span>
                    </button>
                    
                    <div className="space-y-4">
                        <span className="text-sm font-[900] text-primary uppercase tracking-[0.4em] block">Secure Checkout</span>
                        <h1 className="text-[12vw] sm:text-[8vw] font-[900] leading-[0.8] tracking-[-0.05em] uppercase">
                            FINALIZE<br />
                            <span className="text-muted-foreground/60">PAYMENT</span>
                        </h1>
                    </div>
                </div>

                <div className="grid lg:grid-cols-1 gap-12">
                    <div className="p-12 bg-card border-2 border-border rounded-[40px] space-y-12 shadow-2xl">
                        {/* Event Context */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-12 border-b-2 border-border/50">
                            <div className="space-y-2">
                                <p className="text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">EVENT</p>
                                <p className="text-2xl font-[900] uppercase tracking-tighter">{event.title}</p>
                            </div>
                            <div className="space-y-2 text-left sm:text-right">
                                <p className="text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">AMOUNT</p>
                                <p className="text-4xl font-[900] tracking-tighter text-primary flex items-center sm:justify-end gap-2">
                                    <IndianRupee className="h-6 w-6 stroke-[3]" /> {fee}
                                </p>
                            </div>
                        </div>

                        {/* Simulator Warning */}
                        <div className="p-8 rounded-[32px] bg-amber-500/5 border-2 border-amber-500/20 flex gap-6 items-center">
                            <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                            <p className="text-sm font-[900] uppercase tracking-widest leading-relaxed text-amber-500/80">
                                <span className="text-amber-500">Simulator Mode:</span> This is a demonstration gateway. No real money will be charged. Clicking confirm will simulate a successful transaction.
                            </p>
                        </div>

                        {/* Payment Options (Mock) */}
                        <div className="space-y-4">
                            <div className="p-10 rounded-[32px] border-2 border-primary/20 bg-primary/5 flex gap-6 items-center group cursor-pointer transition-all hover:border-primary/40">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <CreditCard className="h-6 w-6 stroke-[3]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-[900] uppercase tracking-tighter">Student Wallet / Card</p>
                                    <p className="text-sm font-[900] text-muted-foreground/60 uppercase tracking-widest">Connected via Campus ID</p>
                                </div>
                                <div className="h-6 w-6 rounded-full border-4 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                            </div>

                            <div className="p-10 rounded-[32px] border-2 border-border/40 bg-muted/5 flex gap-6 items-center opacity-40 grayscale pointer-events-none">
                                <div className="h-14 w-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                                    <Zap className="h-6 w-6 stroke-[3]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-[900] uppercase tracking-tighter">UPI / Net Banking</p>
                                    <p className="text-sm font-[900] text-muted-foreground/60 uppercase tracking-widest">Currently Disabled</p>
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="space-y-6 pt-4">
                            <button
                                onClick={() => completePaymentMutation.mutate()}
                                disabled={isProcessing}
                                className="w-full h-24 rounded-full bg-primary text-primary-foreground font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-4xl shadow-primary/20 disabled:opacity-50 disabled:grayscale"
                            >
                                {isProcessing ? "PROCESSING..." : `CONFIRM ₹${fee}`}
                            </button>
                            <div className="flex items-center justify-center gap-4 text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">
                                <ShieldCheck className="h-4 w-4" />
                                <span>SECURE ACADEMIC GATEWAY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
