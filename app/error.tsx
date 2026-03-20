"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route segment error boundary (Next.js App Router).
 * Resolves dev overlay: "missing required error components".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
        {error.digest ? (
          <span className="mt-2 block font-mono text-xs opacity-70">Digest: {error.digest}</span>
        ) : null}
      </p>
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
