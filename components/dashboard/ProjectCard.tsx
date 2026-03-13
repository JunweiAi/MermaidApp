"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, ExternalLink, Share2, Pencil, Copy, Maximize, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { useToast } from "@/hooks/use-toast";
import type { DiagramItem } from "@/app/dashboard/page";

mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });

export function ProjectCard({
  item,
  onRefresh,
}: {
  item: DiagramItem;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbSvg, setThumbSvg] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);

  useEffect(() => {
    setEditTitle(item.title);
  }, [item.title]);

  useEffect(() => {
    if (!item.code.trim() || !thumbRef.current) return;
    const id = `thumb-${item.id}-${Date.now()}`;
    mermaid
      .render(id, item.code)
      .then(({ svg }) => setThumbSvg(svg))
      .catch(() => setThumbSvg(null));
  }, [item.id, item.code]);

  async function handleShare() {
    try {
      const res = await fetch(`/api/diagrams/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: true, generate_share_id: true }),
      });
      if (!res.ok) throw new Error("Share failed");
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.share_id}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Share link copied" });
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  }

  async function handleEditDetails() {
    setEditOpen(true);
  }

  async function saveEditTitle() {
    const res = await fetch(`/api/diagrams/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    if (!res.ok) return;
    setEditOpen(false);
    onRefresh();
    toast({ title: "Updated" });
  }

  async function handleDuplicate() {
    const res = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${item.title} (copy)`, code: item.code }),
    });
    if (!res.ok) return;
    const data = await res.json();
    onRefresh();
    router.push(`/project/${data.id}/edit`);
  }

  function handleFullscreen() {
    window.open(`/project/${item.id}`, "_blank");
  }

  async function handleDelete() {
    if (!confirm("Delete this diagram?")) return;
    const res = await fetch(`/api/diagrams/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onRefresh();
    toast({ title: "Deleted" });
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div
          ref={thumbRef}
          className="flex h-28 items-center justify-center overflow-hidden bg-gray-50"
        >
          {thumbSvg ? (
            <div
              className="scale-[0.25] origin-center [&_svg]:max-w-none"
              dangerouslySetInnerHTML={{ __html: thumbSvg }}
            />
          ) : (
            <span className="text-xs text-gray-400">Preview</span>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3">
          <p className="truncate text-sm font-medium text-gray-900" title={item.title}>
            {item.title}
          </p>
          <p className="text-xs text-gray-500">{formatRelativeTime(item.updated_at)}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => router.push(`/project/${item.id}`)}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditDetails}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit diagram details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFullscreen}>
                  <Maximize className="mr-2 h-4 w-4" />
                  Fullscreen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete diagram
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit diagram details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditTitle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
