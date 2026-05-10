import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Download, ShieldCheck, AlertTriangle, Eye, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function EventPaymentsTable() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [eventFilter, setEventFilter] = useState("all");
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    const { data: payments = [], isLoading } = useQuery({
        queryKey: ["organizer_payments", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_payments")
                .select("*, events(id, title, registration_fee)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const updatePaymentMutation = useMutation({
        mutationFn: async ({ paymentId, userId, eventId, approve }: { paymentId: string; userId: string; eventId: string; approve: boolean }) => {
            // 1. Update Payment Record
            const { error: paymentError } = await supabase
                .from("event_payments")
                .update({
                    payment_status: approve ? 'completed' : 'failed',
                    verification_status: approve ? 'auto_approved' : 'flagged_fraud'
                })
                .eq('id', paymentId);

            if (paymentError) throw paymentError;

            // 2. Update Registration Record
            const { error: regError } = await supabase
                .from("event_registrations")
                .update({
                    payment_status: approve ? 'paid' : 'failed',
                    registration_status: approve ? 'confirmed' : 'pending'
                })
                .eq('event_id', eventId)
                .eq('user_id', userId);

            if (regError) throw regError;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ["organizer_payments"] });
            toast.success(vars.approve ? "Payment Approved!" : "Payment Rejected.");
            setSelectedPayment(null);
        },
        onError: (err: any) => {
            toast.error(err.message || "Action failed.");
        }
    });

    const uniqueEvents = Array.from(new Set(payments.map(p => p.event_id))).map(id => {
        const event = payments.find(p => p.event_id === id)?.events as any;
        return { id, title: event?.title || "Unknown Event" };
    });

    const filteredPayments = payments.filter(payment => {
        const matchesSearch = (payment.participant_name || "").toLowerCase().includes(search.toLowerCase()) || 
                               (payment.participant_usn || "").toLowerCase().includes(search.toLowerCase()) ||
                               (payment.payment_reference || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter;
        const matchesEvent = eventFilter === "all" || payment.event_id === eventFilter;
        return matchesSearch && matchesStatus && matchesEvent;
    });

    const getVerificationIcon = (status: string) => {
        switch (status) {
            case 'auto_approved': return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
            case 'manual_review': return <Search className="h-4 w-4 text-amber-500" />;
            case 'flagged_fraud': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
        }
    };

    const exportToCSV = () => {
        const rows = [["Participant Name", "USN", "Event Name", "Amount", "Status", "Verification", "Confidence", "Reference", "Timestamp"]];
        filteredPayments.forEach(p => {
            rows.push([
                p.participant_name || "N/A",
                p.participant_usn || "N/A",
                (p.events as any)?.title || "Unknown Event",
                p.amount.toString(),
                p.payment_status || "N/A",
                p.verification_status || "N/A",
                `${Math.round((p.match_confidence || 0) * 100)}%`,
                p.payment_reference || "N/A",
                p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd HH:mm:ss") : "N/A"
            ]);
        });
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Payments_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, USN, or Reference ID..." 
                        className="pl-12 h-12 rounded-full border-2 bg-card text-sm font-[900] uppercase tracking-widest"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-full border-2 bg-card text-sm font-[900] uppercase tracking-widest">
                        <SelectValue placeholder="FILTER BY EVENT" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ALL EVENTS</SelectItem>
                        {uniqueEvents.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-full border-2 bg-card text-sm font-[900] uppercase tracking-widest">
                        <SelectValue placeholder="FILTER BY STATUS" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ALL STATUSES</SelectItem>
                        <SelectItem value="completed">COMPLETED</SelectItem>
                        <SelectItem value="pending">PENDING</SelectItem>
                        <SelectItem value="failed">FAILED</SelectItem>
                    </SelectContent>
                </Select>

                <button 
                    onClick={exportToCSV}
                    className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-[900] text-sm uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all w-full sm:w-auto justify-center shrink-0"
                >
                    <Download className="h-4 w-4" /> EXPORT
                </button>
            </div>

            <div className="bg-card border-2 border-border/50 rounded-[32px] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="font-[900] text-xs uppercase tracking-[0.2em] text-muted-foreground w-[200px] py-6 pl-8">Participant</TableHead>
                                <TableHead className="font-[900] text-xs uppercase tracking-[0.2em] text-muted-foreground">Verification</TableHead>
                                <TableHead className="font-[900] text-xs uppercase tracking-[0.2em] text-muted-foreground max-w-[200px]">Event</TableHead>
                                <TableHead className="font-[900] text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</TableHead>
                                <TableHead className="font-[900] text-xs uppercase tracking-[0.2em] text-muted-foreground text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center font-[900] text-sm text-muted-foreground uppercase tracking-widest">No payments found</TableCell>
                                </TableRow>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <TableRow key={payment.id} className="border-border/50 hover:bg-muted/50 transition-colors">
                                        <TableCell className="py-6 pl-8">
                                            <div className="space-y-1">
                                                <p className="font-[900] text-sm uppercase tracking-tight">{payment.participant_name}</p>
                                                <p className="font-[900] text-[10px] uppercase tracking-widest text-muted-foreground/60">{payment.participant_usn}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                {getVerificationIcon(payment.verification_status)}
                                                <div className="space-y-1">
                                                    <p className={`text-[10px] font-[900] uppercase tracking-widest 
                                                        ${payment.verification_status === 'auto_approved' ? 'text-emerald-500' : 
                                                          payment.verification_status === 'manual_review' ? 'text-amber-500' : 'text-red-500'}`}>
                                                        {payment.verification_status.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground/40">
                                                        Match: {Math.round((payment.match_confidence || 0) * 100)}%
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-[900] text-sm uppercase tracking-tight truncate max-w-[200px]">{(payment.events as any)?.title}</TableCell>
                                        <TableCell className="font-[900] text-base uppercase tracking-tighter text-emerald-500">₹{payment.amount}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <button 
                                                onClick={() => setSelectedPayment(payment)}
                                                className="h-10 px-6 rounded-full border-2 border-border flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-all ml-auto font-[900] text-xs uppercase tracking-widest"
                                            >
                                                <Eye className="h-3 w-3" /> Review
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Review Modal */}
            <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
                <DialogContent className="sm:max-w-4xl bg-background border-2 border-border rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <div className="grid lg:grid-cols-2 h-[80vh]">
                        {/* Screenshot Side */}
                        <div className="bg-muted/30 p-8 flex flex-col gap-6 items-center justify-center border-r-2 border-border/50">
                            <p className="text-[10px] font-[900] uppercase tracking-widest text-muted-foreground/60">PAYMENT SCREENSHOT</p>
                            <div className="relative w-full h-full rounded-[24px] overflow-hidden border-2 border-border shadow-2xl bg-black">
                                {selectedPayment?.screenshot_url ? (
                                    <img src={selectedPayment.screenshot_url} alt="Proof" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                        <AlertTriangle className="h-12 w-12" />
                                        <p className="font-[900] uppercase text-xs tracking-widest">No Image Available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details Side */}
                        <div className="p-12 flex flex-col justify-between space-y-12 bg-card">
                            <div className="space-y-10">
                                <DialogHeader className="space-y-4">
                                    <div className="text-sm font-[900] uppercase tracking-widest text-primary">Intelligent Verification</div>
                                    <DialogTitle className="text-5xl font-[900] uppercase tracking-tighter leading-none">Review<br /><span className="text-muted-foreground/60">Payment</span></DialogTitle>
                                </DialogHeader>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Registered Participant</p>
                                            <p className="text-lg font-[900] uppercase tracking-tight">{selectedPayment?.participant_name}</p>
                                            <p className="text-xs font-[900] uppercase tracking-widest text-primary">{selectedPayment?.participant_usn}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Extracted from Image</p>
                                            <p className="text-lg font-[900] uppercase tracking-tight text-amber-500">{selectedPayment?.extracted_payer_name || "NOT DETECTED"}</p>
                                            <p className="text-xs font-[900] uppercase tracking-widest text-muted-foreground/60">Match Score: {Math.round((selectedPayment?.match_confidence || 0) * 100)}%</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Event Registration Fee</p>
                                            <p className="text-lg font-[900] uppercase tracking-tight">₹{selectedPayment?.events?.registration_fee}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest">Amount in Screenshot</p>
                                            <p className={`text-lg font-[900] uppercase tracking-tight ${selectedPayment?.extracted_amount === selectedPayment?.events?.registration_fee ? 'text-emerald-500' : 'text-red-500'}`}>
                                                ₹{selectedPayment?.extracted_amount || "NOT DETECTED"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-muted/50 rounded-3xl border border-border/50">
                                    <p className="text-[10px] font-[900] text-muted-foreground/40 uppercase tracking-widest mb-2">Extracted Transaction ID (UTR)</p>
                                    <p className="text-sm font-mono font-bold tracking-widest break-all">{selectedPayment?.extracted_utr || "NOT DETECTED"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => updatePaymentMutation.mutate({ 
                                        paymentId: selectedPayment.id, 
                                        userId: selectedPayment.participant_user_id,
                                        eventId: selectedPayment.event_id,
                                        approve: false 
                                    })}
                                    disabled={updatePaymentMutation.isPending}
                                    className="h-20 rounded-full border-2 border-red-500 text-red-500 font-[900] uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3"
                                >
                                    <XCircle className="h-4 w-4" /> REJECT
                                </button>
                                <button 
                                    onClick={() => updatePaymentMutation.mutate({ 
                                        paymentId: selectedPayment.id, 
                                        userId: selectedPayment.participant_user_id,
                                        eventId: selectedPayment.event_id,
                                        approve: true 
                                    })}
                                    disabled={updatePaymentMutation.isPending}
                                    className="h-20 rounded-full bg-emerald-500 text-background font-[900] uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-4xl shadow-emerald-500/20"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> APPROVE
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
