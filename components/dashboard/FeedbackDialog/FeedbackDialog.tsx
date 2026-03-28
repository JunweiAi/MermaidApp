"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { submitFeedback } from "./helpers";
import type { FeedbackDialogProps } from "./interface";

export function FeedbackDialog({ onDataChange }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    const result = await submitFeedback(content);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setContent("");
    setOpen(false);
    onDataChange?.({ success: true });
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      setContent("");
      setError(null);
    }
    setOpen(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-gray-500"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          反馈
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>提交反馈</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Textarea
            placeholder="请描述你遇到的问题或建议..."
            rows={6}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{content.length} / 2000</span>
            {error && (
              <span className="text-sm text-red-500">{error}</span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || content.trim().length < 5}
            >
              {loading ? "提交中..." : "提交反馈"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
