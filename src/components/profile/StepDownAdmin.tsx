import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function StepDownAdmin({ clubId }: { clubId: string }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const stepDownMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc("step_down_admin", { p_club_id: clubId });
            if (error) throw error;
        },
        onSuccess: async () => {
            toast.success("Organiser Role Relinquished", { description: "You are no longer an organiser for this club." });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
            navigate("/"); // redirect to student dashboard
        },
        onError: (err: any) => toast.error("Step Down Failed", { description: err.message }),
    });

    const handleStepDown = () => {
        if(window.confirm("Are you sure you want to step down as club organiser of this club? You will instantly lose organiser controls, the ability to post events, manage registrations, payments, or club posts. The club will be temporarily without an organiser.")) {
            stepDownMutation.mutate();
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8 border-t-2 border-border w-full">
            <div className="space-y-2 px-2">
                <label className="text-[10px] sm:text-xs font-[900] uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" /> DANGER ZONE
                </label>
                <p className="text-xs sm:text-sm text-muted-foreground font-[900] uppercase tracking-widest">LEAVE ORGANISER ROLE</p>
            </div>
            
            <div className="bg-destructive/[0.03] border-2 border-destructive/20 rounded-2xl sm:rounded-[32px] p-5 sm:p-8 space-y-6">
                <div>
                    <h3 className="text-xl font-[900] uppercase tracking-tight text-destructive">RELINQUISH COMMAND</h3>
                    <p className="text-base font-[500] text-muted-foreground mt-2 leading-relaxed">
                        Stepping down will immediately revoke your organiser privileges. You will no longer be able to manage events, registrations, or payments for this club. 
                        <strong> If there are no other organisers, the club will remain ownerless until a new organiser is approved.</strong>
                    </p>
                </div>

                <div className="pt-4 border-t border-destructive/10">
                    <button 
                        onClick={handleStepDown}
                        disabled={stepDownMutation.isPending}
                        className="w-full sm:w-auto h-12 sm:h-14 px-8 bg-destructive text-destructive-foreground rounded-xl sm:rounded-full font-[900] text-xs sm:text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {stepDownMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        STEP DOWN AS CLUB ORGANISER
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
