import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerStatus } from "@/lib/types";

const LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LEAD: "Lead",
  PROSPECT: "Prospect",
};

const DOT: Record<CustomerStatus, string> = {
  ACTIVE: "bg-emerald-500",
  INACTIVE: "bg-muted-foreground/60",
  LEAD: "bg-sky-500",
  PROSPECT: "bg-amber-500",
};

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: CustomerStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", className)}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", DOT[status])}
      />
      {LABELS[status]}
    </Badge>
  );
}
