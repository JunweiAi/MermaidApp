"use client";

import { useCallback, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, FileCode, Sparkles } from "lucide-react";
import { AIPanel } from "@/components/ai/AIPanel";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { cn } from "@/lib/utils";

export interface FloatingCodePanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  onClose: () => void;
  /** Called when the code editor loses focus (e.g. for auto-save) */
  onBlur?: () => void;
  /** Called after AI generates code (e.g. for auto-save) */
  onAfterCodeGenerated?: (code: string) => void;
  /** 当为 "fill" 时由父容器定位，高度填满父容器（用于编辑页弹窗） */
  variant?: "float" | "fill";
}

export function FloatingCodePanel({
  code,
  onCodeChange,
  onClose,
  onBlur,
  onAfterCodeGenerated,
  variant = "float",
}: FloatingCodePanelProps) {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("code");

  const handleEditorChange = useCallback(
    (value: string) => {
      if (autoUpdate) onCodeChange(value);
      else onCodeChange(value);
    },
    [autoUpdate, onCodeChange]
  );

  const handleCodeGenerated = useCallback(
    (code: string) => {
      onCodeChange(code);
      onAfterCodeGenerated?.(code);
    },
    [onCodeChange, onAfterCodeGenerated]
  );

  const isFill = variant === "fill";

  return (
    <>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-t-xl border border-gray-200 border-b-0 bg-gray-50 shadow-lg",
          isFill
            ? "z-20 h-full w-full"
            : "absolute left-4 top-16 z-20 w-[min(450px,calc(100vw-2rem))] h-[80vh]"
        )}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
            <TabsList className="h-9 justify-start gap-0 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="code"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <FileCode className="mr-1.5 h-4 w-4" />
                Code
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Use AI
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={autoUpdate}
                  onChange={(e) => setAutoUpdate(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Auto-Update
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <TabsContent value="code" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-full min-h-[200px]" onBlur={() => onBlur?.()}>
              <CodeMirror
                value={code}
                height="100%"
                minHeight="240px"
                onChange={handleEditorChange}
                className={cn(
                  "h-full w-full text-sm [&_.cm-editor]:outline-none [&_.cm-scroller]:font-mono [&_.cm-scroller]:min-h-[240px]"
                )}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  bracketMatching: true,
                  closeBrackets: true,
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="ai" className="mt-0 flex-1 overflow-auto p-3 data-[state=inactive]:hidden">
            <AIPanel
              onOpenSettings={() => setAiSettingsOpen(true)}
              onCodeGenerated={handleCodeGenerated}
            />
          </TabsContent>
        </Tabs>
      </div>
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </>
  );
}
