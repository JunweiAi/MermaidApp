"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DiagramCanvas } from "@/components/canvas/DiagramCanvas";
import { CanvasTopToolbar } from "@/components/canvas/CanvasTopToolbar";
import { FloatingCodePanel } from "@/components/project/FloatingCodePanel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, Code, Share2, Download, Image as ImageIcon, FileCode, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadMermaidCodeAsMmd } from "@/lib/export-mermaid";

export default function ProjectRenderPage() {
  const params = useParams();
  const id = params.id as string;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [diagram, setDiagram] = useState<{ id: string; title: string; code: string } | null>(null);
  const [code, setCode] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/diagrams/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setDiagram(data);
        setCode(data.code ?? "");
      })
      .catch(() => setDiagram(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const saveCode = useCallback(() => {
    if (diagram && code !== diagram.code) {
      fetch(`/api/diagrams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).then(() => toast({ title: "Saved" })).catch(() => {});
    }
  }, [diagram, code, id, toast]);

  const saveCodeWith = useCallback(
    (newCode: string) => {
      if (!diagram) return;
      fetch(`/api/diagrams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      })
        .then(() => toast({ title: "Saved" }))
        .catch(() => {});
    },
    [diagram, id, toast]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    saveCode();
  }, [saveCode]);

  function handleShare() {
    if (!diagram) return;
    fetch(`/api/diagrams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: true, generate_share_id: true }),
    })
      .then((res) => res.json())
      .then((data) => {
        const url = `${window.location.origin}/share/${data.share_id}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Share link copied" });
      })
      .catch(() => toast({ title: "Share failed", variant: "destructive" }));
  }

  const handleExportPng = useCallback(() => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) {
      toast({ title: "Export failed", variant: "destructive" });
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
        a.download = `${diagram?.title ?? "diagram"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Exported PNG" });
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [diagram?.title, toast]);

  const handleExportSvg = useCallback(() => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) {
      toast({ title: "Export failed", variant: "destructive" });
      return;
    }
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([s], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram?.title ?? "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported SVG" });
  }, [diagram?.title, toast]);

  const handleExportMmd = useCallback(() => {
    if (!downloadMermaidCodeAsMmd(code, diagram?.title ?? "diagram")) {
      toast({ title: "No code to export", variant: "destructive" });
      return;
    }
    toast({ title: "Exported .mmd" });
  }, [code, diagram?.title, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!diagram) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <p className="text-gray-600">Diagram not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#fafafa]">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-primary">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate max-w-[200px] text-gray-900" title={diagram.title}>
            {diagram.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPng} className="gap-2">
                <ImageIcon className="h-4 w-4" aria-hidden />
                PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSvg} className="gap-2">
                <FileCode className="h-4 w-4" aria-hidden />
                SVG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMmd} className="gap-2">
                <FileText className="h-4 w-4" aria-hidden />
                Mermaid code (.mmd)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      <div className="relative flex-1">
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <CanvasTopToolbar />
        </div>

        {!panelOpen && (
          <div className="absolute bottom-4 left-4 z-10">
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => setPanelOpen(true)}
            >
              <Code className="mr-2 h-4 w-4" />
              Edit Code
            </Button>
          </div>
        )}

        {panelOpen && (
          <FloatingCodePanel
            code={code}
            onCodeChange={handleCodeChange}
            onClose={handleClosePanel}
            onBlur={saveCode}
            onAfterCodeGenerated={saveCodeWith}
          />
        )}

        <div ref={canvasRef} className="h-full w-full">
          <DiagramCanvas
            key={id}
            persistViewKey={id}
            code={code}
            showGrid
            showToolbar
            toolbarRef={canvasRef}
            minHeight="100%"
          />
        </div>
      </div>
    </div>
  );
}
