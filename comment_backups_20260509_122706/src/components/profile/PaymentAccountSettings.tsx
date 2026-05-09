import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link2, Unlink } from "lucide-react";
import { motion } from "framer-motion";

export function PaymentAccountSettings({ clubId }: { clubId: string | null }) {
    const { user } = useAuth();
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
            toast.success("Account Linked", { description: "Razorpay setup updated successfully." });
            setAccountId("");
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast.error("Link Failed", { description: err.message }),
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
            toast.success("Account Unlinked", { description: "Your payment account has been disconnected." });
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast.error("Unlink Failed", { description: err.message }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId.trim()) return;
        linkAccountMutation.mutate(accountId);
    };

    if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

    const isConnected = account && account.account_status === 'active';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8 border-t-2 border-border w-full">
            <div className="space-y-2 px-2">
                <label className="text-[10px] sm:text-xs font-[900] uppercase tracking-[0.2em] text-primary">PAYMENT CONFIGURATION</label>
                <p className="text-xs sm:text-sm text-muted-foreground font-[900] uppercase tracking-widest leading-relaxed">CONNECT RAZORPAY TO ENABLE PAID EVENT REGISTRATIONS</p>
            </div>
            
            <div className="bg-card/80 border-2 border-border/50 rounded-2xl sm:rounded-[32px] p-5 sm:p-8 space-y-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className={`p-3 sm:p-4 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            {isConnected ? <Link2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <Unlink className="h-5 w-5 sm:h-6 sm:w-6" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg sm:text-xl font-[900] uppercase tracking-tight truncate">
                                {isConnected ? "RAZORPAY LINKED" : "NO PAYMENT ACCOUNT"}
                            </h3>
                            <p className="text-[10px] sm:text-sm uppercase font-[900] tracking-widest text-muted-foreground mt-1 break-all">
                                {isConnected ? `ACCOUNT ID: ${account.razorpay_account_id}` : "REQUIRED FOR PAID EVENTS"}
                            </p>
                        </div>
                    </div>
                </div>

                {!isConnected ? (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-4 border-t border-border/50">
                        <input 
                            placeholder="acc_xxxxxxxxxxxxxx OR KEY_ID" 
                            className="w-full h-12 sm:h-14 bg-background border-2 border-border/50 rounded-xl sm:rounded-full px-4 sm:px-6 font-[900] text-xs sm:text-sm uppercase tracking-widest placeholder:text-muted-foreground/30 focus:border-primary/40 outline-none transition-all"
                            value={accountId} 
                            onChange={(e) => setAccountId(e.target.value)} 
                            required 
                        />
                        <button 
                            type="submit" 
                            disabled={linkAccountMutation.isPending}
                            className="w-full h-12 sm:h-14 bg-primary text-primary-foreground rounded-xl sm:rounded-full font-[900] text-xs sm:text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {linkAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONNECT RAZORPAY"}
                        </button>
                    </form>
                ) : (
                    <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <p className="text-[10px] sm:text-sm text-muted-foreground font-[900] uppercase tracking-widest">
                            LAST UPDATED: {new Date(account.updated_at).toLocaleDateString()}
                        </p>
                        <button 
                            onClick={() => {
                                if(window.confirm("Are you sure you want to unlink your Razorpay account? You will not be able to accept paid registrations.")) {
                                    unlinkAccountMutation.mutate();
                                }
                            }}
                            disabled={unlinkAccountMutation.isPending}
                            className="w-full sm:w-auto h-10 px-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl sm:rounded-full font-[900] text-xs sm:text-sm uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
