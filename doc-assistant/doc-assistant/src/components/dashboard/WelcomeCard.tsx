"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function WelcomeCard() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl text-text-primary">
          Welcome back{user ? `, ${user.username}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Upload a document to start asking questions grounded in its content.
        </p>
      </div>
      <Button href="/dashboard/documents?upload=1" size="md">
        <Plus className="h-4 w-4" />
        Upload document
      </Button>
    </div>
  );
}
