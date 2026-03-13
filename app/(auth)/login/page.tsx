import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/register" className="text-primary underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
