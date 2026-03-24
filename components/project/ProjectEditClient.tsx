"use client";

import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { FloatingCodePanel } from "@/components/project/FloatingCodePanel";
import { CanvasTopToolbar } from "@/components/canvas/CanvasTopToolbar";
import { Toolbar } from "@/components/editor/Toolbar";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { AIPanel } from "@/components/ai/AIPanel";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { downloadMermaidCodeAsMmd } from "@/lib/export-mermaid";
import { downloadSvgElementAsPng } from "@/lib/svg-export-png";

export function ProjectEditClient({ projectId }: { projectId: string }) {
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isDirty, code, title, diagramId, loadDiagram, setDirty, setTitle, setCode } = useEditorStore();
  const [codePanelOpen, setCodePanelOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/diagrams/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        loadDiagram({ id: data.id, code: data.code, title: data.title });
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, [projectId, loadDiagram]);

  useEffect(() => {
    setEditTitleValue(title);
  }, [title]);

  // 编辑页加载完成后默认打开代码弹窗，避免初始状态被覆盖
  useEffect(() => {
    if (loaded) setCodePanelOpen(true);
  }, [loaded]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const handleTitleSave = useCallback(async () => {
    setEditingTitle(false);
    const newTitle = editTitleValue.trim() || title;
    if (newTitle === title) return;
    setTitle(newTitle);
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("保存失败");
      toast({ title: "Title updated" });
    } catch {
      setTitle(title);
      toast({ title: "Update failed", variant: "destructive" });
    }
  }, [editTitleValue, title, diagramId, setTitle, toast]);

  const handleSave = useCallback(async () => {
    if (!diagramId) return;
    if (!isDirty) return;
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, code }),
      });
      if (!res.ok) throw new Error("保存失败");
      setDirty(false);
      setHistoryRefresh((k) => k + 1);
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }, [diagramId, title, code, isDirty, setDirty, toast]);

  const handleSaveWithCode = useCallback(
    async (newCode: string) => {
      if (!diagramId) return;
      try {
        const res = await fetch(`/api/diagrams/${diagramId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, code: newCode }),
        });
        if (!res.ok) throw new Error("Save failed");
        setDirty(false);
        setHistoryRefresh((k) => k + 1);
        toast({ title: "Saved" });
      } catch {
        toast({ title: "Save failed", variant: "destructive" });
      }
    },
    [diagramId, title, setDirty, toast]
  );

  const getSvgElement = useCallback(() => {
    return previewContainerRef.current?.querySelector("svg");
  }, []);

  const handleExportSvg = useCallback(() => {
    const svg = getSvgElement();
    if (!svg) {
      toast({ title: "Ensure the diagram renders first", variant: "destructive" });
      return;
    }
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([s], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported SVG" });
  }, [getSvgElement, title, toast]);

  const handleExportPng = useCallback(async () => {
    const el = getSvgElement();
    if (!el || !(el instanceof SVGSVGElement)) {
      toast({ title: "Ensure the diagram renders first", variant: "destructive" });
      return;
    }
    const ok = await downloadSvgElementAsPng(el, title || "diagram");
    if (ok) toast({ title: "Exported PNG" });
    else toast({ title: "PNG export failed", variant: "destructive" });
  }, [getSvgElement, title, toast]);

  const handleExportMmd = useCallback(() => {
    if (!downloadMermaidCodeAsMmd(code, title || "diagram")) {
      toast({ title: "No code to export", variant: "destructive" });
      return;
    }
    toast({ title: "Exported .mmd" });
  }, [code, title, toast]);

  const handleShare = useCallback(async () => {
    if (!diagramId) return;
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: true, generate_share_id: true }),
      });
      if (!res.ok) throw new Error("分享失败");
      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.share_id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share link copied to clipboard" });
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  }, [diagramId, toast]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#fafafa]">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-primary">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") {
                  setEditTitleValue(title);
                  setEditingTitle(false);
                }
              }}
              className="h-8 w-[180px] text-sm font-medium"
            />
          ) : (
            <button
              type="button"
              className="min-w-0 max-w-[180px] cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingTitle(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditingTitle(true);
                }
              }}
              title="Double-click to edit name"
            >
              {title}
            </button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/project/${projectId}`)}>
          View
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex min-h-0 w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
          <Tabs defaultValue="history" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full rounded-none border-b px-2">
              <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-0 flex-1 overflow-auto p-2">
              <HistoryPanel refreshTrigger={historyRefresh} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-2">
              <AIPanel
                onOpenSettings={() => setAiSettingsOpen(true)}
                onCodePreview={setCode}
                onCodeGenerated={handleSaveWithCode}
              />
            </TabsContent>
          </Tabs>
        </aside>
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <Toolbar
            onSave={handleSave}
            onExportSvg={handleExportSvg}
            onExportPng={handleExportPng}
            onExportMmd={handleExportMmd}
            onShare={handleShare}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
            saveDisabled={!isDirty}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-[30px]">
            <div ref={previewContainerRef} className="relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
                <CanvasTopToolbar />
              </div>
              <DiagramCanvas
                key={projectId}
                persistViewKey={projectId}
                code={code}
                showGrid
                showToolbar
                minHeight="100%"
              />
            </div>

            {codePanelOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center px-4 py-4">
                <div className="flex h-[85vh] max-h-full w-full max-w-[520px] flex-col shadow-lg">
                  <FloatingCodePanel
                    code={code}
                    onCodeChange={setCode}
                    onClose={() => setCodePanelOpen(false)}
                    onBlur={handleSave}
                    onAfterCodeGenerated={handleSaveWithCode}
                    variant="fill"
                  />
                </div>
              </div>
            )}

            {!codePanelOpen && (
              <div className="absolute bottom-[38px] left-6 z-10">
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setCodePanelOpen(true)}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Code
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </div>
  );
}
