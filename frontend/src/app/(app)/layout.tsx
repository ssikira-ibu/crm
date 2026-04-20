import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getMe } from "@/app/actions/me";
import { ServerApiError } from "@/lib/api-server";
import type { OrgInfo } from "@/hooks/use-org";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let orgInfo: OrgInfo | null = null;

  try {
    const { data } = await getMe();
    if (!data.organization) {
      redirect("/onboarding");
    }
    orgInfo = {
      organizationId: data.organization.id,
      organizationName: data.organization.name,
      role: data.organization.role,
    };
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 401) {
      redirect("/");
    }
    throw err;
  }

  return <AppShell orgInfo={orgInfo!}>{children}</AppShell>;
}
