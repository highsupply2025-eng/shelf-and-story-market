import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AccountView } from "@/components/AccountView";
import { DashboardShell } from "@/components/DashboardShell";
import { StoreClosedNotice } from "@/components/StoreClosedNotice";
import { STORE_AND_READER_CLOSED } from "@/lib/site-config";
import { useAuth, metadataAccountType } from "@/lib/auth";

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
  const { session, isAdmin, accountType } = useAuth();
  const navigate = useNavigate();
  const resolved = metadataAccountType(session) || accountType;

  useEffect(() => {
    if (!session) return;
    if (isAdmin) {
      void navigate({ to: "/admin" });
    } else if (resolved === "publisher") {
      void navigate({ to: "/publisher" });
    } else if (resolved === "author") {
      void navigate({ to: "/author" });
    }
  }, [session, isAdmin, resolved, navigate]);

  if (STORE_AND_READER_CLOSED && !isAdmin) {
    return <StoreClosedNotice mode="reader" />;
  }

  return (
    <DashboardShell role="reader">
      <AccountView mode="reader" />
    </DashboardShell>
  );
}
