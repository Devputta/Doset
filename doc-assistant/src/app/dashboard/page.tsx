"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { StorageCard } from "@/components/dashboard/StorageCard";
import { getAccountSummary, listAllConversations, listDocuments } from "@/lib/documents-client";
import type { AppDocument, ConversationSummary } from "@/types/document";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [summary, setSummary] = useState({
    documentCount: 0,
    conversationCount: 0,
    storageUsedBytes: 0,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([listDocuments(), listAllConversations(), getAccountSummary()]).then(
      ([docsResult, convosResult, summaryResult]) => {
        if (cancelled) return;
        if (docsResult.status === "fulfilled") {
          setDocuments(docsResult.value.slice(0, 5));
        }
        if (convosResult.status === "fulfilled") {
          setConversations(convosResult.value.slice(0, 5));
        }
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <WelcomeCard />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <RecentDocuments documents={documents} />
            <RecentConversations conversations={conversations} />
          </div>
          <div>
            <StorageCard
              documentCount={summary.documentCount}
              conversationCount={summary.conversationCount}
              storageUsedBytes={summary.storageUsedBytes}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
