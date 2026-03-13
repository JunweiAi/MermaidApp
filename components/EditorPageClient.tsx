"use client";

import { MermaidEditor } from "@/components/editor/MermaidEditor";
import { MermaidPreview } from "@/components/editor/MermaidPreview";
import { Toolbar } from "@/components/editor/Toolbar";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { AIPanel } from "@/components/ai/AIPanel";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useAiStore } from "@/store/aiStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun } from "lucide-react";

export function EditorPageClient() {
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [dark, setDark] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  }
  const router = useRouter();
  const { isDirty, code, title, diagramId, loadDiagram, setDirty, setTitle, setCode } = useEditorStore();
  const { setSettings: setAiSettings } = useAiStore();
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => setAiSettings({ apiEndpoint: data.apiEndpoint ?? "", model: data.model ?? "gpt-4o-mini" }))
      .catch(() => {});
  }, [setAiSettings]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    try {
      if (diagramId) {
        const res = await fetch(`/api/diagrams/${diagramId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, code }),
        });
        if (!res.ok) throw new Error("Save failed");
        setDirty(false);
        setHistoryRefresh((k) => k + 1);
        toast({ title: "Saved" });
      } else {
        const res = await fetch("/api/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, code }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        loadDiagram({ id: data.id, code: data.code, title: data.title });
        setDirty(false);
        setHistoryRefresh((k) => k + 1);
        toast({ title: "Saved" });
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }, [diagramId, title, code, isDirty, setDirty, loadDiagram, toast]);

  const handleSaveWithCode = useCallback(
    async (newCode: string) => {
      try {
        if (diagramId) {
          const res = await fetch(`/api/diagrams/${diagramId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, code: newCode }),
          });
          if (!res.ok) throw new Error("Save failed");
          setDirty(false);
          setHistoryRefresh((k) => k + 1);
          toast({ title: "Saved" });
        } else {
          const res = await fetch("/api/diagrams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, code: newCode }),
          });
          if (!res.ok) throw new Error("Save failed");
          const data = await res.json();
          loadDiagram({ id: data.id, code: data.code, title: data.title });
          setDirty(false);
          setHistoryRefresh((k) => k + 1);
          toast({ title: "Saved" });
        }
      } catch {
        toast({ title: "Save failed", variant: "destructive" });
      }
    },
    [diagramId, title, setDirty, loadDiagram, toast]
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

  const handleExportPng = useCallback(() => {
    const svg = getSvgElement();
    if (!svg) {
      toast({ title: "Ensure the diagram renders first", variant: "destructive" });
      return;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bbox = svg.getBBox();
    canvas.width = bbox.width + 40;
    canvas.height = bbox.height + 40;
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title || "diagram"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Exported PNG" });
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [getSvgElement, title, toast]);

  const handleShare = useCallback(async () => {
    try {
      let id = diagramId;
      if (!id) {
        const createRes = await fetch("/api/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, code }),
        });
        if (!createRes.ok) throw new Error("Save failed");
        const created = await createRes.json();
        loadDiagram({ id: created.id, code: created.code, title: created.title });
        id = created.id;
      }
      const res = await fetch(`/api/diagrams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: true, generate_share_id: true }),
      });
      if (!res.ok) throw new Error("Share failed");
      const data = await res.json();
      const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${data.share_id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share link copied to clipboard" });
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  }, [diagramId, title, code, loadDiagram, toast]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">MermaidApp</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Switch to light" : "Switch to dark"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col border-r">
          <Tabs defaultValue="history" className="flex flex-1 flex-col">
            <TabsList className="w-full rounded-none border-b px-2">
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">
                AI
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-0 flex-1 overflow-auto p-2">
              <HistoryPanel refreshTrigger={historyRefresh} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0 flex-1 overflow-auto p-2">
              <AIPanel
                onOpenSettings={() => setAiSettingsOpen(true)}
                onCodeGenerated={(newCode) => {
                  setCode(newCode);
                  handleSaveWithCode(newCode);
                }}
              />
            </TabsContent>
          </Tabs>
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            onSave={handleSave}
            onExportSvg={handleExportSvg}
            onExportPng={handleExportPng}
            onShare={handleShare}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
            saveDisabled={!isDirty}
          />
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
            <div className="min-h-0 overflow-hidden rounded-md border">
              <MermaidEditor onBlur={handleSave} />
            </div>
            <div ref={previewContainerRef} className="min-h-0 overflow-hidden rounded-md border">
              <MermaidPreview />
            </div>
          </div>
        </main>
      </div>
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </div>
  );
}
