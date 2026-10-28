import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLabel, type Book } from "@/components/BookCard";
import {ProductionAdmin} from "@/components/ProductionAdmin";
import {useLocale} from "@/lib/locale";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "الإدارة — رفوف" },
      { name: "description", content: "مراجعة الكتب والطلبات." },
      { property: "og:title", content: "الإدارة — رفوف" },
      { property: "og:description", content: "مراجعة الكتب والطلبات." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const {t}=useLocale();
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*, publishers(store_name)").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data as (Book & { publishers: { store_name: string } | null })[];
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return null;
  if (!isAdmin) return <p className="py-32 text-center text-muted-foreground">هذه الصفحة لإدارة الموقع فقط.</p>;

  async function decide(id: string, approve: boolean) {
    const reason = approve ? null : prompt("سبب الرفض؟") ?? "";
    const { error } = await supabase.from("books").update({ status: approve ? "approved" : "rejected", rejection_reason: reason }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(approve ? "تم نشر الكتاب" : "تم رفض الكتاب");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold">{t("لوحة الإدارة","Management desk")}</h1>
      <Tabs defaultValue="production" className="mt-8">
        <TabsList>
          <TabsTrigger value="production">{t("المخطوطات والإنتاج والأرباح","Production & royalties")}</TabsTrigger>
          <TabsTrigger value="pending">بانتظار المراجعة ({pending.length})</TabsTrigger>
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
        </TabsList>
        <TabsContent value="production" className="mt-6"><ProductionAdmin/></TabsContent>
        <TabsContent value="pending" className="mt-6 space-y-3">
          {pending.length === 0 && <p className="text-muted-foreground">لا توجد كتب بانتظار المراجعة.</p>}
          {pending.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
              {b.cover_url && <img src={b.cover_url} alt="" className="h-24 w-16 rounded object-cover" />}
              <div className="min-w-60 flex-1">
                <div className="font-display text-lg font-semibold">{b.title}</div>
                <div className="text-sm text-muted-foreground">{b.author} · {b.publishers?.store_name} · {formatLabel[b.format]}</div>
                <p className="mt-1 line-clamp-2 text-sm">{b.description}</p>
                <div className="text-sm">رقمي: {formatPrice(b.price_digital)} · ورقي: {formatPrice(b.price_physical)}</div>
              </div>
              <Button size="sm" onClick={() => decide(b.id, true)}><Check className="me-1 h-4 w-4" /> نشر</Button>
              <Button size="sm" variant="outline" onClick={() => decide(b.id, false)}><X className="me-1 h-4 w-4" /> رفض</Button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <ul className="divide-y rounded-xl border bg-card">
            {orders.map((o) => (
              <li key={o.id} className="grid gap-1 p-4 text-sm md:grid-cols-4">
                <span>#{o.id.slice(0, 8)}</span>
                <span>{new Date(o.created_at).toLocaleString("ar")}</span>
                <span>{o.shipping_name ? `${o.shipping_name} · ${o.shipping_phone}` : "رقمي فقط"}</span>
                <span className="font-semibold md:text-end">{formatPrice(o.total)}</span>
              </li>
            ))}
            {orders.length === 0 && <li className="p-4 text-muted-foreground">لا توجد طلبات.</li>}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
