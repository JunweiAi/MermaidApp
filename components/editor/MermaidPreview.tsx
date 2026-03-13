"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useEditorStore } from "@/store/editorStore";
import { debounce } from "@/lib/debounce";
import { cn } from "@/lib/utils";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
});

export function MermaidPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { code } = useEditorStore();
  const renderIdRef = useRef(0);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const debounceRef = useRef(debounce((c: string) => setDebouncedCode(c), 300));

  useEffect(() => {
    debounceRef.current(code);
  }, [code]);

  useEffect(() => {
    const id = `mermaid-${Date.now()}-${renderIdRef.current++}`;
    if (!debouncedCode.trim()) {
      setSvg(null);
      setError(null);
      return;
    }
    mermaid
      .render(id, debouncedCode)
      .then(({ svg: result }) => {
        setSvg(result);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Invalid Mermaid syntax");
        setSvg(null);
      });
  }, [debouncedCode]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-auto rounded-md border bg-muted/30 p-4",
        !svg && !error && "text-muted-foreground"
      )}
    >
      {error && (
        <pre className="w-full whitespace-pre-wrap text-sm text-destructive">
          {error}
        </pre>
      )}
      {svg && !error && (
        <div
          className="mermaid-preview flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {!svg && !error && code.trim() === "" && (
        <span className="text-sm">Preview will appear here after you enter Mermaid code</span>
      )}
    </div>
  );
}
