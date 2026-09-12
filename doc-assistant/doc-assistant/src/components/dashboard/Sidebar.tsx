"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Settings,
  FileStack,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Chat History", href: "/dashboard/chat-history", icon: MessagesSquare },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
          <FileStack className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-text-primary">
          Docent
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-soft text-brand font-medium"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to site
        </Link>
      </div>
    </div>
  );
}
