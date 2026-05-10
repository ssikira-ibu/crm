"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { CustomerHeader } from "@/components/customers/detail/header";
import { ActivityFeed } from "@/components/customers/detail/activity-feed";
import { SidebarContacts } from "@/components/customers/detail/sidebar-contacts";
import { SidebarDeals } from "@/components/customers/detail/sidebar-deals";
import { SidebarTasks } from "@/components/customers/detail/sidebar-tasks";
import { getCompany } from "@/app/actions/companies";
import { useRecentCompanies } from "@/hooks/use-recent-companies";
import { describeError } from "@/lib/errors";
import type { Company, CompanyWithRelations } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { trackCompany } = useRecentCompanies();

  const [data, setData] = useState<CompanyWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCompany(id);
        if (!cancelled) {
          setData(res.data);
          trackCompany(res.data.id, res.data.name ?? "Untitled");
        }
      } catch (err) {
        if (cancelled) return;
        const msg = describeError(err);
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, reloadKey, router, trackCompany]);

  function handleHeaderUpdated(next: Company) {
    setData((prev) => (prev ? { ...prev, ...next } : prev));
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={FileWarning}
          title="Company unavailable"
          description={error ?? "We couldn't load this company."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CustomerHeader customer={data} onUpdated={handleHeaderUpdated} onChanged={refresh} />

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Activity feed — main content */}
        <div className="flex-1 overflow-y-auto">
          <ActivityFeed
            companyId={data.id}
            activities={data.activities}
            notes={data.notes}
            reloadKey={reloadKey}
            onChanged={refresh}
          />
        </div>

        {/* Sidebar — structured data */}
        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto">
          <SidebarContacts companyId={data.id} items={data.contacts} onChanged={refresh} />
          <SidebarDeals companyId={data.id} items={data.deals} onChanged={refresh} />
          <SidebarTasks companyId={data.id} items={data.tasks} onChanged={refresh} />
        </aside>
      </div>
    </div>
  );
}
