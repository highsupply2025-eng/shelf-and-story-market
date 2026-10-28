import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Library, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي — رفوف" },
      { name: "description", content: "مكتبتك الرقمية وطلباتك في رفوف." },
      { property: "og:title", content: "حسابي — رفوف" },
      { property: "og:description", content: "مكتبتك الرقمية وطلباتك في رفوف." },
    ],
  }),
  component: AccountPage,
});

type OrderRow = {
  id: string; total: number; status: string; created_at: string;
  order_items: { id: string; format: string; quantity: number; unit_price: number;
    books: { id: string; title: string; cover_url: string | null; file_path: string | null } | null }[];
};

function AccountPage() {
  const { session } = useAuth();
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,created_at,order_items(id,format,quantity,unit_price,books(id,title,cover_url,file_path))")
        .eq("buyer_id", session!.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const library = Array.from(
    new Map(
      orders.flatMap((o) => o.order_items).filter((i) => i.format === "digital" && i.books).map((i) => [i.books!.id, i.books!]),
    ).values(),
  );

  async function download(path: string | null) {
    if (!path) return void toast.info("لم يرفع الناشر الملف بعد");
    const { data, error } = await supabase.storage.from("book-files").createSignedUrl(path, 60);
    if (error || !data) return void toast.error("تعذر تجهيز الملف");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold">حسابي</h1>
      <p className="mt-1 text-muted-foreground" dir="ltr">{session?.user.email}</p>
      <Tabs defaultValue="library" className="mt-8">
        <TabsList>
          <TabsTrigger value="library"><Library className="me-1 h-4 w-4" /> مكتبتي الرقمية</TabsTrigger>
          <TabsTrigger value="orders"><Package className="me-1 h-4 w-4" /> طلباتي</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-6">
          {library.length === 0 ? (
            <Empty text="لم تشترِ كتباً رقمية بعد." />
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {library.map((b) => (
                <div key={b.id} className="animate-rise">
                  {b.cover_url && <img src={b.cover_url} alt={b.title} className="aspect-[2/3] w-full rounded-md object-cover shadow-book" />}
                  <div className="mt-3 font-display font-semibold">{b.title}</div>
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => download(b.file_path)}>
                    <Download className="me-1 h-4 w-4" /> تحميل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="orders" className="mt-6 space-y-4">
          {orders.length === 0 && <Empty text="لا توجد طلبات بعد." />}
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>طلب #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("ar")}</span>
                <span className="rounded-full bg-accent px-3 py-0.5">{o.status}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.books?.title} — {i.format === "digital" ? "رقمي" : `ورقي × ${i.quantity}`}</span>
                    <span>{formatPrice(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t pt-3 text-end font-bold">{formatPrice(o.total)}</div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
      {text} <Link to="/books" className="text-primary">تصفّح المتجر</Link>
    </div>
  );
}
