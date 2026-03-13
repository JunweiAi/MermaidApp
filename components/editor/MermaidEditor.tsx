"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { useEditorStore } from "@/store/editorStore";

export interface MermaidEditorProps {
  /** Called when the editor loses focus (e.g. for auto-save) */
  onBlur?: () => void;
}

export function MermaidEditor({ onBlur }: MermaidEditorProps) {
  const { code, setCode } = useEditorStore();

  const onChange = useCallback(
    (value: string) => setCode(value),
    [setCode]
  );

  return (
    <div className="h-full w-full" onBlur={() => onBlur?.()}>
      <CodeMirror
      value={code}
      height="100%"
      minHeight="200px"
      onChange={onChange}
      className="h-full w-full text-sm [&_.cm-editor]:outline-none [&_.cm-scroller]:font-mono"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
      }}
    />
    </div>
  );
}
