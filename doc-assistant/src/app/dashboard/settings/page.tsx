"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User, Palette, ShieldCheck, Database, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { getPreferences, setPreferences } from "@/lib/preferences";
import { formatBytes } from "@/lib/config";
import { getAccountSummary } from "@/lib/documents-client";
import { cn } from "@/lib/utils";

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-muted">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40";
const labelClass = "text-xs font-medium text-text-secondary";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState(user?.username ?? "");
  const [savingUsername, setSavingUsername] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const [summary, setSummary] = useState<{
    documentCount: number;
    conversationCount: number;
    storageUsedBytes: number;
    statusBreakdown: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    setUsername(user?.username ?? "");
  }, [user?.username]);

  useEffect(() => {
    setShowSuggestions(getPreferences().showSuggestedQuestions);
  }, []);

  useEffect(() => {
    getAccountSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const handleUsernameSave = async () => {
    if (!username.trim() || username === user?.username) return;
    setSavingUsername(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.fieldErrors?.username?.[0] ?? body?.message ?? "Could not update username");
      }
      await refresh();
      toast({ title: "Username updated", variant: "success" });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePreferenceToggle = () => {
    const next = setPreferences({ showSuggestedQuestions: !showSuggestions });
    setShowSuggestions(next.showSuggestedQuestions);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "error" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          body?.fieldErrors?.currentPassword?.[0] ?? body?.fieldErrors?.newPassword?.[0] ?? body?.message ?? "Could not change password"
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", variant: "success" });
    } catch (err) {
      toast({ title: "Change failed", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out other sessions");
      toast({ title: "Signed out everywhere", description: "Please sign in again.", variant: "success" });
      await logout();
      router.push("/login");
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your profile, preferences, security, and storage.
          </p>
        </div>

        <SettingsSection icon={<User className="h-4 w-4" />} title="Profile">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className={cn(inputClass, "mt-1")} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input value={user?.email ?? ""} disabled className={cn(inputClass, "mt-1 opacity-60")} />
            </div>
          </div>
          <Button size="sm" onClick={handleUsernameSave} disabled={savingUsername || username === user?.username}>
            {savingUsername ? "Saving…" : "Save changes"}
          </Button>
        </SettingsSection>

        <SettingsSection icon={<Palette className="h-4 w-4" />} title="Preferences">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Theme</p>
              <p className="text-xs text-text-secondary">Currently {theme === "dark" ? "dark" : "light"} mode.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={toggleTheme}>
              Switch to {theme === "dark" ? "light" : "dark"}
            </Button>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm text-text-primary">Default chat behavior</p>
              <p className="text-xs text-text-secondary">Show suggested questions when opening a new chat.</p>
            </div>
            <button
              onClick={handlePreferenceToggle}
              role="switch"
              aria-checked={showSuggestions}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                showSuggestions ? "bg-brand" : "bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  showSuggestions ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </SettingsSection>

        <SettingsSection icon={<ShieldCheck className="h-4 w-4" />} title="Security">
          <div className="space-y-3">
            <p className={labelClass}>Change password</p>
            <div className="grid gap-2">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm text-text-primary">Logout all sessions</p>
              <p className="text-xs text-text-secondary">Signs this device and every other one out immediately.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleLogoutAll} disabled={loggingOutAll}>
              {loggingOutAll ? "Signing out…" : "Logout everywhere"}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Database className="h-4 w-4" />}
          title="Storage"
          description="An approximate view of what's stored under your account."
        >
          {summary === null ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Documents" value={summary.documentCount} />
              <Stat label="Conversations" value={summary.conversationCount} />
              <Stat label="Storage used" value={formatBytes(summary.storageUsedBytes)} />
              <Stat label="Processing" value={summary.statusBreakdown["processing"] ?? 0} />
            </div>
          )}
        </SettingsSection>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <p className="text-lg font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
