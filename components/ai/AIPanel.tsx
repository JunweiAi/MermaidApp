"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useAiStore } from "@/store/aiStore";
import { useEditorStore } from "@/store/editorStore";
import { useToast } from "@/hooks/use-toast";

export interface AIPanelProps {
  onOpenSettings?: () => void;
  /** When provided (e.g. on render page floating panel), used instead of editorStore */
  onCodeGenerated?: (code: string) => void;
}

export function AIPanel({ onOpenSettings, onCodeGenerated }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const { isLoading, setLoading, apiEndpoint } = useAiStore();
  const storeSetCode = useEditorStore((s) => s.setCode);
  const setCode = onCodeGenerated ?? storeSetCode;
  const { toast } = useToast();

  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!apiEndpoint) {
      onOpenSettings?.();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setCode(full);
        }
      }
      if (full) setPrompt("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "AI generation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Describe the diagram you want in natural language</Label>
      <Textarea
        placeholder="e.g. Draw a flowchart with start, decision, action, and end nodes"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="resize-none"
        disabled={isLoading}
      />
      <Button
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim()}
      >
        <Sparkles className="h-4 w-4" />
        {isLoading ? "Generating…" : "Generate"}
      </Button>
      {!apiEndpoint && (
        <p className="text-xs text-muted-foreground">
          Configure API in <button type="button" className="underline" onClick={onOpenSettings}>AI Settings</button> first.
        </p>
      )}
    </div>
  );
}
