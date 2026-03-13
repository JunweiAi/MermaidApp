"use client";

import { Hand } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { ThemeSelect } from "@/components/canvas/ThemeSelect";
import { cn } from "@/lib/utils";

export function CanvasTopToolbar() {
  const { panMode, setPanMode } = useCanvasStore();

  return (
    <div className="flex items-center gap-0 rounded-lg border border-sky-200/80 bg-sky-50/90 px-2 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => setPanMode(!panMode)}
        className={cn(
          "rounded-md p-2 transition-colors",
          panMode
            ? "bg-sky-200/70 text-sky-800"
            : "text-gray-600 hover:bg-sky-100/80 hover:text-sky-700"
        )}
        title={panMode ? "Pan mode on" : "Click to enable pan/drag"}
        aria-label={panMode ? "Pan mode on" : "Enable pan"}
      >
        <Hand className="h-4 w-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-sky-200" aria-hidden />
      <ThemeSelect />
    </div>
  );
}
