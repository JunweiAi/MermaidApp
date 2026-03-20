"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { useCanvasStore, THEME_OPTIONS } from "@/store/canvasStore";

export function ThemeSelect() {
  const { theme, setTheme } = useCanvasStore();

  const currentLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? "Redux";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {THEME_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setTheme(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
