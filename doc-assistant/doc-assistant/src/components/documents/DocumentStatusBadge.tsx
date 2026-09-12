import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { DocumentStatus } from "@/types/document";

const config: Record<DocumentStatus, { label: string; tone: "neutral" | "brand" | "success" | "warning" }> = {
  uploading: { label: "Uploading", tone: "neutral" },
  uploaded: { label: "Uploaded", tone: "neutral" },
  processing: { label: "Processing", tone: "brand" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "warning" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { label, tone } = config[status];
  return (
    <Badge tone={tone}>
      {(status === "processing" || status === "uploading") && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {label}
    </Badge>
  );
}
