"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { FeedbackDialog } from "@/components/dashboard/FeedbackDialog";
import { GitBranch } from "lucide-react";

const defaultCode = `flowchart LR
  A[开始] --> B{判断}
  B -->|是| C[执行]
  B -->|否| D[结束]
  C --> D`;

export interface DiagramItem {
  id: string;
  title: string;
  code: string;
  updated_at: string;
}

const MAX_DIAGRAMS = 50;

export default function DashboardPage() {
  const router = useRouter();
  const [diagrams, setDiagrams] = useState<DiagramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/diagrams")
      .then((res) => res.ok ? res.json() : { diagrams: [] })
      .then((data) => setDiagrams(data.diagrams ?? []))
      .catch(() => setDiagrams([]))
      .finally(() => setLoading(false));
  }, []);

  const isAtLimit = diagrams.length >= MAX_DIAGRAMS;

  async function handleNewDiagram() {
    if (isAtLimit) return;
    setCreateError(null);
    const res = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", code: defaultCode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error ?? "创建失败");
      return;
    }
    const data = await res.json();
    router.push(`/project/${data.id}/edit`);
  }

  function refreshList() {
    setLoading(true);
    fetch("/api/diagrams")
      .then((res) => res.ok ? res.json() : { diagrams: [] })
      .then((data) => setDiagrams(data.diagrams ?? []))
      .finally(() => setLoading(false));
  }

  /** Optimistic title update after rename (no full list reload). */
  function patchDiagramTitle(id: string, newTitle: string) {
    setDiagrams((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Recent</h1>
        <div className="flex gap-2">
          <FeedbackDialog />
          <span className="text-sm text-gray-400 mr-2">
          {diagrams.length} / {MAX_DIAGRAMS}
        </span>
        <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleNewDiagram}
            disabled={isAtLimit}
            title={isAtLimit ? `已达最大数量 ${MAX_DIAGRAMS} 个` : undefined}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            New diagram
          </Button>
        </div>
      </div>
      {createError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {createError}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-500">Loading…</div>
      ) : diagrams.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
          {`No diagrams yet. Click "New diagram" to start`}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {diagrams.map((item) => (
            <ProjectCard
              key={item.id}
              item={item}
              onRefresh={refreshList}
              onDiagramTitleUpdate={patchDiagramTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
