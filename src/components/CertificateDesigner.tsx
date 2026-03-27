import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Save, GripVertical, Check } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CertificateDesignerProps {
    event: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/*
 * All built-in templates share the SAME text layout.
 * Text is drawn centered horizontally (50% X).
 * Y positions are in percentage of canvas height (0–100).
 * This ensures perfect alignment regardless of template image dimensions.
 */

export interface TemplateStyle {
    id: string;
    name: string;
    preview: string;
    // Colors — the only thing that varies per template
    collegeColor: string;
    clubColor: string;
    titleColor: string;
    bodyColor: string;
    nameColor: string;
    fieldColor: string;
    // Optional underline beneath the name
    nameUnderlineColor: string;
}

// Shared layout — same for all built-in templates (% of height)
const LAYOUT = {
    collegeY: 15,
    clubY: 21,
    titleY: 33,
    preambleY: 43,
    nameY: 52,
    bodyLine1Y: 61,
    bodyLine2Y: 66,
    usnY: 76,
    emailY: 81,
    // Font sizes relative to canvas width
    collegeSizePct: 2.6,   // % of width
    clubSizePct: 1.5,
    titleSizePct: 3.2,
    bodySizePct: 1.5,
    nameSizePct: 4.0,
    fieldSizePct: 1.3,
    pointsY: 85,
};

export const BUILT_IN_TEMPLATES: TemplateStyle[] = [
    {
        id: "dark-elegant",
        name: "Dark Elegant",
        preview: "/cert-dark-elegant.png",
        collegeColor: "#fbbf24", clubColor: "#d4d4d8", titleColor: "#f5f5f4",
        bodyColor: "#a8a29e", nameColor: "#fbbf24", fieldColor: "#a1a1aa",
        nameUnderlineColor: "#fbbf2444",
    },
    {
        id: "dark-navy",
        name: "Dark Navy",
        preview: "/cert-dark-navy.png",
        collegeColor: "#fbbf24", clubColor: "#94a3b8", titleColor: "#e2e8f0",
        bodyColor: "#94a3b8", nameColor: "#fbbf24", fieldColor: "#64748b",
        nameUnderlineColor: "#fbbf2444",
    },
    {
        id: "dark-purple",
        name: "Dark Purple",
        preview: "/cert-dark-purple.png",
        collegeColor: "#c4b5fd", clubColor: "#a5b4fc", titleColor: "#e9d5ff",
        bodyColor: "#a1a1aa", nameColor: "#c4b5fd", fieldColor: "#9ca3af",
        nameUnderlineColor: "#c4b5fd44",
    },
    {
        id: "dark-emerald",
        name: "Dark Emerald",
        preview: "/cert-dark-emerald.png",
        collegeColor: "#fbbf24", clubColor: "#6ee7b7", titleColor: "#d1fae5",
        bodyColor: "#a7f3d0", nameColor: "#fbbf24", fieldColor: "#6ee7b7",
        nameUnderlineColor: "#fbbf2444",
    },
    {
        id: "dark-carbon",
        name: "Dark Carbon",
        preview: "/cert-dark-carbon.png",
        collegeColor: "#f59e0b", clubColor: "#d4d4d8", titleColor: "#fafafa",
        bodyColor: "#a1a1aa", nameColor: "#f59e0b", fieldColor: "#a1a1aa",
        nameUnderlineColor: "#f59e0b44",
    },
    {
        id: "dark-burgundy",
        name: "Dark Burgundy",
        preview: "/cert-dark-burgundy.png",
        collegeColor: "#fbbf24", clubColor: "#fca5a5", titleColor: "#fef2f2",
        bodyColor: "#d6d3d1", nameColor: "#fbbf24", fieldColor: "#d6d3d1",
        nameUnderlineColor: "#fbbf2444",
    },
];

// ─── Shared draw function ───
export function drawCertificateText(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    tmpl: TemplateStyle,
    opts: {
        clubName: string;
        eventTitle: string;
        studentName: string;
        usn?: string;
        email?: string;
        includeUsn: boolean;
        includeEmail: boolean;
        includePoints: boolean;
        points?: number;
    }
) {
    const cx = W / 2;
    const L = LAYOUT;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // College
    ctx.font = `bold ${W * L.collegeSizePct / 100}px Georgia, serif`;
    ctx.fillStyle = tmpl.collegeColor;
    ctx.fillText("BMS College of Engineering", cx, H * L.collegeY / 100);

    // Club
    ctx.font = `italic ${W * L.clubSizePct / 100}px Arial, sans-serif`;
    ctx.fillStyle = tmpl.clubColor;
    ctx.fillText(opts.clubName, cx, H * L.clubY / 100);

    // Title
    ctx.font = `bold ${W * L.titleSizePct / 100}px Georgia, serif`;
    ctx.fillStyle = tmpl.titleColor;
    ctx.letterSpacing = "4px";
    ctx.fillText("CERTIFICATE OF PARTICIPATION", cx, H * L.titleY / 100);
    ctx.letterSpacing = "0px";

    // Preamble
    ctx.font = `${W * L.bodySizePct / 100}px Arial, sans-serif`;
    ctx.fillStyle = tmpl.bodyColor;
    ctx.fillText("This is to certify that", cx, H * L.preambleY / 100);

    // Student Name
    ctx.font = `bold ${W * L.nameSizePct / 100}px Georgia, serif`;
    ctx.fillStyle = tmpl.nameColor;
    ctx.fillText(opts.studentName, cx, H * L.nameY / 100);

    // Underline beneath name
    const nameWidth = ctx.measureText(opts.studentName).width;
    ctx.strokeStyle = tmpl.nameUnderlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - nameWidth / 2 - 20, H * L.nameY / 100 + W * L.nameSizePct / 100 * 0.6);
    ctx.lineTo(cx + nameWidth / 2 + 20, H * L.nameY / 100 + W * L.nameSizePct / 100 * 0.6);
    ctx.stroke();

    // Body line 1
    ctx.font = `${W * L.bodySizePct / 100}px Arial, sans-serif`;
    ctx.fillStyle = tmpl.bodyColor;
    ctx.fillText(
        `has successfully participated in "${opts.eventTitle}"`,
        cx, H * L.bodyLine1Y / 100
    );

    // Body line 2
    ctx.fillText(
        `organized by ${opts.clubName} at BMS College of Engineering.`,
        cx, H * L.bodyLine2Y / 100
    );

    // USN
    if (opts.includeUsn && opts.usn) {
        ctx.font = `${W * L.fieldSizePct / 100}px Arial, sans-serif`;
        ctx.fillStyle = tmpl.fieldColor;
        ctx.fillText(`USN: ${opts.usn}`, cx, H * L.usnY / 100);
    }

    // Email
    if (opts.includeEmail && opts.email) {
        ctx.font = `${W * L.fieldSizePct / 100}px Arial, sans-serif`;
        ctx.fillStyle = tmpl.fieldColor;
        ctx.fillText(opts.email, cx, H * L.emailY / 100);
    }

    // Activity Points
    if (opts.includePoints && opts.points !== undefined) {
        ctx.font = `bold ${W * L.fieldSizePct / 100}px Arial, sans-serif`;
        ctx.fillStyle = tmpl.collegeColor; // Use specific highlight color
        ctx.fillText(`${opts.points} Activity Points Earned`, cx, H * (L as any).pointsY / 100);
    }
}

// ─── Component ───
export default function CertificateDesigner({ event, open, onOpenChange }: CertificateDesignerProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [selectedId, setSelectedId] = useState("dark-elegant");
    const [useCustom, setUseCustom] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);

    const [includeUsn, setIncludeUsn] = useState(true);
    const [includeEmail, setIncludeEmail] = useState(true);
    const [includePoints, setIncludePoints] = useState(true);

    // Custom template manual controls
    const [nameX, setNameX] = useState(50);
    const [nameY, setNameY] = useState(50);
    const [nameFontSize, setNameFontSize] = useState(36);
    const [nameFontColor, setNameFontColor] = useState("#ffffff");
    const [usnX, setUsnX] = useState(50);
    const [usnY, setUsnY] = useState(65);
    const [emailX, setEmailX] = useState(50);
    const [emailY, setEmailY] = useState(70);
    const [pointsX, setPointsX] = useState(50);
    const [pointsY, setPointsY] = useState(85);
    const [fieldFontSize, setFieldFontSize] = useState(20);
    const [fieldFontColor, setFieldFontColor] = useState("#cccccc");

    const [saving, setSaving] = useState(false);

    const clubName = (event as any)?.clubs?.name || "Club";
    const selectedTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === selectedId) || BUILT_IN_TEMPLATES[0];

    // Load existing template
    const { data: existingTemplate } = useQuery({
        queryKey: ["certificate_template", event?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("certificate_templates" as any)
                .select("*")
                .eq("event_id", event.id)
                .maybeSingle();
            if (error) throw error;
            return data as any;
        },
        enabled: !!event?.id && open,
    });

    useEffect(() => {
        if (existingTemplate) {
            const url = existingTemplate.template_image_url;
            const builtIn = BUILT_IN_TEMPLATES.find((t) => url?.includes(t.preview) || url === t.preview);
            if (builtIn) {
                setSelectedId(builtIn.id);
                setUseCustom(false);
            } else {
                setImageUrl(url);
                setUseCustom(true);
                setNameX(existingTemplate.name_x);
                setNameY(existingTemplate.name_y);
                setNameFontSize(existingTemplate.name_font_size);
                setNameFontColor(existingTemplate.name_font_color);
                setUsnX(existingTemplate.usn_x);
                setUsnY(existingTemplate.usn_y);
                setEmailX(existingTemplate.email_x);
                setEmailY(existingTemplate.email_y);
                setFieldFontSize(existingTemplate.field_font_size);
                setFieldFontColor(existingTemplate.field_font_color);
            }
            setIncludeUsn(existingTemplate.include_usn);
            setIncludeEmail(existingTemplate.include_email);
            setIncludePoints(existingTemplate.include_points);
            if (existingTemplate.points_x) setPointsX(existingTemplate.points_x);
            if (existingTemplate.points_y) setPointsY(existingTemplate.points_y);
        }
    }, [existingTemplate]);

    // Load image
    useEffect(() => {
        const url = useCustom
            ? (imageFile ? URL.createObjectURL(imageFile) : (imageUrl || ""))
            : selectedTemplate.preview;
        if (!url) { setTemplateImage(null); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setTemplateImage(img);
        img.onerror = () => setTemplateImage(null);
        img.src = url;
        return () => { if (useCustom && imageFile) URL.revokeObjectURL(url); };
    }, [imageFile, imageUrl, useCustom, selectedId]);

    // Draw preview
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !templateImage) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const W = 1200;
        const scale = W / templateImage.width;
        const H = Math.round(templateImage.height * scale);
        canvas.width = W;
        canvas.height = H;
        ctx.drawImage(templateImage, 0, 0, W, H);

        if (!useCustom) {
            drawCertificateText(ctx, W, H, selectedTemplate, {
                clubName,
                eventTitle: event?.title || "Event Name",
                studentName: "John Doe",
                usn: "1BM22CS001",
                email: "john.cs22@bmsce.ac.in",
                includeUsn,
                includeEmail,
                includePoints: includePoints && (event?.activity_points || 0) > 0,
                points: event?.activity_points || 0,
            });
        } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `bold ${nameFontSize * scale}px Georgia, serif`;
            ctx.fillStyle = nameFontColor;
            ctx.fillText("John Doe", (nameX / 100) * W, (nameY / 100) * H);
            if (includeUsn) {
                ctx.font = `${fieldFontSize * scale}px Arial, sans-serif`;
                ctx.fillStyle = fieldFontColor;
                ctx.fillText("USN: 1BM22CS001", (usnX / 100) * W, (usnY / 100) * H);
            }
            if (includeEmail) {
                ctx.font = `${fieldFontSize * scale}px Arial, sans-serif`;
                ctx.fillStyle = fieldFontColor;
                ctx.fillText("john.cs22@bmsce.ac.in", (emailX / 100) * W, (emailY / 100) * H);
            }
            if (includePoints && (event?.activity_points || 0) > 0) {
                ctx.font = `bold ${fieldFontSize * scale}px Arial, sans-serif`;
                ctx.fillStyle = fieldFontColor;
                ctx.fillText(`${event?.activity_points} Activity Points Earned`, (pointsX / 100) * W, (pointsY / 100) * H);
            }
        }
    }, [templateImage, selectedTemplate, useCustom, includeUsn, includeEmail, includePoints,
        nameX, nameY, nameFontSize, nameFontColor, usnX, usnY, emailX, emailY, pointsX, pointsY,
        fieldFontSize, fieldFontColor, clubName, event]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setUseCustom(true); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let finalImageUrl: string;
            if (useCustom) {
                if (!imageFile && !imageUrl) { toast.error("Upload a template image."); setSaving(false); return; }
                if (imageFile) {
                    const ext = imageFile.name.split(".").pop();
                    const path = `${event.id}/${Date.now()}.${ext}`;
                    const { error: err } = await supabase.storage.from("certificate-templates").upload(path, imageFile, { upsert: true });
                    if (err) throw err;
                    finalImageUrl = supabase.storage.from("certificate-templates").getPublicUrl(path).data.publicUrl;
                } else {
                    finalImageUrl = imageUrl!;
                }
            } else {
                finalImageUrl = selectedTemplate.preview;
            }

            const templateData = {
                event_id: event.id,
                template_image_url: finalImageUrl,
                name_x: useCustom ? nameX : 50,
                name_y: useCustom ? nameY : LAYOUT.nameY,
                name_font_size: useCustom ? nameFontSize : Math.round(1200 * LAYOUT.nameSizePct / 100),
                name_font_color: useCustom ? nameFontColor : selectedTemplate.nameColor,
                include_usn: includeUsn,
                usn_x: useCustom ? usnX : 50,
                usn_y: useCustom ? usnY : LAYOUT.usnY,
                include_email: includeEmail,
                email_x: useCustom ? emailX : 50,
                email_y: useCustom ? emailY : LAYOUT.emailY,
                include_points: includePoints,
                points_x: useCustom ? pointsX : 50,
                points_y: useCustom ? pointsY : (LAYOUT as any).pointsY,
                field_font_size: useCustom ? fieldFontSize : Math.round(1200 * LAYOUT.fieldSizePct / 100),
                field_font_color: useCustom ? fieldFontColor : selectedTemplate.fieldColor,
                created_by: user!.id,
            };

            if (existingTemplate) {
                const { error } = await supabase.from("certificate_templates" as any).update(templateData as any).eq("id", existingTemplate.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("certificate_templates" as any).insert(templateData as any);
                if (error) throw error;
            }

            queryClient.invalidateQueries({ queryKey: ["certificate_template", event?.id] });
            toast.success("Certificate template saved!");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5" /> Certificate Template: {event?.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Template Gallery */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold">Choose a Template</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {BUILT_IN_TEMPLATES.map((tmpl) => (
                                <div
                                    key={tmpl.id}
                                    className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:scale-[1.03] ${!useCustom && selectedId === tmpl.id
                                        ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/20"
                                        : "border-border hover:border-border"
                                        }`}
                                    onClick={() => { setSelectedId(tmpl.id); setUseCustom(false); }}
                                >
                                    <img src={tmpl.preview} alt={tmpl.name} className="w-full h-16 sm:h-20 object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center bg-black/60 backdrop-blur-sm">
                                        <p className="text-[11px] font-semibold text-foreground">{tmpl.name}</p>
                                    </div>
                                    {!useCustom && selectedId === tmpl.id && (
                                        <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5 shadow">
                                            <Check className="h-3 w-3 text-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <label className="cursor-pointer block">
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <span><ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Upload Custom Template</span>
                            </Button>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        {useCustom && <Badge variant="secondary" className="text-xs">Using custom image</Badge>}
                    </div>

                    {/* Live Preview */}
                    {templateImage && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-300 border-emerald-500/20">✨ Live Preview</Badge>
                                <span className="text-[11px] text-muted-foreground">Sample: "John Doe"</span>
                            </div>
                            <div className="border rounded-xl overflow-hidden bg-black/20 shadow-inner">
                                <canvas ref={canvasRef} className="w-full h-auto" />
                            </div>
                        </div>
                    )}

                    {/* Options */}
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <Switch checked={includeUsn} onCheckedChange={setIncludeUsn} id="incUsn" />
                            <Label htmlFor="incUsn" className="text-sm">Include USN</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={includeEmail} onCheckedChange={setIncludeEmail} id="incEmail" />
                            <Label htmlFor="incEmail" className="text-sm">Include Email</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={includePoints} onCheckedChange={setIncludePoints} id="incPoints" />
                            <Label htmlFor="incPoints" className="text-sm">Include Activity Points</Label>
                        </div>
                    </div>

                    {/* Custom positioning controls */}
                    {useCustom && templateImage && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                                <h4 className="font-bold text-sm flex items-center gap-2"><GripVertical className="h-4 w-4" /> Name Position</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1"><Label className="text-[11px]">X %</Label><Input type="number" min={0} max={100} value={nameX} onChange={(e) => setNameX(Number(e.target.value))} /></div>
                                    <div className="space-y-1"><Label className="text-[11px]">Y %</Label><Input type="number" min={0} max={100} value={nameY} onChange={(e) => setNameY(Number(e.target.value))} /></div>
                                    <div className="space-y-1"><Label className="text-[11px]">Size</Label><Input type="number" min={12} max={80} value={nameFontSize} onChange={(e) => setNameFontSize(Number(e.target.value))} /></div>
                                    <div className="space-y-1"><Label className="text-[11px]">Color</Label><Input type="color" value={nameFontColor} onChange={(e) => setNameFontColor(e.target.value)} /></div>
                                </div>
                            </div>
                            {includeUsn && (
                                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-sm">USN Position</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1"><Label className="text-[11px]">X %</Label><Input type="number" min={0} max={100} value={usnX} onChange={(e) => setUsnX(Number(e.target.value))} /></div>
                                        <div className="space-y-1"><Label className="text-[11px]">Y %</Label><Input type="number" min={0} max={100} value={usnY} onChange={(e) => setUsnY(Number(e.target.value))} /></div>
                                    </div>
                                </div>
                            )}
                            {includeEmail && (
                                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-sm">Email Position</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1"><Label className="text-[11px]">X %</Label><Input type="number" min={0} max={100} value={emailX} onChange={(e) => setEmailX(Number(e.target.value))} /></div>
                                        <div className="space-y-1"><Label className="text-[11px]">Y %</Label><Input type="number" min={0} max={100} value={emailY} onChange={(e) => setEmailY(Number(e.target.value))} /></div>
                                    </div>
                                </div>
                            )}
                            {includePoints && (
                                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-sm">Points Position</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1"><Label className="text-[11px]">X %</Label><Input type="number" min={0} max={100} value={pointsX} onChange={(e) => setPointsX(Number(e.target.value))} /></div>
                                        <div className="space-y-1"><Label className="text-[11px]">Y %</Label><Input type="number" min={0} max={100} value={pointsY} onChange={(e) => setPointsY(Number(e.target.value))} /></div>
                                    </div>
                                </div>
                            )}
                            {(includeUsn || includeEmail || includePoints) && (
                                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                                    <h4 className="font-bold text-sm">Field Styling</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1"><Label className="text-[11px]">Size</Label><Input type="number" min={10} max={40} value={fieldFontSize} onChange={(e) => setFieldFontSize(Number(e.target.value))} /></div>
                                        <div className="space-y-1"><Label className="text-[11px]">Color</Label><Input type="color" value={fieldFontColor} onChange={(e) => setFieldFontColor(e.target.value)} /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save */}
                    <Button className="w-full gradient-primary text-foreground" onClick={handleSave} disabled={saving || !templateImage}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : existingTemplate ? "Update Template" : "Save Template"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
