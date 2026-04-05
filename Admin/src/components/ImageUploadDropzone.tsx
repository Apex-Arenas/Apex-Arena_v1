import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2 } from "lucide-react";
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
        setError(
          uploadError instanceof Error ? uploadError.message : "Upload failed.",
        );
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
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`rounded-lg border border-dashed px-4 py-5 transition-colors ${
          isDragActive
            ? "border-amber-500 bg-amber-500/10"
            : "border-slate-700 bg-slate-800/30"
        } ${disabled || isUploading ? "opacity-60" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <ImagePlus className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {isUploading
                ? "Uploading image..."
                : isDragActive
                  ? "Drop image here"
                  : value
                    ? "Image uploaded"
                    : "Drag and drop image here, or browse"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange("");
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs font-medium text-slate-300 hover:bg-slate-700/70"
                disabled={disabled || isUploading}
              >
                Remove
              </button>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                open();
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50"
              disabled={disabled || isUploading}
            >
              Choose file
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {value && (
        <img
          src={value}
          alt="Preview"
          className="h-24 w-24 rounded-lg object-cover border border-slate-700"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}
