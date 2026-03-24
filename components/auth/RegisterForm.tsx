"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  function handleConfirmChange(value: string) {
    setConfirmPassword(value);
    setConfirmError(value && value !== password ? "两次输入的密码不一致" : "");
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setConfirmError(confirmPassword && confirmPassword !== value ? "两次输入的密码不一致" : "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setConfirmError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed up", description: "Check your email to confirm (if enabled)" });
    router.push("/");
    router.refresh();
  }

  return (
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
          onChange={(e) => handlePasswordChange(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => handleConfirmChange(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
        {confirmError && (
          <p className="text-sm text-destructive">{confirmError}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading || !!confirmError}>
        {loading ? "Signing up…" : "Sign up"}
      </Button>
    </form>
  );
}
