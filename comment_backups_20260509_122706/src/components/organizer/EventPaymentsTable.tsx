import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Download } from "lucide-react";
import { format } from "date-fns";

export function EventPaymentsTable() {
    const { user } = useAuth();
    
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [eventFilter, setEventFilter] = useState("all");

    const { data: payments = [], isLoading } = useQuery({
        queryKey: ["organizer_payments", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("event_payments")
                .select("*, events(id, title)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
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

    const exportToCSV = () => {
        const rows = [["Participant Name", "USN", "Event Name", "Amount", "Status", "Reference", "Timestamp"]];
        filteredPayments.forEach(p => {
            rows.push([
                p.participant_name || "N/A",
                p.participant_usn || "N/A",
                (p.events as any)?.title || "Unknown Event",
                p.amount.toString(),
                p.payment_status || "N/A",
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

            <div className="bg-card border-2 border-border/50 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground w-[200px]">Participant</TableHead>
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground">USN</TableHead>
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground max-w-[200px]">Event Name</TableHead>
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground">Amount</TableHead>
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground">Status</TableHead>
                                <TableHead className="font-[900] text-sm uppercase tracking-widest text-muted-foreground text-right w-[150px]">Timestamp</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center font-[900] text-sm text-muted-foreground uppercase tracking-widest">No payments found</TableCell>
                                </TableRow>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <TableRow key={payment.id} className="border-border/50 hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-[900] text-sm uppercase tracking-tight">{payment.participant_name}</TableCell>
                                        <TableCell className="font-[900] text-sm uppercase tracking-widest text-muted-foreground">{payment.participant_usn}</TableCell>
                                        <TableCell className="font-[900] text-sm uppercase tracking-tight truncate max-w-[200px]">{(payment.events as any)?.title}</TableCell>
                                        <TableCell className="font-[900] text-base uppercase tracking-tighter text-emerald-500">₹{payment.amount}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex px-3 py-1 rounded-full text-xs font-[900] uppercase tracking-widest ${
                                                payment.payment_status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                payment.payment_status === 'failed' ? 'bg-destructive/10 text-destructive' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {payment.payment_status}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-[900] text-sm uppercase tracking-widest text-muted-foreground text-right">
                                            {payment.created_at ? format(new Date(payment.created_at), "MMM d, h:mm a") : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
