"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { CanvasTopToolbar } from "@/components/canvas/CanvasTopToolbar";

/**
 * Shared link viewer: same canvas as project view — zoom (Ctrl+wheel), pan (hand tool), fullscreen, theme.
 */
export function SharePreview({ code, title }: { code: string; title: string }) {
  return (
    <div className="flex h-screen flex-col bg-[#fafafa]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900" title={title || undefined}>
          {title || "Mermaid diagram"}
        </h1>
        <Link href="/" className="shrink-0">
          <Button variant="outline" size="sm">
            Edit in MermaidApp
          </Button>
        </Link>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden p-4">
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <CanvasTopToolbar />
        </div>
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
          <DiagramCanvas code={code} showGrid showToolbar minHeight="100%" />
        </div>
      </div>
    </div>
  );
}
