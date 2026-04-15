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
import { AddressesTab } from "@/components/customers/detail/addresses-tab";
import { PhonesTab } from "@/components/customers/detail/phones-tab";
import { NotesTab } from "@/components/customers/detail/notes-tab";
import { RemindersTab } from "@/components/customers/detail/reminders-tab";
import { api, ApiError } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { Customer, CustomerWithRelations } from "@/lib/types";

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

  const [data, setData] = useState<CustomerWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api.customers
      .get(id, ctrl.signal)
      .then((res) => setData(res.data))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) {
          toast.error("Customer not found.");
          router.replace("/customers");
          return;
        }
        const msg = describeError(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [id, reloadKey, router]);

  function handleHeaderUpdated(next: Customer) {
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
          title="Customer unavailable"
          description={error ?? "We couldn't load this customer."}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <CustomerHeader customer={data} onUpdated={handleHeaderUpdated} />

      <Tabs defaultValue="contacts" className="flex-1">
        <div className="border-b px-6">
          <TabsList variant="line" className="-mb-px">
            <TabsTrigger value="contacts">
              Contacts <TabCount count={data.contacts.length} />
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notes <TabCount count={data.notes.length} />
            </TabsTrigger>
            <TabsTrigger value="reminders">
              Reminders <TabCount count={data.reminders.length} />
            </TabsTrigger>
            <TabsTrigger value="addresses">
              Addresses <TabCount count={data.addresses.length} />
            </TabsTrigger>
            <TabsTrigger value="phones">
              Phones <TabCount count={data.phoneNumbers.length} />
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          <TabsContent value="contacts">
            <ContactsTab
              customerId={data.id}
              items={data.contacts}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="notes">
            <NotesTab
              customerId={data.id}
              items={data.notes}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="reminders">
            <RemindersTab
              customerId={data.id}
              items={data.reminders}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="addresses">
            <AddressesTab
              customerId={data.id}
              items={data.addresses}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="phones">
            <PhonesTab
              customerId={data.id}
              items={data.phoneNumbers}
              onChanged={refresh}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
