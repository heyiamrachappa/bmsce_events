import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Ticket, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TicketDownloadProps {
    registrationId: string;
    eventTitle: string;
    studentName: string;
    usn: string;
    eventDate?: string;
    eventLocation?: string;
    compact?: boolean;
}

export default function TicketDownload({
    registrationId,
    eventTitle,
    studentName,
    usn,
    eventDate,
    eventLocation,
    compact = false
}: TicketDownloadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [generating, setGenerating] = useState(false);

    const generateTicket = async () => {
        setGenerating(true);
        try {
            const canvas = canvasRef.current;
            if (!canvas) throw new Error("Canvas not available");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context not available");

            // Ticket Dimensions (Portrait)
            const W = 600;
            const H = 900;
            canvas.width = W;
            canvas.height = H;

            // 1. Background (Premium Dark Theme)
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, "#1e1b4b"); // indigo-950
            grad.addColorStop(1, "#312e81"); // indigo-900
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // 2. Artistic Border/Details
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 20;
            ctx.strokeRect(10, 10, W - 20, H - 20);

            // 3. Header
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 40px Inter, sans-serif";
            ctx.fillText("EVENT TICKET", W / 2, 70);
            
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(100, 90);
            ctx.lineTo(500, 90);
            ctx.stroke();

            // 4. Event Title
            ctx.fillStyle = "#facc15"; // yellow-400
            ctx.font = "black 48px Inter, sans-serif";
            const titleLines = wrapText(ctx, eventTitle.toUpperCase(), W - 100);
            titleLines.forEach((line, i) => {
                ctx.fillText(line, W / 2, 160 + (i * 55));
            });

            const nextY = 160 + (titleLines.length * 55) + 40;

            // 5. Details Section
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.font = "18px Inter, sans-serif";
            
            let currY = nextY;
            const drawDetail = (label: string, value: string) => {
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.font = "16px Inter, sans-serif";
                ctx.fillText(label, 80, currY);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 24px Inter, sans-serif";
                ctx.fillText(value, 80, currY + 30);
                currY += 70;
            };

            drawDetail("NAME", studentName);
            drawDetail("USN", usn);
            if (eventDate) {
                drawDetail("DATE", format(new Date(eventDate), "PPP p"));
            }
            if (eventLocation) {
                drawDetail("LOCATION", eventLocation);
            }

            // 6. QR Code
            const qrSize = 200;
            const qrX = (W - qrSize) / 2;
            const qrY = H - qrSize - 120;
            
            // Draw a white background for the QR code
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 15);
            ctx.fill();

            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${registrationId}`;
            const qrImg = new Image();
            qrImg.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                qrImg.onload = () => {
                    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                    resolve();
                };
                qrImg.onerror = () => reject(new Error("Failed to load QR code"));
                qrImg.src = qrUrl;
            });

            // 7. Footer ID
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.font = "14px monospace";
            ctx.fillText(`ID: ${registrationId}`, W / 2, H - 60);
            ctx.fillText("BMSCE-EVENTS ECOSYSTEM", W / 2, H - 40);

            // 8. Download
            const link = document.createElement("a");
            link.download = `ticket-${eventTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            toast.success("Ticket downloaded! 🎫");
        } catch (err: any) {
            toast.error("Failed to generate ticket");
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
        const words = text.split(" ");
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            <Button
                onClick={generateTicket}
                disabled={generating}
                variant={compact ? "outline" : "default"}
                size={compact ? "sm" : "default"}
                className={!compact ? "w-full gradient-primary text-foreground border-0" : "flex items-center gap-1.5"}
            >
                {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Ticket className={compact ? "h-3.5 w-3.5" : "h-4 w-4 mr-2"} />
                )}
                {generating ? "Generating..." : "Download Ticket"}
            </Button>
        </>
    );
}
