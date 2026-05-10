import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, QrCode, Upload, Unlink, CheckCircle2, Edit3, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PaymentAccountSettings({ clubId }: { clubId: string | null }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [upiId, setUpiId] = useState("");
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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

    useEffect(() => {
        if (account && account.account_status === 'active') {
            setUpiId(account.upi_id || "");
            setQrPreview(account.qr_code_url || null);
        }
    }, [account]);

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
            toast.success("Payment Details Updated", { description: "Your QR/UPI configuration is now live." });
            setQrFile(null);
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ["payment_account"] });
        },
        onError: (err: any) => toast.error("Update Failed", { description: err.message }),
    });

    const deactivateAccountMutation = useMutation({
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
            toast.success("Payments Deactivated", { description: "Your payment details are no longer visible to students." });
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
            <div className="space-y-2 px-2 flex justify-between items-end">
                <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">PAYMENT CONFIGURATION</label>
                    <p className="text-xs sm:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed">
                        MANAGE YOUR UPI QR CODE & MERCHANT DETAILS
                    </p>
                </div>
                {isConnected && !isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="h-10 px-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                    >
                        <Edit3 className="h-3 w-3" /> Edit Details
                    </button>
                )}
            </div>
            
            <div className="bg-card/80 border-2 border-border/50 rounded-2xl sm:rounded-[40px] p-6 sm:p-10 space-y-10 overflow-hidden shadow-2xl relative group">
                {!isConnected || isEditing ? (
                    <div className="space-y-8 relative z-10">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-full bg-primary/10 text-primary">
                                    <QrCode className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    {isEditing ? "UPDATE QR DETAILS" : "CONFIGURE PAYMENTS"}
                                </h3>
                            </div>
                            {isEditing && (
                                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-muted transition-all">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-8 pt-4 border-t border-border/50">
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
                                    className="relative aspect-square sm:aspect-video rounded-[32px] border-2 border-dashed border-border/50 bg-background/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-all overflow-hidden shadow-inner"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    {qrPreview ? (
                                        <>
                                            <img src={qrPreview} className="absolute inset-0 w-full h-full object-contain p-8" alt="QR Preview" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-background/90 px-6 py-3 rounded-full border border-border shadow-2xl flex items-center gap-3">
                                                    <Upload className="h-4 w-4 text-primary" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">CLICK TO UPLOAD QR</p>
                                                <p className="text-[9px] font-medium text-muted-foreground/40 mt-2">Recommended for instant verification</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button 
                                onClick={() => linkAccountMutation.mutate({ upiId, qrFile: qrFile || undefined })}
                                disabled={linkAccountMutation.isPending || !upiId}
                                className="flex-1 h-18 bg-primary text-black rounded-full font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-4xl shadow-primary/20 disabled:opacity-50 disabled:scale-100 py-6"
                            >
                                {linkAccountMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (isEditing ? "SAVE UPDATED DETAILS" : "ACTIVATE SYSTEM")}
                            </button>
                            {isEditing && (
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="h-18 px-10 bg-muted text-muted-foreground rounded-full font-black text-xs uppercase tracking-widest hover:bg-border transition-all"
                                >
                                    CANCEL
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 space-y-10">
                        <div className="flex items-start sm:items-center gap-6">
                            <div className="p-5 rounded-full bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black uppercase tracking-tight">
                                    SYSTEM ACTIVE
                                </h3>
                                <p className="text-[10px] sm:text-sm uppercase font-black tracking-widest text-muted-foreground mt-1 break-all">
                                    Accepting payments via {account.upi_id}
                                </p>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-12">
                            {account.qr_code_url && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active QR Code</p>
                                    <div className="aspect-square w-56 bg-white p-4 rounded-[32px] shadow-2xl border-4 border-border/50">
                                        <img src={account.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-8 py-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MERCHANT ID</p>
                                    <p className="text-2xl font-black uppercase tracking-tight text-foreground break-all">{account.upi_id}</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">VERIFICATION STATUS</p>
                                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        Intelligent OCR Enabled
                                    </div>
                                </div>
                                <div className="pt-8 flex flex-wrap gap-4">
                                    <button 
                                        onClick={() => {
                                            if(window.confirm("Deactivate payments? This will hide your details from students.")) {
                                                deactivateAccountMutation.mutate();
                                            }
                                        }}
                                        disabled={deactivateAccountMutation.isPending}
                                        className="h-12 px-8 bg-red-500/5 text-red-500 border border-red-500/10 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {deactivateAccountMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                                        DEACTIVATE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
