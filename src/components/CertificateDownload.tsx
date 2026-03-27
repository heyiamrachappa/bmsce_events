import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Award, Lock } from "lucide-react";
import { toast } from "sonner";
import { BUILT_IN_TEMPLATES, drawCertificateText, type TemplateStyle } from "./CertificateDesigner";

interface CertificateDownloadProps {
    eventId: string;
    eventTitle: string;
    compact?: boolean;
}

function findBuiltInTemplate(url: string): TemplateStyle | null {
    return BUILT_IN_TEMPLATES.find((t) => url === t.preview || url?.endsWith(t.preview)) || null;
}

export default function CertificateDownload({ eventId, eventTitle, compact = false }: CertificateDownloadProps) {
    const { user } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [generating, setGenerating] = useState(false);

    const { data: attendance } = useQuery({
        queryKey: ["my_attendance", eventId, user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("event_attendance" as any)
                .select("*")
                .eq("event_id", eventId)
                .eq("user_id", user!.id)
                .maybeSingle();
            return data as any;
        },
        enabled: !!eventId && !!user,
    });

    const { data: template } = useQuery({
        queryKey: ["certificate_template", eventId],
        queryFn: async () => {
            const { data } = await supabase
                .from("certificate_templates" as any)
                .select("*")
                .eq("event_id", eventId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!eventId,
    });

    const { data: registration } = useQuery({
        queryKey: ["my_registration_info", eventId, user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("event_registrations" as any)
                .select("*")
                .eq("event_id", eventId)
                .eq("user_id", user!.id)
                .maybeSingle();
            return data as any;
        },
        enabled: !!eventId && !!user,
    });

    const { data: volunteer } = useQuery({
        queryKey: ["my_volunteering_info", eventId, user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from("event_volunteers" as any)
                .select("*")
                .eq("event_id", eventId)
                .eq("user_id", user!.id)
                .maybeSingle();
            return data as any;
        },
        enabled: !!eventId && !!user,
    });

    const { data: eventData } = useQuery({
        queryKey: ["event_for_cert", eventId],
        queryFn: async () => {
            const { data } = await supabase
                .from("events")
                .select("title, activity_points, clubs(name), colleges(name)")
                .eq("id", eventId)
                .single();
            return data as any;
        },
        enabled: !!eventId,
    });

    const hasAttended = !!attendance || volunteer?.status === "approved";
    const hasTemplate = !!template;

    const generateCertificate = async () => {
        if (!template || !hasAttended) return;
        setGenerating(true);

        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Failed to load template image"));
                img.src = template.template_image_url;
            });

            const canvas = canvasRef.current;
            if (!canvas) throw new Error("Canvas not available");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context not available");

            // Render at 1200 wide for consistency
            const W = 1200;
            const scale = W / img.width;
            const H = img.height * scale;
            canvas.width = W;
            canvas.height = H;
            ctx.drawImage(img, 0, 0, W, H);

            const studentName = registration?.student_name || attendance?.student_name || volunteer?.full_name || user?.user_metadata?.full_name || "Student";
            const usn = registration?.usn || attendance?.usn || volunteer?.usn || "";
            const email = registration?.college_email || attendance?.college_email || volunteer?.email || user?.email || "";
            const clubName = (eventData as any)?.clubs?.name || "Club";
            const evTitle = (eventData as any)?.title || eventTitle;

            const builtIn = findBuiltInTemplate(template.template_image_url);

            if (builtIn) {
                // Use the shared drawing function for perfectly aligned text
                drawCertificateText(ctx, W, H, builtIn, {
                    clubName,
                    eventTitle: evTitle,
                    studentName,
                    usn,
                    email,
                    includeUsn: template.include_usn,
                    includeEmail: template.include_email,
                    includePoints: template.include_points && ((eventData as any)?.activity_points || 0) > 0,
                    points: (eventData as any)?.activity_points || 0,
                });
            } else {
                // Custom template — manual positioning (percentage-based)
                ctx.textAlign = "center";
                ctx.font = `bold ${template.name_font_size * scale}px Georgia, serif`;
                ctx.fillStyle = template.name_font_color;
                ctx.fillText(studentName, (template.name_x / 100) * W, (template.name_y / 100) * H);

                if (template.include_usn && usn) {
                    ctx.font = `${template.field_font_size * scale}px Arial, sans-serif`;
                    ctx.fillStyle = template.field_font_color;
                    ctx.fillText(`USN: ${usn}`, (template.usn_x / 100) * W, (template.usn_y / 100) * H);
                }
                if (template.include_email && email) {
                    ctx.font = `${template.field_font_size * scale}px Arial, sans-serif`;
                    ctx.fillStyle = template.field_font_color;
                    ctx.fillText(email, (template.email_x / 100) * W, (template.email_y / 100) * H);
                }
                if (template.include_points && (eventData as any)?.activity_points > 0) {
                    ctx.font = `bold ${template.field_font_size * scale}px Arial, sans-serif`;
                    ctx.fillStyle = template.field_font_color;
                    ctx.fillText(`${(eventData as any).activity_points} Activity Points Earned`, (template.points_x / 100) * W, (template.points_y / 100) * H);
                }
            }

            // Download
            const link = document.createElement("a");
            link.download = `certificate-${eventTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            toast.success("Certificate downloaded! 🎓");
        } catch (err: any) {
            toast.error(err.message || "Failed to generate certificate");
        } finally {
            setGenerating(false);
        }
    };

    if (!hasTemplate) return null;

    if (compact) {
        return (
            <>
                <canvas ref={canvasRef} className="hidden" />
                {hasAttended ? (
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600"
                        onClick={generateCertificate} disabled={generating}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {generating ? "Generating..." : "Certificate"}
                    </Button>
                ) : (
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20">
                        <Lock className="h-3 w-3 mr-1" /> Attendance Required
                    </Badge>
                )}
            </>
        );
    }

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                <CardContent className="flex items-center gap-4 p-4">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                        <Award className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">{eventTitle}</p>
                        {hasAttended ? (
                            <p className="text-xs text-emerald-400">✓ Verified — Certificate Available</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Verification required</p>
                        )}
                    </div>
                    {hasAttended ? (
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                            onClick={generateCertificate} disabled={generating}>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {generating ? "..." : "Download"}
                        </Button>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
