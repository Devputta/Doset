import { HardDrive, FileText, MessagesSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { formatBytes } from "@/lib/config";

/**
 * There is no actual storage cap in this project — only a per-file size
 * limit (MAX_FILE_SIZE_MB, enforced on upload). An earlier version of this
 * card showed a fake "X of 500 MB" / "X of 20 documents" progress bar; that
 * limit didn't exist anywhere in the backend, so it's gone. This just shows
 * what's actually true.
 */
export function StorageCard({
  documentCount,
  conversationCount,
  storageUsedBytes,
}: {
  documentCount: number;
  conversationCount: number;
  storageUsedBytes: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          <span className="text-sm font-medium text-text-primary">Storage</span>
        </div>

        <div>
          <p className="text-2xl font-semibold text-text-primary">{formatBytes(storageUsedBytes)}</p>
          <p className="text-xs text-text-secondary">used by your uploaded documents</p>
        </div>

        <div className="space-y-2 border-t border-border pt-3 text-xs text-text-secondary">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents
            </span>
            <span className="font-mono text-text-primary">{documentCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessagesSquare className="h-3.5 w-3.5" /> Conversations
            </span>
            <span className="font-mono text-text-primary">{conversationCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
