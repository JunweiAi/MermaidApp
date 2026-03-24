"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  /** Full-screen overlay caption; switches after sign-in before dashboard navigation */
  const [loadingHint, setLoadingHint] = useState("Signing in…");
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingHint("Signing in…");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Signed in" });
      setLoadingHint("Loading dashboard…");
      await router.push("/dashboard");
      router.refresh();
    } catch {
      toast({ title: "Navigation failed", description: "Please try again.", variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-background px-10 py-8 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">{loadingHint}</p>
          </div>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
    </>
  );
}
