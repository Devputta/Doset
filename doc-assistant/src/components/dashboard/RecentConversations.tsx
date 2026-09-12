import { MessagesSquare } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { ConversationSummary } from "@/types/document";

export function RecentConversations({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent conversations</CardTitle>
        <Button href="/dashboard/chat-history" variant="ghost" size="sm">
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" strokeWidth={1.75} />}
            title="No conversations yet"
            description="Once you upload a document, your questions and answers will show up here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((c) => (
              <li key={c.id} className="py-3">
                <p className="text-sm font-medium text-text-primary">
                  {c.title ?? c.documentTitle}
                </p>
                <p className="truncate text-xs text-text-secondary">{c.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
