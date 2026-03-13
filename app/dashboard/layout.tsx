"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
          <span className="text-xl font-bold text-primary">Mermaid</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              Learning Center
            </p>
            <Link
              href="#"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
          </div>
        </nav>
        <div className="border-t border-gray-200 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-600"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-[#fafafa]">{children}</main>
    </div>
  );
}
