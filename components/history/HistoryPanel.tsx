"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiagramItem {
  id: string;
  title: string;
  code: string;
  updated_at: string;
}

export interface HistoryPanelProps {
  initialData?: DiagramItem[];
  onLoadDiagram?: (item: DiagramItem) => void;
  refreshTrigger?: number;
}

export function HistoryPanel({
  initialData = [],
  onLoadDiagram,
  refreshTrigger = 0,
}: HistoryPanelProps) {
  const [items, setItems] = useState<DiagramItem[]>(initialData);
  const [loading, setLoading] = useState(true);
  const { loadDiagram, diagramId, title: storeTitle } = useEditorStore();

  useEffect(() => {
    async function fetchList() {
      setLoading(true);
      try {
        const res = await fetch("/api/diagrams");
        if (res.ok) {
          const data = await res.json();
          setItems(data.diagrams ?? []);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchList();
  }, [refreshTrigger]);

  const handleSelect = (item: DiagramItem) => {
    loadDiagram({ id: item.id, code: item.code, title: item.title });
    onLoadDiagram?.(item);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No diagrams yet. They will appear here after you save
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto w-full justify-start gap-2 px-2 py-2 font-normal",
              diagramId === item.id && "bg-accent"
            )}
            onClick={() => handleSelect(item)}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {diagramId === item.id ? storeTitle : item.title}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
