import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getMe } from "@/app/actions/me";
import { ServerApiError } from "@/lib/api-server";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let hasOrg = false;

  try {
    const { data } = await getMe();
    hasOrg = data.organization !== null;
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 401) {
      redirect("/");
    }
    throw err;
  }

  if (!hasOrg) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
