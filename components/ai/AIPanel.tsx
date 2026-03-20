"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Settings2, Trash2, MessageSquare, ImagePlus, X } from "lucide-react";
import { useAiStore } from "@/store/aiStore";
import { useEditorStore } from "@/store/editorStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildUserApiContent } from "@/lib/ai/build-user-content";
import { compressImageDataUrlIfNeeded } from "@/lib/compress-image-data-url";

export type ChatUserMessage = {
  id: string;
  role: "user";
  text: string;
  images?: string[];
};

export type ChatAssistantMessage = {
  id: string;
  role: "assistant";
  content: string;
};

export type ChatMessage = ChatUserMessage | ChatAssistantMessage;

function conversationForApi(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.role === "assistant") {
      return { role: "assistant" as const, content: m.content };
    }
    return {
      role: "user" as const,
      content: buildUserApiContent(m.text, m.images ?? []),
    };
  });
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_MESSAGE = 4;

export interface AIPanelProps {
  onOpenSettings?: () => void;
  onCodePreview?: (code: string) => void;
  onCodeGenerated?: (code: string) => void;
}

export function AIPanel({ onOpenSettings, onCodePreview, onCodeGenerated }: AIPanelProps) {
  const [input, setInput] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const { isLoading, setLoading, apiEndpoint, apiKey, model } = useAiStore();
  const storeSetCode = useEditorStore((s) => s.setCode);
  const previewCode = onCodePreview ?? storeSetCode;
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const readFileAsDataUrl = useCallback((file: File): Promise<string | null> => {
    if (file.size > MAX_BYTES) {
      toast({ title: "Image too large", description: "Max 5MB per image", variant: "destructive" });
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }, [toast]);

  const handlePasteImages = useCallback(
    async (files: File[]) => {
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        const raw = await readFileAsDataUrl(f);
        if (!raw?.startsWith("data:image/")) continue;
        const url = await compressImageDataUrlIfNeeded(raw);
        setPastedImages((prev) => {
          if (prev.length >= MAX_IMAGES_PER_MESSAGE) return prev;
          return [...prev, url];
        });
      }
    },
    [readFileAsDataUrl]
  );

  async function handleSend() {
    const text = input.trim();
    const imgs = pastedImages;
    if (!text && imgs.length === 0) return;
    if (!apiEndpoint || !apiKey) {
      onOpenSettings?.();
      return;
    }

    const draftText = input;
    const draftImages = [...pastedImages];

    const userMsg: ChatUserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      images: imgs.length ? imgs : undefined,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setPastedImages([]);
    setLoading(true);
    setStreaming("");

    const conversation = conversationForApi(nextHistory);

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
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.role === "user" && last.id === userMsg.id) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setInput(draftText);
      setPastedImages(draftImages);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    if (isLoading) return;
    setMessages([]);
    setStreaming(null);
    setPastedImages([]);
  }

  const canSend = (input.trim().length > 0 || pastedImages.length > 0) && !isLoading;

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
          disabled={isLoading || (messages.length === 0 && streaming === null && pastedImages.length === 0)}
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
            Describe the diagram or paste screenshots (Ctrl+V). Refine in follow-up messages.
          </p>
        )}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
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
                  <div className="space-y-2">
                    {m.images && m.images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.images.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="max-h-24 max-w-[140px] rounded border border-white/30 object-contain"
                          />
                        ))}
                      </div>
                    )}
                    {m.text ? (
                      <div className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed">
                        {m.text}
                      </div>
                    ) : m.images?.length ? (
                      <span className="text-[11px] opacity-80">(image only)</span>
                    ) : null}
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
        {pastedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-border/80 bg-muted/30 p-2">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImagePlus className="h-3.5 w-3.5" />
                Attached ({pastedImages.length}/{MAX_IMAGES_PER_MESSAGE})
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => setPastedImages([])}
              >
                Remove all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pastedImages.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-16 w-16 rounded border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow border"
                    onClick={() => setPastedImages((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <Label htmlFor="ai-input" className="sr-only">
          Message
        </Label>
        <Textarea
          id="ai-input"
          placeholder="Type a message or paste images (Ctrl+V)…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[72px] resize-none"
          disabled={isLoading}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
              f.type.startsWith("image/")
            );
            if (files.length === 0) {
              const items = e.clipboardData?.items;
              if (!items) return;
              const fromItems: File[] = [];
              for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.kind === "file" && it.type.startsWith("image/")) {
                  const f = it.getAsFile();
                  if (f) fromItems.push(f);
                }
              }
              if (fromItems.length === 0) return;
              e.preventDefault();
              void handlePasteImages(fromItems);
              return;
            }
            e.preventDefault();
            void handlePasteImages(files);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) void handleSend();
            }
          }}
        />
        <Button className="w-full gap-2" onClick={() => void handleSend()} disabled={!canSend}>
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
          first. Vision-capable models (e.g. gpt-4o) work best with images.
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
