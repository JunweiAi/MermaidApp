"use client";

import { useEffect } from "react";

/**
 * Root-level error UI when the root layout fails (Next.js App Router).
 * Must define its own &lt;html&gt; and &lt;body&gt;.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 font-sans antialiased text-foreground">
        <h2 className="text-lg font-semibold">Application error</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error.message || "The app failed to render. Please refresh the page."}
        </p>
        <button
          type="button"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
