"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Settings2, Trash2, MessageSquare } from "lucide-react";
import { useAiStore } from "@/store/aiStore";
import { useEditorStore } from "@/store/editorStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export interface AIPanelProps {
  onOpenSettings?: () => void;
  /** Live preview while streaming (updates code / canvas; does not persist). */
  onCodePreview?: (code: string) => void;
  /** Called once when a generation turn finishes with the final Mermaid code (e.g. PATCH save). */
  onCodeGenerated?: (code: string) => void;
}

export function AIPanel({ onOpenSettings, onCodePreview, onCodeGenerated }: AIPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const { isLoading, setLoading, apiEndpoint, apiKey, model } = useAiStore();
  const storeSetCode = useEditorStore((s) => s.setCode);
  /** Stream chunks update preview only; final code triggers onCodeGenerated. */
  const previewCode = onCodePreview ?? storeSetCode;
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    if (!apiEndpoint || !apiKey) {
      onOpenSettings?.();
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setStreaming("");

    const conversation = nextHistory.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation,
          api_endpoint: apiEndpoint,
          api_key: apiKey,
          model: model || "gpt-4o-mini",
        }),
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
          setStreaming(full);
          previewCode(full);
        }
      }
      setStreaming(null);
      if (full.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: full },
        ]);
        onCodeGenerated?.(full);
      }
    } catch (e) {
      setStreaming(null);
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "AI generation failed", description: msg, variant: "destructive" });
      // Remove the user message we optimistically added if request failed before assistant
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.role === "user" && last.id === userMsg.id) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    if (isLoading) return;
    setMessages([]);
    setStreaming(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          <span>Conversation</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={handleClear}
          disabled={isLoading || (messages.length === 0 && streaming === null)}
          title="Clear conversation"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-[120px] flex-1 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2"
      >
        {messages.length === 0 && streaming === null && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Describe the diagram in natural language. You can refine it in follow-up messages.
          </p>
        )}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[95%] rounded-lg px-2.5 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background font-mono text-foreground"
                )}
              >
                <div className="mb-0.5 text-[10px] font-sans font-medium uppercase opacity-70">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed">
                    {m.content}
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
                    {m.content}
                  </pre>
                )}
              </div>
            </li>
          ))}
          {streaming !== null && (
            <li className="flex justify-start">
              <div className="max-w-[95%] rounded-lg border border-dashed border-primary/40 bg-background px-2.5 py-2 font-mono text-sm">
                <div className="mb-0.5 text-[10px] font-sans font-medium uppercase text-muted-foreground">
                  Assistant
                </div>
                <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted-foreground">
                  {streaming || "…"}
                </pre>
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="shrink-0 space-y-2">
        <Label htmlFor="ai-input" className="sr-only">
          Message
        </Label>
        <Textarea
          id="ai-input"
          placeholder="e.g. Draw a flowchart with start, decision, and end — then ask to add nodes"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[72px] resize-none"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading && input.trim()) void handleSend();
            }
          }}
        />
        <Button
          className="w-full gap-2"
          onClick={() => void handleSend()}
          disabled={isLoading || !input.trim()}
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? "Generating…" : "Send"}
        </Button>
      </div>

      {(!apiEndpoint || !apiKey) && (
        <p className="shrink-0 text-xs text-muted-foreground">
          Configure API in{" "}
          <button type="button" className="underline" onClick={onOpenSettings}>
            AI Settings
          </button>{" "}
          first.
        </p>
      )}
      {onOpenSettings && (
        <div className="shrink-0 border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Edit AI settings
          </button>
        </div>
      )}
    </div>
  );
}
