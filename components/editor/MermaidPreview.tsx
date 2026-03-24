"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useEditorStore } from "@/store/editorStore";
import { debounce } from "@/lib/debounce";
import {
  cleanupAfterMermaidRender,
  isMermaidSyntaxErrorSvgString,
  sweepMermaidStrayRenderRoots,
} from "@/lib/mermaid-render-cleanup";
import { cn } from "@/lib/utils";

export function MermaidPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { code } = useEditorStore();
  const renderIdRef = useRef(0);
  const renderSeqRef = useRef(0);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const debounceRef = useRef(debounce((c: string) => setDebouncedCode(c), 300));

  // 在客户端初始化 mermaid，避免 SSR 崩溃
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    });
    setInitialized(true);
  }, []);

  useEffect(() => {
    debounceRef.current(code);
  }, [code]);

  /** While `code` is ahead of debounced preview, clear stale error so a fix isn't stuck until debounce. */
  useEffect(() => {
    if (code !== debouncedCode) setError(null);
  }, [code, debouncedCode]);

  useEffect(() => {
    // 等待 mermaid 初始化完成再渲染
    if (!initialized) return;
    const seq = ++renderSeqRef.current;
    const id = `mermaid-${Date.now()}-${renderIdRef.current++}`;
    if (!debouncedCode.trim()) {
      setSvg(null);
      setError(null);
      sweepMermaidStrayRenderRoots(containerRef.current);
      return;
    }
    /** Clear before each render attempt so a successful parse isn't preceded by old error text. */
    setError(null);
    sweepMermaidStrayRenderRoots(containerRef.current);
    mermaid
      .render(id, debouncedCode)
      .then(({ svg: result }) => {
        cleanupAfterMermaidRender(id, containerRef.current);
        if (seq !== renderSeqRef.current) return;
        if (isMermaidSyntaxErrorSvgString(result)) {
          setError("Syntax error in text");
          setSvg(null);
          return;
        }
        setSvg(result);
        setError(null);
      })
      .catch((err: Error) => {
        cleanupAfterMermaidRender(id, containerRef.current);
        if (seq !== renderSeqRef.current) return;
        setError(err.message ?? "Invalid Mermaid syntax");
        setSvg(null);
      });
  }, [debouncedCode, initialized]);

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
