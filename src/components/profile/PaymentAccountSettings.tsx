import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Unlink } from "lucide-react";
import { motion } from "framer-motion";

export function PaymentAccountSettings({ clubId }: { clubId: string | null }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [accountId, setAccountId] = useState("");

    const { data: account, isLoading } = useQuery({
        queryKey: ["payment_account", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("organizer_payment_accounts")
                .select("*")
                .eq("organizer_user_id", user!.id)
                .single();
            return data;
        },
        enabled: !!user,
    });

    const { data: activePaidEvents = [] } = useQuery({
        queryKey: ["active_paid_events", user?.id, clubId],
        queryFn: async () => {
            if (!clubId) return [];
            const { data } = await supabase
                .from("events")
                .select("id")
                .eq("club_id", clubId)
                .eq("is_published", true)
                .gt("registration_fee", 0);
            return data || [];
        },
        enabled: !!user && !!clubId,
    });

    const linkAccountMutation = useMutation({
        mutationFn: async (razorpayAccountId: string) => {
            if (!clubId) throw new Error("No club associated");
            const { data, error } = await supabase
                .from("organizer_payment_accounts")
                .upsert({
                    organizer_user_id: user!.id,
                    club_id: clubId,
                    razorpay_account_id: razorpayAccountId,
                    account_status: "active",
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast({ title: "Account Linked", description: "Razorpay setup updated successfully." });
            setAccountId("");
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast({ title: "Link Failed", description: err.message, variant: "destructive" }),
    });

    const unlinkAccountMutation = useMutation({
        mutationFn: async () => {
            if (activePaidEvents.length > 0) {
                throw new Error("Cannot unlink. You have active paid events.");
            }
            const { error } = await supabase
                .from("organizer_payment_accounts")
                .update({ account_status: "disconnected", updated_at: new Date().toISOString() })
                .eq("organizer_user_id", user!.id);
            
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Account Unlinked", description: "Your payment account has been disconnected." });
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast({ title: "Unlink Failed", description: err.message, variant: "destructive" }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId.trim()) return;
        linkAccountMutation.mutate(accountId);
    };

    if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

    const isConnected = account && account.account_status === 'active';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-8 border-t-2 border-border">
            <div className="space-y-2">
                <label className="text-sm font-[900] uppercase tracking-widest text-primary">PAYMENT CONFIGURATION</label>
                <p className="text-sm text-muted-foreground font-[900] uppercase tracking-widest">CONNECT RAZORPAY TO ENABLE PAID EVENT REGISTRATIONS</p>
            </div>
            
            <div className="bg-card/80 border-2 border-border/50 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-full ${isConnected ? 'bg-emerald-400/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            {isConnected ? <Link2 className="h-6 w-6" /> : <Unlink className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-[900] uppercase tracking-tight">
                                {isConnected ? "RAZORPAY LINKED" : "NO PAYMENT ACCOUNT"}
                            </h3>
                            <p className="text-sm uppercase font-[900] tracking-widest text-muted-foreground mt-1">
                                {isConnected ? `ACCOUNT ID: ${account.razorpay_account_id}` : "REQUIRED FOR PAID EVENTS"}
                            </p>
                        </div>
                    </div>
                </div>

                {!isConnected ? (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
                        <input 
                            placeholder="acc_xxxxxxxxxxxxxx OR KEY_ID" 
                            className="flex-1 h-14 bg-background border-2 border-border/50 rounded-full px-6 font-[900] text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                            value={accountId} 
                            onChange={(e) => setAccountId(e.target.value)} 
                            required 
                        />
                        <button 
                            type="submit" 
                            disabled={linkAccountMutation.isPending}
                            className="h-14 px-8 bg-primary text-primary-foreground rounded-full font-[900] text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {linkAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "CONNECT RAZORPAY"}
                        </button>
                    </form>
                ) : (
                    <div className="pt-4 border-t border-border/50 flex flex-wrap gap-4 items-center justify-between">
                        <p className="text-sm text-muted-foreground font-[900] uppercase tracking-widest">
                            LAST UPDATED: {new Date(account.updated_at).toLocaleDateString()}
                        </p>
                        <button 
                            onClick={() => {
                                if(window.confirm("Are you sure you want to unlink your Razorpay account? You will not be able to accept paid registrations.")) {
                                    unlinkAccountMutation.mutate();
                                }
                            }}
                            disabled={unlinkAccountMutation.isPending}
                            className="h-10 px-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-full font-[900] text-sm uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {unlinkAccountMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                            UNLINK ACCOUNT
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
