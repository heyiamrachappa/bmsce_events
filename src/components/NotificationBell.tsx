import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["notifications_transfers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_transfer_requests")
        .select("*, clubs(name), current_admin:current_admin_id(full_name)")
        .eq("status", "pending")
        .eq("new_admin_id", user!.id)
        .eq("new_admin_accepted", false);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000, 
  });

  const acceptTakeover = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("accept_transfer_takeover", {
        _request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Command Accepted!", {
        description: "You are now the club organiser.",
      });
      queryClient.invalidateQueries({ queryKey: ["notifications_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setOpen(false);
    },
    onError: (err: any) =>
      toast.error("Failed to accept", { description: err.message }),
  });

  const count = transfers.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-10 w-10 rounded-full border-2 border-border/50 flex items-center justify-center hover:bg-accent transition-all text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-black text-[10px] font-black flex items-center justify-center border-2 border-background">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-2 border-border rounded-2xl overflow-hidden shadow-2xl" align="end">
        <div className="p-4 border-b-2 border-border/50 bg-muted/30">
          <h4 className="text-sm font-black uppercase tracking-widest">Notifications</h4>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs font-black uppercase text-muted-foreground animate-pulse">
              Checking for alerts...
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs font-black uppercase text-muted-foreground">All Clear</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-border/30">
              {transfers.map((t: any) => (
                <div key={t.id} className="p-4 space-y-4 hover:bg-muted/10 transition-colors">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-tight">
                        <span className="text-primary">{t.current_admin?.full_name}</span> is offering you control of <span className="text-white">{t.clubs?.name}</span>.
                      </p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Transition Request
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => acceptTakeover.mutate(t.id)}
                    disabled={acceptTakeover.isPending}
                    className="w-full h-10 rounded-full font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600 text-black border-none"
                  >
                    {acceptTakeover.isPending ? "Syncing..." : "Accept Command"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
