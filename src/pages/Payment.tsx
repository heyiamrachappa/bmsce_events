import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, CreditCard, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Payment() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [completed, setCompleted] = useState(false);

    const { data: event, isLoading } = useQuery({
        queryKey: ["event", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("events").select("*, clubs(name), colleges(name)").eq("id", id!).single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const completePaymentMutation = useMutation({
        mutationFn: async () => {
            setIsProcessing(true);
            // Simulate payment delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update status in the unified event_registrations table
            const { error } = await supabase
                .from("event_registrations" as any)
                .update({
                    payment_status: 'paid',
                    registration_status: 'confirmed'
                } as any)
                .eq('event_id', id!)
                .eq('user_id', user!.id);

            if (error) throw error;

            setCompleted(true);
            setIsProcessing(false);
        },
        onSuccess: () => {
            toast.success("Payment successful! 🎉");
        },
        onError: (err: any) => {
            toast.error(err.message || "Payment failed.");
            setIsProcessing(false);
        }
    });

    if (isLoading) return <div className="min-h-screen flex items-center justify-center p-4">Loading...</div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center p-4">Event not found.</div>;

    const fee = (event as any).registration_fee;

    if (completed) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container max-w-md py-20 text-center space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Payment Successful!</h1>
                        <p className="text-muted-foreground">Your registration for {event.title} is now confirmed.</p>
                    </div>
                    <Button onClick={() => navigate("/dashboard")} className="w-full">Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="container max-w-md py-12 space-y-6">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>

                <Card className="shadow-2xl border-primary/10">
                    <CardHeader className="text-center border-b border-border/50 pb-8">
                        <CardTitle className="text-2xl font-black mb-2">Checkout</CardTitle>
                        <p className="text-muted-foreground text-sm">{event.title}</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        {/* Amount */}
                        <div className="text-center space-y-1">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Payable Amount</p>
                            <h2 className="text-4xl font-black text-primary flex items-center justify-center">
                                <IndianRupee className="h-8 w-8" /> {fee}
                            </h2>
                        </div>

                        {/* Placeholder UI */}
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border bg-muted/30 border-primary/20 flex gap-4 items-center">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">Credit/Debit Card</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">•••• •••• •••• 4242</p>
                                </div>
                                <div className="w-4 h-4 rounded-full border-4 border-primary" />
                            </div>

                            <div className="p-4 rounded-xl border border-transparent bg-muted/10 opacity-60 flex gap-4 items-center">
                                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                                    <span className="font-bold">UPI</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">UPI Payment</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">GPay, PhonePe, Paytm</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-lg font-bold gradient-primary text-white"
                            onClick={() => completePaymentMutation.mutate()}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Processing..." : `Pay ₹${fee}`}
                        </Button>

                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Secure Payment Gateway via BMSCE Campus Hub</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
