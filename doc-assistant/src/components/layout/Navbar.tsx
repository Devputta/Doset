"use client";

import Link from "next/link";
import { FileStack, Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { GithubIcon } from "@/components/icons/GithubIcon";

const GITHUB_URL = "https://github.com/Devputta/Dosent---Document-AI-";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Technology", href: "#technology" },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
            <FileStack className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-text-primary">
            Docent
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {loading ? null : user ? (
            <UserMenu />
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button href="/register" variant="primary" size="sm">
                Get Started
              </Button>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center text-text-primary md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3">
              {loading ? null : user ? (
                <Button
                  href="/dashboard"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    href="/login"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Button>
                  <Button
                    href="/register"
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4" /> Dark mode
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" /> Light mode
                </>
              )}
            </button>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              <GithubIcon className="h-4 w-4" /> View on GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
