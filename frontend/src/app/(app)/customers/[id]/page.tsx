"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {error ?? "Customer unavailable."}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <CustomerHeader customer={data} onUpdated={handleHeaderUpdated} />

      <Tabs defaultValue="contacts" className="flex-1 p-4 sm:p-6">
        <TabsList>
          <TabsTrigger value="contacts">
            Contacts ({data.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="addresses">
            Addresses ({data.addresses.length})
          </TabsTrigger>
          <TabsTrigger value="phones">
            Phones ({data.phoneNumbers.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({data.notes.length})
          </TabsTrigger>
          <TabsTrigger value="reminders">
            Reminders ({data.reminders.length})
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
