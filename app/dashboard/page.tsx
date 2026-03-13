"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
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

export default function DashboardPage() {
  const router = useRouter();
  const [diagrams, setDiagrams] = useState<DiagramItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/diagrams")
      .then((res) => res.ok ? res.json() : { diagrams: [] })
      .then((data) => setDiagrams(data.diagrams ?? []))
      .catch(() => setDiagrams([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleNewDiagram() {
    const res = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", code: defaultCode }),
    });
    if (!res.ok) return;
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

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Recent</h1>
        <div className="flex gap-2">
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleNewDiagram}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            New diagram
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16 text-gray-500">Loading…</div>
      ) : diagrams.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
          No diagrams yet. Click "New diagram" to start
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {diagrams.map((item) => (
            <ProjectCard
              key={item.id}
              item={item}
              onRefresh={refreshList}
            />
          ))}
        </div>
      )}
    </div>
  );
}
