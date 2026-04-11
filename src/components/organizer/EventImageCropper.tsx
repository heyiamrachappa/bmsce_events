import React, { useState, useRef } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCroppedImg } from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Square, X, Check, RotateCcw } from "lucide-react";

interface EventImageCropperProps {
  image: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
}

const ASPECT_RATIOS = [
  { label: "16:9", value: 16 / 9, icon: Maximize2 },
  { label: "1:1", value: 1 / 1, icon: Square },
  { label: "Free", value: undefined, icon: RotateCcw },
];

export function EventImageCropper({
  image,
  open,
  onClose,
  onCropComplete,
}: EventImageCropperProps) {
  const [aspect, setAspect] = useState<number | undefined>(ASPECT_RATIOS[0].value);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleApplyCrop = async () => {
    try {
      let finalCrop = completedCrop;

      if (!finalCrop && imgRef.current) {
        // Fallback or default calculate
         finalCrop = {
          unit: 'px',
          x: (crop.x / 100) * imgRef.current.naturalWidth,
          y: (crop.y / 100) * imgRef.current.naturalHeight,
          width: (crop.width / 100) * imgRef.current.naturalWidth,
          height: (crop.height / 100) * imgRef.current.naturalHeight,
        };
      }

      if (finalCrop && finalCrop.width > 0 && finalCrop.height > 0) {
        const croppedImage = await getCroppedImg(image, finalCrop);
        if (croppedImage) {
          onCropComplete(croppedImage);
          onClose();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0A0A0B] border-border/50 rounded-[32px] overflow-hidden p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border/10 bg-card/30">
          <DialogTitle className="text-xl font-[900] uppercase tracking-tight flex items-center gap-3">
            <div className="h-8 w-2 bg-primary rounded-full" />
            Adjust Cover Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center items-center h-[400px] w-full bg-[#000] p-4 overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img 
              ref={imgRef} 
              src={image} 
              alt="Crop preview" 
              className="max-h-[380px] w-auto rounded-md" 
              onLoad={(e) => {
                 const { naturalWidth, naturalHeight } = e.currentTarget;
                 const defaultAspect = aspect || (naturalWidth / naturalHeight);
                 // Reset crop state on load
                 setCrop({
                    unit: '%',
                    width: aspect ? 90 : 100,
                    height: aspect ? (90 / defaultAspect) : 100,
                    x: aspect ? 5 : 0,
                    y: aspect ? ((100 - (90 / defaultAspect)) / 2) : 0,
                 });
              }}
            />
          </ReactCrop>
        </div>

        <div className="p-8 space-y-8 bg-card/20 pb-10">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-3 w-full md:w-auto">
              <p className="text-[10px] font-[900] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Aspect Ratio</p>
              <div className="flex flex-wrap bg-background/50 p-1 rounded-2xl border border-border/20">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.label}
                    onClick={() => setAspect(ratio.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      aspect === ratio.value
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <ratio.icon className="h-3.5 w-3.5" />
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="text-right flex-1 text-sm text-muted-foreground/60 font-bold uppercase tracking-widest hidden md:block">
              Drag corners to resize
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl border-2 border-border/50 font-[900] uppercase tracking-widest text-xs hover:bg-accent transition-all"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleApplyCrop}
              className="flex-[2] h-14 rounded-2xl bg-primary text-primary-foreground font-[900] uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Crop
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
