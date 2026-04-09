import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function StepDownAdmin({ clubId }: { clubId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const stepDownMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc("step_down_admin", { p_club_id: clubId });
            if (error) throw error;
        },
        onSuccess: async () => {
            toast({ title: "Admin Role Relinquished", description: "You are no longer an organizer for this club." });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
            navigate("/"); // redirect to student dashboard
        },
        onError: (err: any) => toast({ title: "Step Down Failed", description: err.message, variant: "destructive" }),
    });

    const handleStepDown = () => {
        if(window.confirm("Are you sure you want to step down as admin of this club? You will instantly lose organizer controls, the ability to post events, manage registrations, payments, or club posts. The club will be temporarily without an admin.")) {
            stepDownMutation.mutate();
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-8 border-t-2 border-border">
            <div className="space-y-2">
                <label className="text-sm font-[900] uppercase tracking-widest text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> DANGER ZONE
                </label>
                <p className="text-sm text-muted-foreground font-[900] uppercase tracking-widest">LEAVE ADMIN ROLE</p>
            </div>
            
            <div className="bg-destructive/[0.03] border-2 border-destructive/20 rounded-[32px] p-8 space-y-6">
                <div>
                    <h3 className="text-xl font-[900] uppercase tracking-tight text-destructive">RELINQUISH COMMAND</h3>
                    <p className="text-base font-[500] text-muted-foreground mt-2 leading-relaxed">
                        Stepping down will immediately revoke your organizer privileges. You will no longer be able to manage events, registrations, or payments for this club. 
                        <strong> If there are no other admins, the club will remain ownerless until a new admin is approved.</strong>
                    </p>
                </div>

                <div className="pt-4 border-t border-destructive/10">
                    <button 
                        onClick={handleStepDown}
                        disabled={stepDownMutation.isPending}
                        className="h-14 px-8 bg-destructive text-destructive-foreground rounded-full font-[900] text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {stepDownMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        STEP DOWN AS ADMIN
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
