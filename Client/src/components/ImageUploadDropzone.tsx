import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { uploadImageMedia } from "../services/media-upload.service";

interface ImageUploadDropzoneProps {
  value: string;
  onChange: (value: string) => void;
  folder?: string;
  disabled?: boolean;
}

export default function ImageUploadDropzone({
  value,
  onChange,
  folder,
  disabled = false,
}: ImageUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || disabled) return;
      setIsUploading(true);
      setError(null);
      try {
        const uploadedUrl = await uploadImageMedia(file, folder);
        onChange(uploadedUrl);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, folder, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    accept: { "image/*": [] },
    disabled: disabled || isUploading,
  });

  return (
    <div className="space-y-3">
      {value ? (
        /* ── Has image ── */
        <div className="flex flex-col items-center gap-4">
          {/* Preview */}
          <div
            {...getRootProps()}
            className="relative group cursor-pointer"
            onClick={(e) => { e.preventDefault(); open(); }}
          >
            <input {...getInputProps()} />
            <img
              src={value}
              alt="Preview"
              className="w-32 h-32 rounded-2xl object-cover border-2 border-slate-700 shadow-xl"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            {/* Hover overlay */}
            <div className={`absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-1 transition-opacity ${isDragActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <Camera className="w-6 h-6 text-white" />
              <span className="text-[11px] font-semibold text-white uppercase tracking-wide">
                {isDragActive ? "Drop here" : "Change"}
              </span>
            </div>
            {isUploading && (
              <div className="absolute inset-0 rounded-2xl bg-slate-900/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); open(); }}
              disabled={disabled || isUploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              Change Photo
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onChange(""); }}
              disabled={disabled || isUploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* ── No image ── */
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed px-6 py-10 flex flex-col items-center gap-4 transition-colors cursor-pointer ${
            isDragActive
              ? "border-orange-500/60 bg-orange-500/5"
              : "border-slate-700 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40"
          } ${disabled || isUploading ? "opacity-60 pointer-events-none" : ""}`}
          onClick={(e) => { e.preventDefault(); open(); }}
        >
          <input {...getInputProps()} />
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            {isUploading
              ? <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              : <ImagePlus className="w-6 h-6 text-slate-500" />
            }
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">
              {isUploading ? "Uploading…" : isDragActive ? "Drop image here" : "Click or drag to upload"}
            </p>
            <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
