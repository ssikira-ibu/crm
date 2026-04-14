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
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
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

      <Tabs defaultValue="contacts" className="flex-1 p-4 sm:p-6">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-2">
            Contacts
            <Badge variant="secondary" className="h-5 px-1.5">
              {data.contacts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            Addresses
            <Badge variant="secondary" className="h-5 px-1.5">
              {data.addresses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="phones" className="gap-2">
            Phones
            <Badge variant="secondary" className="h-5 px-1.5">
              {data.phoneNumbers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            Notes
            <Badge variant="secondary" className="h-5 px-1.5">
              {data.notes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            Reminders
            <Badge variant="secondary" className="h-5 px-1.5">
              {data.reminders.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab
            customerId={data.id}
            items={data.contacts}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="addresses" className="mt-4">
          <AddressesTab
            customerId={data.id}
            items={data.addresses}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="phones" className="mt-4">
          <PhonesTab
            customerId={data.id}
            items={data.phoneNumbers}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab
            customerId={data.id}
            items={data.notes}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <RemindersTab
            customerId={data.id}
            items={data.reminders}
            onChanged={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
