import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COLLAPSE_LINES } from "./tournament-detail.utils";

export default function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div className="flex flex-col">
      <p
        ref={ref}
        style={expanded ? undefined : { WebkitLineClamp: COLLAPSE_LINES, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
        className="text-sm text-slate-300 leading-relaxed whitespace-pre-line"
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors ml-auto"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
