import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { IndianRupee, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Upload, Loader2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractPaymentDetails, type ExtractedPaymentData } from "@/lib/ocr";
import { fuzzyMatchName, verifyTeamPayment } from "@/lib/utils";

export default function Payment() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [extractedData, setExtractedData] = useState<ExtractedPaymentData | null>(null);
    const [verificationResult, setVerificationResult] = useState<{ score: number; status: string; matchedName?: string } | null>(null);
    const [completed, setCompleted] = useState(false);

    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ["event", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*, clubs(name), colleges(name)")
                .eq("id", id!)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const { data: registration } = useQuery({
        queryKey: ["registration_for_payment", id, user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_registrations")
                .select("*")
                .eq("event_id", id!)
                .eq("user_id", user!.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!id && !!user,
    });

    const { data: organizerAccount } = useQuery({
        queryKey: ["organizer_account", event?.created_by],
        queryFn: async () => {
            if (!event?.created_by) return null;
            const { data } = await supabase
                .from("organizer_payment_accounts")
                .select("*")
                .eq("organizer_user_id", event.created_by)
                .single();
            return data;
        },
        enabled: !!event?.created_by,
    });

    const fee = (event as any)?.registration_fee;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setExtractedData(null);
        setVerificationResult(null);
        
        // Auto-process
        processScreenshot(selectedFile);
    };

    const processScreenshot = async (selectedFile: File) => {
        setIsProcessing(true);
        setOcrProgress(0);
        
        try {
            // 1. OCR Extraction
            const data = await extractPaymentDetails(selectedFile, (p) => setOcrProgress(p));
            setExtractedData(data);

            // 2. Verification Logic
            let score = 0;
            let matchedName = "";

            if (event.event_type === 'group') {
                // Find team
                const { data: team } = await supabase
                    .from('registration_teams')
                    .select('id')
                    .eq('event_id', id!)
                    .eq('leader_user_id', user!.id)
                    .single();
                
                if (team && data.payerName) {
                    const result = await verifyTeamPayment(data.payerName, team.id);
                    score = result.score;
                    matchedName = result.matchedName || "";
                }
            } else {
                if (registration?.student_name && data.payerName) {
                    score = fuzzyMatchName(data.payerName, registration.student_name);
                    matchedName = registration.student_name;
                }
            }

            // 3. Status Determination
            let status = 'manual_review';
            
            if (data.utr) {
                const { data: existingPayment } = await supabase
                    .from('event_payments')
                    .select('id')
                    .eq('extracted_utr', data.utr)
                    .maybeSingle();
                
                if (existingPayment) {
                    status = 'flagged_fraud';
                }
            }

            if (status !== 'flagged_fraud') {
                if (score > 0.85) {
                    if (data.amount !== undefined && Math.abs(data.amount - fee) > 1) {
                        status = 'manual_review';
                    } else {
                        status = 'auto_approved';
                    }
                } else if (score < 0.4) {
                    status = 'flagged_fraud';
                }
            }

            setVerificationResult({ score, status, matchedName });
            toast.success("Screenshot analyzed successfully!");
        } catch (error) {
            console.error("OCR Error:", error);
            toast.error("Failed to read screenshot. Please try again or upload a clearer image.");
        } finally {
            setIsProcessing(false);
        }
    };

    const completePaymentMutation = useMutation({
        mutationFn: async () => {
            if (!file || !verificationResult) throw new Error("Please upload and verify a screenshot first.");
            
            setIsProcessing(true);

            // 1. Upload Screenshot to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}_${id}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('payment-screenshots')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const screenshotUrl = supabase.storage.from('payment-screenshots').getPublicUrl(fileName).data.publicUrl;

            // 2. Update Registration
            const { error: updateError } = await supabase
                .from("event_registrations")
                .update({
                    payment_status: verificationResult.status === 'auto_approved' ? 'paid' : 'pending',
                    registration_status: verificationResult.status === 'auto_approved' ? 'confirmed' : 'pending',
                    payment_reference: extractedData?.utr || `OCR-${Date.now()}`
                })
                .eq('event_id', id!)
                .eq('user_id', user!.id);

            if (updateError) throw updateError;

            // 3. Log Payment
            const { error: insertError } = await supabase.from("event_payments").insert({
                event_id: id!,
                organizer_user_id: event.created_by,
                participant_user_id: user!.id,
                amount: fee,
                payment_status: verificationResult.status === 'auto_approved' ? 'completed' : 'pending',
                payment_reference: extractedData?.utr || `OCR-${Date.now()}`,
                participant_name: registration?.student_name,
                participant_usn: registration?.usn,
                extracted_payer_name: extractedData?.payerName,
                extracted_utr: extractedData?.utr,
                extracted_amount: extractedData?.amount,
                match_confidence: verificationResult.score,
                verification_status: verificationResult.status,
                screenshot_url: screenshotUrl
            });

            if (insertError) throw insertError;

            setCompleted(true);
            setIsProcessing(false);
        },
        onSuccess: () => {
            if (verificationResult?.status === 'auto_approved') {
                toast.success("Payment Verified & Confirmed! 🎉");
            } else {
                toast.info("Payment submitted for review by organizers.");
            }
        },
        onError: (err: any) => {
            toast.error(err.message || "Submission failed.");
            setIsProcessing(false);
        }
    });

    if (eventLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-32 animate-pulse h-96 bg-foreground/5 rounded-[60px]" /></div>;
    if (!event) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6"><Navbar /><h2 className="text-4xl font-black">EVENT NOT FOUND</h2><button onClick={() => navigate("/events")} className="h-16 px-12 rounded-full border-2 border-foreground font-black uppercase tracking-tighter hover:bg-foreground hover:text-background transition-all">BACK TO EVENTS</button></div>;

    if (completed) {
        return (
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
                <Navbar />
                <div className="container max-w-2xl py-40 px-6 space-y-12 text-center">
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`mx-auto w-32 h-32 rounded-full ${verificationResult?.status === 'auto_approved' ? 'bg-emerald-500' : 'bg-amber-500'} flex items-center justify-center shadow-4xl`}
                    >
                        {verificationResult?.status === 'auto_approved' ? (
                            <CheckCircle2 className="h-16 w-16 text-background stroke-[3]" />
                        ) : (
                            <Search className="h-16 w-16 text-background stroke-[3]" />
                        )}
                    </motion.div>
                    <div className="space-y-6">
                        <h1 className="text-[8vw] sm:text-[6vw] font-[900] uppercase leading-[0.8] tracking-[-0.05em]">
                            {verificationResult?.status === 'auto_approved' ? (
                                <>Payment<br /><span className="text-emerald-500">Confirmed</span></>
                            ) : (
                                <>Under<br /><span className="text-amber-500">Review</span></>
                            )}
                        </h1>
                        <p className="text-base font-[900] uppercase tracking-widest text-muted-foreground/60 max-w-md mx-auto">
                            {verificationResult?.status === 'auto_approved' 
                                ? "Your spot is secured. See you there!" 
                                : "Your payment is being verified by the organizer. You will be notified once confirmed."}
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate("/dashboard")} 
                        className="w-full h-24 rounded-full bg-foreground text-background font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-4xl"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-32">
            <Navbar />
            
            <main className="container max-w-4xl py-32 px-6 space-y-20">
                <div className="space-y-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-4 text-muted-foreground hover:text-primary transition-all"
                    >
                        <ArrowLeft className="h-5 w-5 stroke-[4] group-hover:-translate-x-2 transition-transform" /> 
                        <span className="text-sm font-[900] uppercase tracking-widest">Back</span>
                    </button>
                    
                    <div className="space-y-4">
                        <span className="text-sm font-[900] text-primary uppercase tracking-[0.4em] block">Intelligent Verification</span>
                        <h1 className="text-[12vw] sm:text-[8vw] font-[900] leading-[0.8] tracking-[-0.05em] uppercase">
                            UPLOAD<br />
                            <span className="text-muted-foreground/60">SCREENSHOT</span>
                        </h1>
                    </div>
                </div>

                <div className="grid lg:grid-cols-1 gap-12">
                    <div className="p-12 bg-card border-2 border-border rounded-[40px] space-y-12 shadow-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-12 border-b-2 border-border/50">
                            <div className="space-y-2">
                                <p className="text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">EVENT</p>
                                <p className="text-2xl font-[900] uppercase tracking-tighter">{event.title}</p>
                            </div>
                            <div className="space-y-2 text-left sm:text-right">
                                <p className="text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">AMOUNT TO PAY</p>
                                <p className="text-4xl font-[900] tracking-tighter text-primary flex items-center sm:justify-end gap-2">
                                    <IndianRupee className="h-6 w-6 stroke-[3]" /> {fee}
                                </p>
                            </div>
                        </div>

                        {/* Organizer Payment Info */}
                        {organizerAccount && (
                            <div className="p-8 rounded-[32px] bg-primary/5 border-2 border-primary/20 space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Step 1: Make Payment</p>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Transfer to Organizer</h3>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-8 items-center">
                                    {organizerAccount.payment_method === 'manual_upi' && organizerAccount.qr_code_url && (
                                        <div className="bg-white p-3 rounded-2xl shrink-0 shadow-xl">
                                            <img src={organizerAccount.qr_code_url} alt="Payment QR" className="w-32 h-32 object-contain" />
                                        </div>
                                    )}
                                    <div className="space-y-4 flex-1">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                                                Merchant UPI ID
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-lg font-black uppercase tracking-tight text-foreground">
                                                    {organizerAccount.upi_id || "NOT PROVIDED"}
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        const id = organizerAccount.upi_id;
                                                        if (id) {
                                                            navigator.clipboard.writeText(id);
                                                            toast.success("Copied to clipboard!");
                                                        }
                                                    }}
                                                    className="p-2 rounded-full bg-muted hover:bg-primary hover:text-black transition-all"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                                            Once you complete the payment, take a screenshot of the confirmation and upload it below.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Step 2: Verify Screenshot</p>
                        </div>

                        {/* Upload Zone */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative aspect-video rounded-[40px] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-6 overflow-hidden
                                ${file ? 'border-primary/20 bg-primary/5' : 'border-border/50 bg-muted/5 hover:border-primary/40 hover:bg-primary/5'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-8 opacity-40" />
                                    <div className="relative z-10 flex flex-col items-center gap-4">
                                        <div className="h-20 w-20 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <p className="font-[900] uppercase tracking-widest text-sm">{file?.name}</p>
                                        <button className="text-xs font-[900] uppercase tracking-widest text-primary/60 hover:text-primary underline">Change File</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <Upload className="h-10 w-10" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-xl font-[900] uppercase tracking-tighter">Click to upload screenshot</p>
                                        <p className="text-sm font-[900] text-muted-foreground/60 uppercase tracking-widest">GPay, PhonePe, or Paytm</p>
                                    </div>
                                </>
                            )}

                            <AnimatePresence>
                                {isProcessing && (
                                    <motion.div 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center p-12 gap-8"
                                    >
                                        <div className="relative h-32 w-32">
                                            <svg className="h-full w-full -rotate-90">
                                                <circle 
                                                    cx="64" cy="64" r="60" 
                                                    className="fill-none stroke-border/20 stroke-[8]" 
                                                />
                                                <motion.circle 
                                                    cx="64" cy="64" r="60" 
                                                    className="fill-none stroke-primary stroke-[8]" 
                                                    strokeDasharray="377"
                                                    initial={{ strokeDashoffset: 377 }}
                                                    animate={{ strokeDashoffset: 377 - (377 * ocrProgress) }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <p className="text-2xl font-[900] tracking-tighter">{Math.round(ocrProgress * 100)}%</p>
                                            </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-lg font-[900] uppercase tracking-widest">Extracting Data...</p>
                                            <p className="text-xs font-[900] text-muted-foreground/60 uppercase tracking-[0.2em] animate-pulse">Running Intelligent Matching</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Extraction Summary */}
                        {extractedData && !isProcessing && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-8 rounded-[32px] bg-card border-2 border-border/50 space-y-8"
                            >
                                <div className="flex items-center justify-between border-b border-border/50 pb-6">
                                    <p className="text-sm font-[900] uppercase tracking-widest text-muted-foreground/60">Extracted Results</p>
                                    <div className={`px-4 py-1 rounded-full text-[10px] font-[900] uppercase tracking-widest 
                                        ${verificationResult?.status === 'auto_approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                          verificationResult?.status === 'flagged_fraud' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                          'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                        {verificationResult?.status.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Payer Name</p>
                                        <p className="text-base font-[900] uppercase tracking-tight">{extractedData.payerName || "Not Found"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Transaction ID (UTR)</p>
                                        <p className="text-base font-[900] uppercase tracking-tight">{extractedData.utr || "Not Found"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Amount Detected</p>
                                        <p className="text-base font-[900] uppercase tracking-tight">₹{extractedData.amount || "Not Found"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Match Confidence</p>
                                        <p className="text-base font-[900] uppercase tracking-tight">{Math.round((verificationResult?.score || 0) * 100)}%</p>
                                    </div>
                                </div>

                                {verificationResult?.status === 'manual_review' && (
                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4 items-center">
                                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                        <p className="text-[10px] font-[900] text-amber-500 uppercase tracking-widest leading-relaxed">
                                            Low confidence or name mismatch. An organizer will manually verify this payment.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        <div className="space-y-6 pt-4">
                            <button
                                onClick={() => completePaymentMutation.mutate()}
                                disabled={isProcessing || !file || completePaymentMutation.isPending}
                                className="w-full h-24 rounded-full bg-primary text-primary-foreground font-[900] uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-4xl shadow-primary/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4"
                            >
                                {completePaymentMutation.isPending ? (
                                    <><Loader2 className="h-6 w-6 animate-spin" /> SUBMITTING...</>
                                ) : (
                                    `SUBMIT VERIFICATION`
                                )}
                            </button>
                            <div className="flex items-center justify-center gap-4 text-sm font-[900] text-muted-foreground/40 uppercase tracking-widest">
                                <ShieldCheck className="h-4 w-4" />
                                <span>SECURE ACADEMIC GATEWAY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
