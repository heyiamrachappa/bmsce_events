import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, QrCode, Upload, Unlink, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function PaymentAccountSettings({ clubId }: { clubId: string | null }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [upiId, setUpiId] = useState("");
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);

    const { data: account, isLoading } = useQuery({
        queryKey: ["payment_account", user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("organizer_payment_accounts")
                .select("*")
                .eq("organizer_user_id", user!.id)
                .maybeSingle();
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
        mutationFn: async (vars: { upiId: string; qrFile?: File }) => {
            if (!clubId) throw new Error("No club associated");
            
            let qrUrl = account?.qr_code_url;

            if (vars.qrFile) {
                const fileExt = vars.qrFile.name.split('.').pop();
                const fileName = `qr_${user!.id}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('payment-screenshots')
                    .upload(fileName, vars.qrFile);
                if (uploadError) throw uploadError;
                qrUrl = supabase.storage.from('payment-screenshots').getPublicUrl(fileName).data.publicUrl;
            }

            const { data, error } = await supabase
                .from("organizer_payment_accounts")
                .upsert({
                    organizer_user_id: user!.id,
                    club_id: clubId,
                    upi_id: vars.upiId,
                    qr_code_url: qrUrl || null,
                    payment_method: 'manual_upi',
                    account_status: "active",
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Payment Details Updated", { description: "You can now accept payments via QR/UPI." });
            setUpiId("");
            setQrFile(null);
            setQrPreview(null);
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast.error("Setup Failed", { description: err.message }),
    });

    const unlinkAccountMutation = useMutation({
        mutationFn: async () => {
            if (activePaidEvents.length > 0) {
                throw new Error("Cannot deactivate while you have active paid events.");
            }
            const { error } = await supabase
                .from("organizer_payment_accounts")
                .update({ account_status: "disconnected", updated_at: new Date().toISOString() })
                .eq("organizer_user_id", user!.id);
            
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Payments Deactivated", { description: "Your QR/UPI details are now hidden." });
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast.error("Action Failed", { description: err.message }),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQrFile(file);
            setQrPreview(URL.createObjectURL(file));
        }
    };

    const isConnected = account && account.account_status === 'active';

    if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8 border-t-2 border-border w-full">
            <div className="space-y-2 px-2">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">PAYMENT CONFIGURATION</label>
                <p className="text-xs sm:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed">
                    SET UP YOUR UPI QR CODE FOR STUDENT PAYMENTS
                </p>
            </div>
            
            <div className="bg-card/80 border-2 border-border/50 rounded-2xl sm:rounded-[40px] p-6 sm:p-10 space-y-10 overflow-hidden shadow-2xl relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <QrCode className="w-32 h-32" />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start sm:items-center gap-6">
                        <div className={`p-5 rounded-full shrink-0 ${isConnected ? 'bg-primary text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-muted text-muted-foreground'}`}>
                            {isConnected ? <CheckCircle2 className="h-8 w-8" /> : <QrCode className="h-8 w-8" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-black uppercase tracking-tight">
                                {isConnected ? "UPI PAYMENTS ACTIVE" : "QR NOT CONFIGURED"}
                            </h3>
                            <p className="text-[10px] sm:text-sm uppercase font-black tracking-widest text-muted-foreground mt-1 break-all">
                                {isConnected ? `UPI ID: ${account.upi_id}` : "REQUIRED TO ACCEPT REGISTRATION FEES"}
                            </p>
                        </div>
                    </div>
                </div>

                {!isConnected ? (
                    <div className="space-y-8 pt-8 border-t border-border/50 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4">Merchant UPI ID</label>
                                <input 
                                    placeholder="ENTER UPI ID (e.g. club@upi)" 
                                    className="w-full h-16 bg-background border-2 border-border rounded-full px-8 font-black text-sm uppercase tracking-widest placeholder:text-muted-foreground/20 focus:border-primary transition-all outline-none"
                                    value={upiId} 
                                    onChange={(e) => setUpiId(e.target.value)} 
                                    required 
                                />
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4">Payment QR Image</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative aspect-square sm:aspect-video rounded-[32px] border-2 border-dashed border-border/50 bg-background/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-all overflow-hidden"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    {qrPreview ? (
                                        <>
                                            <img src={qrPreview} className="absolute inset-0 w-full h-full object-contain p-6 opacity-40" alt="QR Preview" />
                                            <div className="relative z-10 flex items-center gap-3 bg-background/90 px-6 py-3 rounded-full border border-border shadow-xl">
                                                <Upload className="h-4 w-4 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Replace QR Image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">CLICK TO UPLOAD QR</p>
                                                <p className="text-[9px] font-medium text-muted-foreground/40 mt-2">Supports JPG, PNG, WEBP</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => linkAccountMutation.mutate({ upiId, qrFile: qrFile || undefined })}
                            disabled={linkAccountMutation.isPending || !upiId}
                            className="w-full h-20 bg-primary text-black rounded-full font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-4xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                        >
                            {linkAccountMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "ACTIVATE PAYMENTS"}
                        </button>
                    </div>
                ) : (
                    <div className="pt-8 border-t border-border/50 flex flex-col gap-10 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                            {account.qr_code_url && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active QR Code</p>
                                    <div className="aspect-square w-48 bg-white p-4 rounded-3xl shadow-inner border-2 border-border/50">
                                        <img src={account.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MERCHANT UPI ID</p>
                                    <p className="text-xl font-black uppercase tracking-tight text-foreground break-all">{account.upi_id}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">STATUS</p>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Verified & Active
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={() => {
                                    if(window.confirm("Deactivate payments? Students won't be able to pay for your events.")) {
                                        unlinkAccountMutation.mutate();
                                    }
                                }}
                                disabled={unlinkAccountMutation.isPending}
                                className="h-14 px-10 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {unlinkAccountMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                                DEACTIVATE SYSTEM
                            </button>
                            <button 
                                onClick={() => isConnected && unlinkAccountMutation.mutate()} 
                                className="h-14 px-10 bg-card border border-border rounded-full font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                            >
                                UPDATE DETAILS
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
