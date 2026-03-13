import { create } from "zustand";

interface EditorState {
  code: string;
  diagramId: string | null;
  title: string;
  isDirty: boolean;
  setCode: (code: string) => void;
  setDiagramId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDirty: (dirty: boolean) => void;
  loadDiagram: (params: { id: string; code: string; title: string }) => void;
  reset: () => void;
}

const defaultCode = `flowchart LR
  A[开始] --> B{判断}
  B -->|是| C[执行]
  B -->|否| D[结束]
  C --> D`;

export const useEditorStore = create<EditorState>((set) => ({
  code: defaultCode,
  diagramId: null,
  title: "Untitled",
  isDirty: false,
  setCode: (code) => set({ code, isDirty: true }),
  setDiagramId: (diagramId) => set({ diagramId }),
  setTitle: (title) => set({ title }),
  setDirty: (isDirty) => set({ isDirty }),
  loadDiagram: ({ id, code, title }) =>
    set({ diagramId: id, code, title, isDirty: false }),
  reset: () =>
    set({
      code: defaultCode,
      diagramId: null,
      title: "Untitled",
      isDirty: false,
    }),
}));
