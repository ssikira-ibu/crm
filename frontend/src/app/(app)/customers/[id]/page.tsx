"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { CustomerHeader } from "@/components/customers/detail/header";
import { ContactsTab } from "@/components/customers/detail/contacts-tab";
import { TasksTab } from "@/components/customers/detail/tasks-tab";
import { DealsTab } from "@/components/customers/detail/deals-tab";
import { TimelineTab } from "@/components/customers/detail/timeline-tab";
import { UnifiedActivityTab } from "@/components/customers/detail/unified-activity-tab";
import { getCompany } from "@/app/actions/companies";
import { useRecentCompanies } from "@/hooks/use-recent-companies";
import { describeError } from "@/lib/errors";
import type { Company, CompanyWithRelations } from "@/lib/types";

function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
      {count}
    </Badge>
  );
}

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
    <div className="flex flex-1 flex-col">
      <CustomerHeader customer={data} onUpdated={handleHeaderUpdated} onChanged={refresh} />

      <Tabs defaultValue="timeline" className="flex-1">
        <div className="border-b px-6">
          <TabsList variant="line" className="-mb-px">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts <TabCount count={data.contacts.length} />
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals <TabCount count={data.deals.length} />
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity <TabCount count={data.activities.length + data.notes.length} />
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks <TabCount count={data.tasks.length} />
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          <TabsContent value="timeline">
            <TimelineTab companyId={data.id} reloadKey={reloadKey} />
          </TabsContent>
          <TabsContent value="contacts">
            <ContactsTab
              companyId={data.id}
              items={data.contacts}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="deals">
            <DealsTab
              companyId={data.id}
              items={data.deals}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="activity">
            <UnifiedActivityTab
              companyId={data.id}
              activities={data.activities}
              notes={data.notes}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksTab
              companyId={data.id}
              items={data.tasks}
              onChanged={refresh}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
