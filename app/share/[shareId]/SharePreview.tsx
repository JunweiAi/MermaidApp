"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import Link from "next/link";
import { Button } from "@/components/ui/button";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
});

export function SharePreview({ code, title }: { code: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim()) return;
    const id = `share-${Date.now()}`;
    mermaid
      .render(id, code)
      .then(({ svg: result }) => {
        setSvg(result);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Invalid diagram");
        setSvg(null);
      });
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-xl font-semibold">{title || "Mermaid diagram"}</h1>
      <div
        ref={containerRef}
        className="flex min-h-[200px] min-w-[300px] items-center justify-center rounded-lg border bg-muted/30 p-6"
      >
        {error && <p className="text-sm text-destructive">{error}</p>}
        {svg && !error && (
          <div
            className="[&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      <Link href="/" className="mt-6">
        <Button variant="outline">Edit in MermaidApp</Button>
      </Link>
    </div>
  );
}
