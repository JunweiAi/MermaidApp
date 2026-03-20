"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, Share2, Download, Image as ImageIcon, FileCode, FileText, Settings } from "lucide-react";

export interface ToolbarProps {
  onSave?: () => void;
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onExportMmd?: () => void;
  onShare?: () => void;
  onOpenAiSettings?: () => void;
  saveDisabled?: boolean;
}

export function Toolbar({
  onSave,
  onExportSvg,
  onExportPng,
  onExportMmd,
  onShare,
  onOpenAiSettings,
  saveDisabled,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onSave}
        disabled={saveDisabled}
        className="gap-2"
      >
        <Save className="h-4 w-4" />
        Save
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onExportPng} className="gap-2">
            <ImageIcon className="h-4 w-4" aria-hidden />
            PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportSvg} className="gap-2">
            <FileCode className="h-4 w-4" aria-hidden />
            SVG
          </DropdownMenuItem>
          {onExportMmd ? (
            <DropdownMenuItem onClick={onExportMmd} className="gap-2">
              <FileText className="h-4 w-4" aria-hidden />
              Mermaid code (.mmd)
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="outline" onClick={onShare} className="gap-2">
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <div className="ml-auto">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenAiSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          AI Settings
        </Button>
      </div>
    </div>
  );
}
