import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCheck, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AttendanceManagerProps {
    event: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AttendanceManager({ event, open, onOpenChange }: AttendanceManagerProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");

    // Fetch registered students
    const { data: registrations = [], isLoading: regsLoading } = useQuery({
        queryKey: ["event_registrations_attendance", event?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_registrations" as any)
                .select("*")
                .eq("event_id", event.id)
                .eq("registration_status", "confirmed")
                .order("registered_at", { ascending: true });
            if (error) throw error;
            return (data as any[]) || [];
        },
        enabled: !!event?.id && open,
    });

    // Fetch existing attendance
    const { data: attendance = [], isLoading: attLoading } = useQuery({
        queryKey: ["event_attendance", event?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_attendance" as any)
                .select("*")
                .eq("event_id", event.id);
            if (error) throw error;
            return (data as any[]) || [];
        },
        enabled: !!event?.id && open,
    });

    const attendedUserIds = new Set(attendance.map((a: any) => a.user_id));

    const markMutation = useMutation({
        mutationFn: async ({ reg, present }: { reg: any; present: boolean }) => {
            if (present) {
                const { error } = await supabase
                    .from("event_attendance" as any)
                    .insert({
                        event_id: event.id,
                        user_id: reg.user_id,
                        registration_id: reg.id,
                        student_name: reg.student_name,
                        usn: reg.usn,
                        college_email: reg.college_email,
                        marked_by: user!.id,
                    });
                if (error && !error.message?.includes("duplicate")) throw error;
            } else {
                const { error } = await supabase
                    .from("event_attendance" as any)
                    .delete()
                    .eq("event_id", event.id)
                    .eq("user_id", reg.user_id);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event_attendance", event?.id] });
        },
        onError: () => toast.error("Failed to update attendance"),
    });

    const markAllMutation = useMutation({
        mutationFn: async (markPresent: boolean) => {
            if (markPresent) {
                const toInsert = registrations
                    .filter((r: any) => !attendedUserIds.has(r.user_id))
                    .map((r: any) => ({
                        event_id: event.id,
                        user_id: r.user_id,
                        registration_id: r.id,
                        student_name: r.student_name,
                        usn: r.usn,
                        college_email: r.college_email,
                        marked_by: user!.id,
                    }));
                if (toInsert.length > 0) {
                    const { error } = await supabase
                        .from("event_attendance" as any)
                        .insert(toInsert);
                    if (error) throw error;
                }
            } else {
                const { error } = await supabase
                    .from("event_attendance" as any)
                    .delete()
                    .eq("event_id", event.id);
                if (error) throw error;
            }
        },
        onSuccess: (_, markPresent) => {
            queryClient.invalidateQueries({ queryKey: ["event_attendance", event?.id] });
            toast.success(markPresent ? "All marked as attended" : "All attendance cleared");
        },
        onError: () => toast.error("Failed to update attendance"),
    });

    const filtered = registrations.filter((r: any) => {
        const q = search.toLowerCase();
        return (
            r.student_name?.toLowerCase().includes(q) ||
            r.usn?.toLowerCase().includes(q) ||
            r.college_email?.toLowerCase().includes(q)
        );
    });

    const presentCount = attendance.length;
    const totalCount = registrations.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" /> Attendance: {event?.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 pt-1">
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                            {presentCount}/{totalCount} present
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, USN, or email..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Bulk actions */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => markAllMutation.mutate(true)}
                            disabled={markAllMutation.isPending}
                        >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark All Present
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => markAllMutation.mutate(false)}
                            disabled={markAllMutation.isPending}
                        >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Clear All
                        </Button>
                    </div>

                    {/* List */}
                    <ScrollArea className="flex-1 -mx-1 px-1">
                        {(regsLoading || attLoading) ? (
                            <div className="text-center py-8 text-muted-foreground">Loading...</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No students found.</div>
                        ) : (
                            <div className="space-y-1">
                                {filtered.map((reg: any) => {
                                    const isPresent = attendedUserIds.has(reg.user_id);
                                    return (
                                        <div
                                            key={reg.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-white/5 ${isPresent ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5"
                                                }`}
                                            onClick={() => markMutation.mutate({ reg, present: !isPresent })}
                                        >
                                            <Checkbox
                                                checked={isPresent}
                                                onCheckedChange={(checked) =>
                                                    markMutation.mutate({ reg, present: !!checked })
                                                }
                                                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {reg.student_name || "Unknown"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {reg.usn} • {reg.college_email}
                                                </p>
                                            </div>
                                            {isPresent && (
                                                <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
                                                    Present
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
