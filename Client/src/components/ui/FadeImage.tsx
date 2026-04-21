import { useState } from "react";

interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  skeletonClassName?: string;
}

/**
 * Renders an image that fades in once loaded.
 * The parent container should have a background color / skeleton background.
 */
export function FadeImage({ className, fallback, skeletonClassName, onLoad, onError, ...props }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored && fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      {!loaded && !errored && (
        <div className={`absolute inset-0 animate-pulse bg-slate-800 ${skeletonClassName ?? ""}`} />
      )}
      <img
        {...props}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
        onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
        onError={(e) => { setErrored(true); onError?.(e); }}
      />
    </>
  );
}
