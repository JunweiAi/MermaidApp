"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAiStore } from "@/store/aiStore";
import { loadAiLocalSettings } from "@/lib/ai-local-settings";

/**
 * Loads AI settings from localStorage for the current user (per-account).
 * Falls back to GET /api/ai/settings for endpoint + model only (legacy / migration).
 */
export function AiSettingsHydrator() {
  const setSettings = useAiStore((s) => s.setSettings);

  useEffect(() => {
    const supabase = createClient();

    async function hydrateForUser(userId: string | undefined) {
      if (!userId) {
        setSettings({ apiEndpoint: "", apiKey: "", model: "gpt-4o-mini" });
        return;
      }

      const local = loadAiLocalSettings(userId);
      if (local && (local.apiEndpoint || local.apiKey)) {
        setSettings({
          apiEndpoint: local.apiEndpoint,
          apiKey: local.apiKey,
          model: local.model || "gpt-4o-mini",
        });
        return;
      }

      try {
        const res = await fetch("/api/ai/settings");
        if (res.ok) {
          const data = (await res.json()) as {
            apiEndpoint?: string;
            model?: string;
          };
          setSettings({
            apiEndpoint: data.apiEndpoint ?? "",
            apiKey: "",
            model: data.model ?? "gpt-4o-mini",
          });
        }
      } catch {
        setSettings({ apiEndpoint: "", apiKey: "", model: "gpt-4o-mini" });
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      void hydrateForUser(user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateForUser(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [setSettings]);

  return null;
}
