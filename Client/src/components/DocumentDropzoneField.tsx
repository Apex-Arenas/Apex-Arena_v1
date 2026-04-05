import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus } from "lucide-react";

interface DocumentDropzoneFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  file: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

export default function DocumentDropzoneField({
  label,
  required,
  hint,
  file,
  disabled,
  onChange,
}: DocumentDropzoneFieldProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const picked = acceptedFiles[0];
      if (!picked) return;
      onChange(picked);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
    disabled,
  });

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      <div
        {...getRootProps()}
        className={`rounded-lg border border-dashed px-4 py-5 transition-colors ${
          isDragActive
            ? "border-cyan-500 bg-cyan-500/10"
            : "border-slate-700 bg-slate-800/30"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ImagePlus className="w-4 h-4 text-cyan-400" />
            <span>
              {isDragActive
                ? "Drop document here"
                : file
                  ? file.name
                  : "Drag and drop file here, or browse"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {file && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(null);
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-600 text-xs font-medium text-slate-300 hover:bg-slate-700/70"
                disabled={disabled}
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
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-50"
              disabled={disabled}
            >
              Choose file
            </button>
          </div>
        </div>

        {file && (
          <p className="mt-1 text-xs text-slate-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>

      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
