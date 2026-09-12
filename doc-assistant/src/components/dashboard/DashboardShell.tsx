"use client";

import { useState, type ReactNode } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useTheme } from "@/context/ThemeContext";
import { UserMenu } from "@/components/auth/UserMenu";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-background shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-5 lg:justify-end">
          <button
            className="flex h-9 w-9 items-center justify-center text-text-primary lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 bg-surface-2/40 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
