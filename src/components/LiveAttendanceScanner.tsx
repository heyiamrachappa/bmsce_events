import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog";
import { 
    Scan, 
    CheckCircle2, 
    XCircle, 
    Loader2,
    ShieldCheck,
    Award
} from "lucide-react";
import { toast } from "sonner";

interface LiveAttendanceScannerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function LiveAttendanceScanner({ open, onOpenChange }: LiveAttendanceScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; points?: number } | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [scannerInitialized, setScannerInitialized] = useState(false);

    useEffect(() => {
        if (!open) {
            setResult(null);
            setScanning(false);
            setScannerInitialized(false);
            return;
        }

        let scanner: Html5QrcodeScanner | null = null;

        const initScanner = async () => {
            // Wait for Dialog to animate and ID to be available
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const element = document.getElementById("qr-reader");
            if (open && element && !result && !verifying && !scannerInitialized) {
                try {
                    scanner = new Html5QrcodeScanner(
                        "qr-reader",
                        { 
                            fps: 10, 
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0,
                            rememberLastUsedCamera: true
                        },
                        /* verbose= */ false
                    );

                    scanner.render(onScanSuccess, (error) => {
                        // Ignore frequent scan failures during search
                    });
                    setScanning(true);
                    setScannerInitialized(true);
                } catch (err) {
                    console.error("Scanner init error:", err);
                    toast.error("Failed to start camera. Please check permissions.");
                }
            }
        };

        if (open) {
            initScanner();
        }

        return () => {
            if (scanner && (scanner as any).getState?.() !== 1) { // 1 is UNINITIALIZED
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [open, result, verifying]);

    async function onScanSuccess(decodedText: string) {
        setScanning(false);
        setVerifying(true);
        
        try {
            // URL format: https://domain.com/attendance?event_id=UUID&token=TOKEN
            const url = new URL(decodedText);
            const eventId = url.searchParams.get("event_id");
            const token = url.searchParams.get("token");

            if (!eventId || !token) {
                throw new Error("Invalid QR code format.");
            }

            const { data, error } = await supabase.rpc("verify_live_attendance" as any, {
                p_event_id: eventId,
                p_token: token
            });

            if (error) throw error;
            
            const response = data as any;
            setResult({
                success: response.success,
                message: response.message,
                points: response.points_awarded
            });

            if (response.success) {
                toast.success("Attendance marked successfully! 🎯");
            } else {
                toast.error(response.message);
            }

        } catch (err: any) {
            console.error(err);
            setResult({
                success: false,
                message: err.message || "Failed to parse QR code."
            });
            toast.error("Invalid QR code scanned.");
        } finally {
            setVerifying(false);
        }
    }

    function onScanFailure(error: any) {
        // Quietly ignore scan failures during search
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scan className="h-5 w-5" /> Mark Live Attendance
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    {verifying ? (
                        <div className="text-center space-y-4 py-10">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground animate-pulse">Verifying token...</p>
                        </div>
                    ) : result ? (
                        <div className="text-center space-y-6 py-6 animate-in fade-in zoom-in duration-300">
                            {result.success ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-full bg-emerald-500/20 w-20 h-20 mx-auto flex items-center justify-center border-2 border-emerald-500/30">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold">Success!</h3>
                                        <p className="text-muted-foreground">{result.message}</p>
                                    </div>
                                    {result.points && (
                                        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center justify-center gap-2">
                                            <Award className="h-5 w-5 text-emerald-500" />
                                            <span className="font-black text-emerald-600">+{result.points} Activity Points</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-full bg-red-500/20 w-20 h-20 mx-auto flex items-center justify-center border-2 border-red-500/30">
                                        <XCircle className="h-10 w-10 text-red-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold">Verification Failed</h3>
                                        <p className="text-muted-foreground">{result.message}</p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="w-full mt-4"
                                        onClick={() => setResult(null)}
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest justify-center">
                                <ShieldCheck className="h-3 w-3" /> Secure Verification
                            </div>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            <style dangerouslySetInnerHTML={{ __html: `
                                #qr-reader video {
                                    transform: scaleX(-1) !important;
                                }
                            `}} />
                            <div id="qr-reader" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 bg-black/5" />
                            <p className="text-center text-xs text-muted-foreground italic">
                                Position the QR code within the frame to scan
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
