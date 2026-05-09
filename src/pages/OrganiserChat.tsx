import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, ShieldCheck, Loader2, MessageSquare, Trash2, Pencil, MoreVertical, X, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function OrganiserChat() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState<{ id: string, text: string } | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    
    const { data: isAuthorised, isLoading: authLoading, error: authError } = useQuery({
        queryKey: ["is_organiser", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("is_organiser", { _user_id: user!.id });
            if (error) {
                console.error("RPC Error:", error);
                throw error;
            }
            return data as boolean;
        },
        enabled: !!user,
        retry: false,
    });

    
    const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery({
        queryKey: ["organiser_chat"],
        queryFn: async () => {
            
            const { data: messages, error: msgError } = await supabase
                .from("organiser_chat_messages")
                .select("*")
                .order("created_at", { ascending: true })
                .limit(100);
            
            if (msgError) {
                console.error("Chat Fetch Error:", msgError);
                throw msgError;
            }
            if (!messages || messages.length === 0) return [];

            
            const userIds = [...new Set(messages.map(m => m.sender_id))];
            const { data: profiles, error: profError } = await supabase
                .from("profiles")
                .select("user_id, full_name, avatar_url, clubs(name)")
                .in("user_id", userIds);
            
            if (profError) {
                console.error("Profile Fetch Error:", profError);
                
                return messages;
            }

            
            const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
            return messages.map(m => ({
                ...m,
                profiles: profileMap[m.sender_id]
            }));
        },
        enabled: !!isAuthorised,
    });

    
    useEffect(() => {
        if (!isAuthorised || !user) return;

        const channel = supabase.channel("organiser_chat", {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "organiser_chat_messages" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["organiser_chat"] });
                }
            )
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const typing = Object.values(state)
                    .flat()
                    .filter((p: any) => p.isTyping && p.user_id !== user.id)
                    .map((p: any) => p.user_name || "Someone");
                setTypingUsers(typing);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        user_id: user.id,
                        user_name: user.user_metadata?.full_name || "Organiser",
                        isTyping: false,
                    });
                }
            });
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAuthorised, queryClient, user]);

    
    useEffect(() => {
        if (!isAuthorised || !user) return;
        const channel = supabase.channel("organiser_chat");
        
        channel.track({
            user_id: user.id,
            user_name: user.user_metadata?.full_name || "Organiser",
            isTyping: isTyping,
        });
    }, [isTyping, user, isAuthorised]);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
        }
    };

    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const sendMessage = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase
                .from("organiser_chat_messages")
                .insert({ sender_id: user!.id, message: content });
            if (error) throw error;
        },
        onSuccess: () => {
            setMessage("");
            queryClient.invalidateQueries({ queryKey: ["organiser_chat"] });
        },
        onError: (err: any) => toast.error("Failed to send", { description: err.message }),
    });

    const editMessage = useMutation({
        mutationFn: async ({ id, text }: { id: string, text: string }) => {
            const { error } = await supabase
                .from("organiser_chat_messages")
                .update({ message: text, is_edited: true, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            setEditingMessage(null);
            queryClient.invalidateQueries({ queryKey: ["organiser_chat"] });
        },
        onError: (err: any) => toast.error("Failed to edit", { description: err.message }),
    });

    const deleteForMe = useMutation({
        mutationFn: async (messageId: string) => {
            const { data: currentMsg } = await supabase
                .from("organiser_chat_messages")
                .select("deleted_for_users")
                .eq("id", messageId)
                .single();
            
            const deletedFor = currentMsg?.deleted_for_users || [];
            if (!deletedFor.includes(user!.id)) {
                const { error } = await supabase
                    .from("organiser_chat_messages")
                    .update({ deleted_for_users: [...deletedFor, user!.id] })
                    .eq("id", messageId);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organiser_chat"] });
            toast.success("Hidden for you");
        },
        onError: (err: any) => toast.error("Failed to hide", { description: err.message }),
    });

    const deleteMessage = useMutation({
        mutationFn: async (messageId: string) => {
            const { error } = await supabase
                .from("organiser_chat_messages")
                .delete()
                .eq("id", messageId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organiser_chat"] });
            toast.success("Message unsent");
        },
        onError: (err: any) => toast.error("Failed to unsend", { description: err.message }),
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || sendMessage.isPending) return;
        sendMessage.mutate(message.trim());
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthorised || authError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-6">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
                    <ShieldCheck className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">
                        {authError ? "System Synchronisation Error" : "Access Denied"}
                    </h2>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                        {authError 
                            ? "The authorisation backend is not responding correctly. Please ensure all migrations are applied." 
                            : "This channel is reserved for verified club organisers."}
                    </p>
                    {authError && (
                        <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 mt-4 max-w-md mx-auto">
                            <p className="text-[10px] font-mono text-red-400 break-all">{(authError as any).message}</p>
                        </div>
                    )}
                </div>
                <Button onClick={() => window.history.back()} variant="outline" className="rounded-full px-8 font-black uppercase text-xs tracking-widest">Return</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />
            <div className="flex-1 container max-w-4xl py-24 px-4 sm:px-6 lg:px-8 flex flex-col gap-6 sm:gap-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-border pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Organisers Lounge</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none">COMMAND <span className="text-muted-foreground/60">CHAT</span></h1>
                    </div>
                    <div className="flex items-center gap-3 bg-card border-2 border-border px-6 py-3 rounded-full">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Channel</span>
                    </div>
                </div>

                <div className="flex-1 bg-card border-2 border-border rounded-[32px] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative">
                    <ScrollArea className="flex-1">
                        <div className="p-6 sm:p-10 space-y-8 flex flex-col">
                            <div className="text-center py-4">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Secure Link Established • Messages are Private</p>
                            </div>
                            
                            <div className="space-y-8">
                                {messagesLoading && (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Syncing Messages...</p>
                                    </div>
                                )}

                                {messagesError && (
                                    <div className="bg-red-500/5 border-2 border-red-500/10 p-8 rounded-[32px] text-center space-y-4">
                                        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                                            <ShieldCheck className="h-6 w-6 text-red-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-red-500 uppercase tracking-widest">Protocol Failure</p>
                                            <p className="text-[10px] font-mono text-red-400/60 break-all">{(messagesError as any).message}</p>
                                        </div>
                                    </div>
                                )}

                                {!messagesLoading && !messagesError && messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-40">
                                        <div className="h-20 w-20 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                                            <MessageSquare className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="text-sm font-black uppercase tracking-widest">Silence on the Wire</p>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Be the first to transmit a command</p>
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg: any) => {
                                    const isMe = msg.sender_id === user?.id;
                                    const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-2`}>
                                            <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
                                                    {profile?.avatar_url ? (
                                                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                    {profile?.full_name || 'Anonymous Organiser'}
                                                    {profile?.clubs?.name && <span className="ml-1 text-primary/80">({profile.clubs.name})</span>}
                                                </span>
                                                <span className="text-[8px] font-bold text-muted-foreground/30">{format(new Date(msg.created_at), 'HH:mm')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 group/msg">
                                                <div className={`max-w-[85%] sm:max-w-[70%] px-5 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl text-sm font-bold leading-relaxed relative ${
                                                    isMe ? 'bg-primary text-black rounded-tr-none shadow-lg shadow-primary/10' : 'bg-muted/40 border-2 border-border/80 rounded-tl-none'
                                                }`}>
                                                    {msg.message}
                                                    {msg.is_edited && (
                                                        <span className={`text-[8px] absolute bottom-1 ${isMe ? 'right-4 opacity-40' : 'left-4 opacity-40'} font-bold uppercase tracking-tighter`}>
                                                            (Edited)
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-all">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-2 text-muted-foreground/30 hover:text-foreground transition-all active:scale-90">
                                                                <MoreVertical className="h-3.5 w-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-card border-2 border-border rounded-2xl p-2 shadow-2xl">
                                                            {isMe && (
                                                                <DropdownMenuItem 
                                                                    onClick={() => setEditingMessage({ id: msg.id, text: msg.message })}
                                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer text-[10px] font-black uppercase tracking-widest"
                                                                >
                                                                    <Pencil className="h-3 w-3" /> Edit Message
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem 
                                                                onClick={() => deleteForMe.mutate(msg.id)}
                                                                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-primary/10 hover:text-primary cursor-pointer text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                <Trash2 className="h-3 w-3" /> Delete for me
                                                            </DropdownMenuItem>
                                                            {isMe && (
                                                                <DropdownMenuItem 
                                                                    onClick={() => deleteMessage.mutate(msg.id)}
                                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-500/10 text-red-500 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                                                                >
                                                                    <Trash2 className="h-3 w-3" /> Delete for everyone
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="px-4 py-3 sm:px-6 bg-muted/30 border-t-2 border-border flex flex-col gap-2">
                        {typingUsers.length > 0 && (
                            <div className="flex items-center gap-2 animate-pulse">
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 italic">
                                    {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : 'Multiple people are typing...'}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSend} className="relative flex items-center group">
                            {editingMessage ? (
                                <div className="flex-1 flex items-center gap-2 bg-background border-2 border-primary/40 rounded-full h-14 sm:h-16 px-6 sm:px-8">
                                    <Pencil className="h-4 w-4 text-primary shrink-0" />
                                    <input 
                                        value={editingMessage.text}
                                        onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                        className="flex-1 bg-transparent border-none outline-none font-bold text-sm uppercase tracking-widest"
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            type="button"
                                            onClick={() => setEditingMessage(null)}
                                            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-all"
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => editMessage.mutate(editingMessage)}
                                            className="h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <input 
                                        value={message}
                                        onChange={handleTyping}
                                        placeholder="SEND A COMMAND..."
                                        className="w-full h-14 sm:h-16 rounded-full bg-background border-2 border-border pl-6 sm:pl-8 pr-16 sm:pr-20 font-black text-sm uppercase tracking-widest focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground/40 shadow-inner"
                                    />
                                    <Button 
                                        type="submit" 
                                        disabled={!message.trim() || sendMessage.isPending}
                                        className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0 bg-primary text-black hover:bg-primary/80 transition-all active:scale-95 shadow-xl"
                                    >
                                        {sendMessage.isPending ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    </Button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
