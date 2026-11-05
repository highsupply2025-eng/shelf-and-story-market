import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PublisherDashboard } from "@/components/PublisherDashboard";
import { useAuth } from "@/lib/auth";

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
  const { accountType, loading } = useAuth();
  if (!loading && accountType === "author") return <Navigate to="/author" />;
  return <PublisherDashboard />;
}
