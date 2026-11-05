import { createFileRoute } from "@tanstack/react-router";
import { AccountView } from "@/components/AccountView";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة القارئ — unibook" },
      { name: "description", content: "مكتبتك الرقمية وطلباتك ومفضلتك وبيانات حسابك في unibook." },
      { property: "og:title", content: "لوحة القارئ — unibook" },
      { property: "og:description", content: "مكتبتك الرقمية وطلباتك ومفضلتك وبيانات حسابك في unibook." },
    ],
  }),
  component: ReaderPage,
});

function ReaderPage() {
  return (
    <DashboardShell role="reader">
      <AccountView mode="reader" />
    </DashboardShell>
  );
}
