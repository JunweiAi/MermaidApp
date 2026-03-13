"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAiStore } from "@/store/aiStore";
import { useToast } from "@/hooks/use-toast";

export interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsDialog({ open, onOpenChange }: AISettingsDialogProps) {
  const { apiEndpoint, apiKey, model, setApiEndpoint, setApiKey, setModel, setSettings } = useAiStore();
  const [endpoint, setEndpoint] = useState(apiEndpoint);
  const [key, setKey] = useState(apiKey);
  const [modelValue, setModelValue] = useState(model);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setEndpoint(apiEndpoint);
      setKey(apiKey);
      setModelValue(model);
    }
  }, [open, apiEndpoint, apiKey, model]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_endpoint: endpoint,
          api_key: key,
          model: modelValue,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setSettings({ apiEndpoint: endpoint, apiKey: key, model: modelValue });
      toast({ title: "AI settings saved" });
      onOpenChange(false);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Configure an OpenAI-compatible API (e.g. DeepSeek, etc.) for Mermaid code generation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">API endpoint</Label>
            <Input
              id="endpoint"
              placeholder="https://api.openai.com/v1"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apikey">API Key</Label>
            <Input
              id="apikey"
              type="password"
              placeholder="sk-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="gpt-4o-mini"
              value={modelValue}
              onChange={(e) => setModelValue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
