"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, Share2, Download, Image as ImageIcon, FileCode, Settings } from "lucide-react";

export interface ToolbarProps {
  onSave?: () => void;
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onShare?: () => void;
  onOpenAiSettings?: () => void;
  saveDisabled?: boolean;
}

export function Toolbar({
  onSave,
  onExportSvg,
  onExportPng,
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
          <DropdownMenuItem onClick={onExportSvg} className="gap-2">
            <FileCode className="h-4 w-4" aria-hidden />
            SVG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPng} className="gap-2">
            <ImageIcon className="h-4 w-4" />
            PNG
          </DropdownMenuItem>
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
