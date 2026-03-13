import { create } from "zustand";

interface AiState {
  isLoading: boolean;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  setLoading: (loading: boolean) => void;
  setApiEndpoint: (endpoint: string) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setSettings: (settings: { apiEndpoint?: string; apiKey?: string; model?: string }) => void;
}

export const useAiStore = create<AiState>((set) => ({
  isLoading: false,
  apiEndpoint: "",
  apiKey: "",
  model: "gpt-4o-mini",
  setLoading: (isLoading) => set({ isLoading }),
  setApiEndpoint: (apiEndpoint) => set({ apiEndpoint }),
  setApiKey: (apiKey) => set({ apiKey }),
  setModel: (model) => set({ model }),
  setSettings: (settings) =>
    set((s) => ({
      ...s,
      ...(settings.apiEndpoint !== undefined && { apiEndpoint: settings.apiEndpoint }),
      ...(settings.apiKey !== undefined && { apiKey: settings.apiKey }),
      ...(settings.model !== undefined && { model: settings.model }),
    })),
}));
