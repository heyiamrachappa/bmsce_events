import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImg } from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
];

export function EventImageCropper({
  image,
  open,
  onClose,
  onCropComplete,
}: EventImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0].value);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(image, croppedAreaPixels);
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

        <div className="relative h-[400px] w-full bg-[#000]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            classes={{
              containerClassName: "rounded-none",
            }}
          />
        </div>

        <div className="p-8 space-y-8 bg-card/20 pb-10">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            {/* Aspect Ratio Toggle */}
            <div className="space-y-3 w-full md:w-auto">
              <p className="text-[10px] font-[900] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Aspect Ratio</p>
              <div className="flex bg-background/50 p-1 rounded-2xl border border-border/20">
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

            {/* Zoom Slider */}
            <div className="space-y-3 flex-1 w-full max-w-[240px]">
              <p className="text-[10px] font-[900] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Zoom Precision</p>
              <div className="px-1">
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(val) => setZoom(val[0])}
                  className="cursor-pointer"
                />
              </div>
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
