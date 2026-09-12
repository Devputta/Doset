"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
          <User className="h-3.5 w-3.5" />
        </span>
        <span className="hidden font-medium text-text-primary sm:inline">
          {user.username}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-surface py-1 shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">{user.username}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
