import { FileText, Plus } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { AppDocument } from "@/types/document";

export function RecentDocuments({ documents }: { documents: AppDocument[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent documents</CardTitle>
        <Button href="/dashboard/documents" variant="ghost" size="sm">
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" strokeWidth={1.75} />}
            title="No documents yet"
            description="Upload a PDF or Markdown file to start asking it questions."
            action={
              <Button href="/dashboard/documents?upload=1" size="sm" className="mt-1">
                <Plus className="h-4 w-4" />
                Upload document
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                <span className="text-sm text-text-primary">{doc.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
