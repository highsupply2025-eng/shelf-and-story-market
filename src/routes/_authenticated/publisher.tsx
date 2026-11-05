import { createFileRoute } from "@tanstack/react-router";
import { PublisherDashboard } from "@/components/PublisherDashboard";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/publisher")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "لوحة دار النشر — unibook" },
      { name: "description", content: "لوحة تحكم دار النشر والمؤسسات العلمية في unibook." },
      { property: "og:title", content: "لوحة دار النشر — unibook" },
      { property: "og:description", content: "لوحة تحكم دار النشر والمؤسسات العلمية في unibook." },
    ],
  }),
  component: PublisherRouteComponent,
});

function PublisherRouteComponent() {
  return (
    <DashboardShell role="publisher">
      <PublisherDashboard />
    </DashboardShell>
  );
}
