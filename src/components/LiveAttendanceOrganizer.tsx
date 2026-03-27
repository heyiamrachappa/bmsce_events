import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog";
import { 
    PlayCircle, 
    StopCircle, 
    RefreshCw, 
    Maximize2, 
    Minimize2, 
    Clock,
    QrCode
} from "lucide-react";
import { toast } from "sonner";
import { format, addMinutes } from "date-fns";

interface LiveAttendanceOrganizerProps {
    event: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function LiveAttendanceOrganizer({ event, open, onOpenChange }: LiveAttendanceOrganizerProps) {
    const queryClient = useQueryClient();
    const [isFullscreen, setIsFullscreen] = useState(false);


    const sessionMutation = useMutation({
        mutationFn: async ({ active, regenerate = false }: { active: boolean; regenerate?: boolean }) => {
            const token = regenerate || active ? Math.random().toString(36).substring(2, 10).toUpperCase() : null;
            const expires = null; // No expiry as requested

            const updateData: any = {
                attendance_session_active: active,
            };

            if (active || regenerate) {
                updateData.attendance_token = token;
                updateData.attendance_token_expires_at = expires;
            }

            const { error } = await supabase
                .from("events")
                .update(updateData)
                .eq("id", event.id);

            if (error) throw error;
            return updateData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my_posted_events"] });
            queryClient.invalidateQueries({ queryKey: ["admin_events"] });
            toast.success("Attendance session updated!");
        },
        onError: (err: any) => toast.error(err.message || "Failed to update session"),
    });

    const qrSize = 400;
    const qrUrl = event?.attendance_token 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(window.location.origin + "/attendance?event_id=" + event.id + "&token=" + event.attendance_token)}`
        : null;

    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${isFullscreen ? "max-w-none w-screen h-screen m-0 rounded-none border-0" : "max-w-2xl"}`}>
                <DialogHeader className={isFullscreen ? "hidden" : ""}>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" /> Live Attendance: {event.title}
                    </DialogTitle>
                </DialogHeader>

                <div className={`flex flex-col items-center justify-center space-y-6 ${isFullscreen ? "h-full" : ""}`}>
                    {event.attendance_session_active ? (
                        <div className="w-full flex flex-col items-center space-y-6">
                            {/* QR Code Card */}
                            <Card className={`relative overflow-hidden border-2 ${isFullscreen ? "w-fit" : "w-full max-w-sm"} shadow-2xl`}>
                                <CardContent className="p-8 flex flex-col items-center bg-white">
                                    {qrUrl ? (
                                        <img 
                                            src={qrUrl} 
                                            alt="Attendance QR Code" 
                                            className={`${isFullscreen ? "w-[60vh] h-[60vh]" : "w-64 h-64"} object-contain transition-all duration-500`} 
                                        />
                                    ) : (
                                        <div className="w-64 h-64 flex items-center justify-center bg-muted">
                                            <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="mt-4 text-center">
                                        <p className="text-black font-black text-xl tracking-widest">{event.attendance_token}</p>
                                        <p className="text-muted-foreground text-xs uppercase tracking-tighter mt-1">Scan to mark attendance</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Status and Controls */}
                            <div className={`flex flex-col items-center space-y-4 ${isFullscreen ? "mt-8" : ""}`}>
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-emerald-500 text-white animate-pulse px-3 py-1">
                                        Live Session Active
                                    </Badge>
                                </div>

                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => sessionMutation.mutate({ active: true, regenerate: true })}
                                        disabled={sessionMutation.isPending}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerate QR
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                                        onClick={() => sessionMutation.mutate({ active: false })}
                                        disabled={sessionMutation.isPending}
                                    >
                                        <StopCircle className="h-4 w-4 mr-2" /> Stop Session
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                    >
                                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 py-10">
                            <div className="p-6 rounded-full bg-muted w-24 h-24 mx-auto flex items-center justify-center">
                                <QrCode className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Start Live Attendance</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Generate a dynamic QR code for students to scan.
                                </p>
                            </div>
                            <Button 
                                size="lg" 
                                className="gradient-primary text-white border-0 px-10 shadow-lg shadow-primary/20"
                                onClick={() => sessionMutation.mutate({ active: true })}
                                disabled={sessionMutation.isPending}
                            >
                                <PlayCircle className="h-5 w-5 mr-2" /> Start Attendance Session
                            </Button>
                        </div>
                    )}
                </div>

                {isFullscreen && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 text-white hover:bg-white/10"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <Minimize2 className="h-6 w-6" />
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
