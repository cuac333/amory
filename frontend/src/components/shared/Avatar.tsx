import { useState, useRef } from "react";
import { Camera } from "lucide-react";

interface Props {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: "primary" | "secondary";
  editable?: boolean;
  onUpload?: (file: File) => void;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-14 h-14 text-xl",
  xl: "w-20 h-20 text-2xl",
};

const cameraSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-7 h-7",
};

export default function Avatar({ src, name, size = "lg", gradient = "primary", editable, onUpload }: Props) {
  const [imgError, setImgError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = name?.charAt(0).toUpperCase() || "?";

  const gradientClass = gradient === "primary"
    ? "bg-gradient-to-br from-burnt-300 to-sandy-400"
    : "bg-gradient-to-br from-sandy-300 to-burnt-300";

  const handleClick = () => {
    if (editable && fileRef.current) fileRef.current.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    // iOS sends HEIC — convert to JPEG via canvas
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h * MAX) / w; w = MAX; }
          else { w = (w * MAX) / h; h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) onUpload(new File([blob], "avatar.jpeg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.85
        );
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className={`relative ${editable ? "cursor-pointer group" : ""}`}
      onClick={handleClick}
    >
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold shadow-lg ring-2 ring-white/30 dark:ring-white/10 overflow-hidden ${
          src && !imgError ? "" : gradientClass + " text-white"
        }`}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          initial
        )}
      </div>

      {editable && (
        <>
          <div className={`absolute bottom-0 right-0 ${cameraSizes[size]} rounded-full bg-burnt-300 flex items-center justify-center shadow-md border-2 border-white dark:border-charcoal-800 group-hover:bg-burnt-400 transition-colors`}>
            <Camera size={size === "sm" ? 8 : size === "md" ? 10 : 12} className="text-white" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
