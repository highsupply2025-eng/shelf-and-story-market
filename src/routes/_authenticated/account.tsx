import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCard } from "@/components/BookCard";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const l=useLocale();const qc=useQueryClient();
  const [profile,setProfile]=useState({display_name:"",shipping_name:"",shipping_phone:"",shipping_address:""});
  useEffect(()=>{if(!session)return;supabase.from("profiles").select("display_name,shipping_name,shipping_phone,shipping_address").eq("id",session.user.id).maybeSingle().then(({data})=>{if(data)setProfile({...data,display_name:data.display_name??""});});},[session?.user.id]);
  const {data:favorites=[]}=useQuery({queryKey:["favorites",session?.user.id],enabled:!!session,queryFn:async()=>{const {data,error}=await supabase.from("reader_favorites").select("book_id,books(*)");if(error)throw error;return data??[];}});
  async function save(e:React.FormEvent){e.preventDefault();if(!session)return;const {error}=await supabase.from("profiles").update(profile).eq("id",session.user.id);if(error)toast.error(l.t("تعذر الحفظ","Could not save"));else toast.success(l.t("حُفظت بيانات الحساب","Account details saved"));}

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      if(!session) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,created_at,order_items(id,format,quantity,unit_price,books(id,title,cover_url,file_path))")
        .eq("buyer_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const library = Array.from(new Map(orders.flatMap(o=>o.order_items).flatMap(i=>i.format==="digital"&&i.books?[[i.books.id,i.books] as const]:[])).values());

  async function download(path: string | null) {
    if (!path) return void toast.info("لم يرفع الناشر الملف بعد");
    const { data, error } = await supabase.storage.from("book-files").createSignedUrl(path, 60);
    if (error || !data) return void toast.error("تعذر تجهيز الملف");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm text-primary">{l.t("مساحة القارئ","Reader space")}</p><h1 className="mt-2 text-4xl font-bold">{l.t("أهلاً بك في مكتبتك","Welcome to your library")}</h1>
      <p className="mt-1 text-muted-foreground" dir="ltr">{session?.user.email}</p>
      <Tabs defaultValue="library" className="mt-8">
        <TabsList>
          <TabsTrigger value="library"><Library className="me-1 h-4 w-4" /> {l.t("مكتبتي الرقمية","Digital library")}</TabsTrigger>
          <TabsTrigger value="orders"><Package className="me-1 h-4 w-4" /> {l.t("طلباتي","My orders")}</TabsTrigger>
          <TabsTrigger value="favorites">{l.t("المفضلة","Favorites")}</TabsTrigger>
          <TabsTrigger value="settings">{l.t("بيانات الحساب","Account settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-6">
          {library.length === 0 ? (
            <Empty text={l.t("لم تشترِ كتباً رقمية بعد.","Your digital library is empty.")} />
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {library.map((b) => (
                <div key={b.id} className="animate-rise">
                  {b.cover_url && <img src={b.cover_url} alt={b.title} className="aspect-[2/3] w-full rounded-md object-cover shadow-book" />}
                  <div className="mt-3 font-display font-semibold">{b.title}</div>
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => download(b.file_path)}>
                    <Download className="me-1 h-4 w-4" /> {l.t("تحميل","Download")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="orders" className="mt-6 space-y-4">
          {orders.length === 0 && <Empty text={l.t("لا توجد طلبات بعد.","No orders yet.")} />}
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
        <TabsContent value="favorites" className="mt-8"><div className="grid grid-cols-2 gap-6 sm:grid-cols-4">{favorites.map(f=>f.books?<div key={f.book_id}><BookCard book={f.books}/><Button className="mt-3" size="sm" variant="outline" onClick={async()=>{await supabase.from("reader_favorites").delete().eq("book_id",f.book_id);qc.invalidateQueries({queryKey:["favorites"]});}}>{l.t("إزالة من المفضلة","Remove favorite")}</Button></div>:null)}</div>{favorites.length===0&&<Empty text={l.t("لا توجد كتب مفضلة بعد","No favorites yet")}/>}</TabsContent>
        <TabsContent value="settings" className="mt-8"><form onSubmit={save} className="max-w-2xl space-y-5">{(["display_name","shipping_name","shipping_phone","shipping_address"] as const).map((key,n)=><div key={key}><Label htmlFor={key}>{l.t(["الاسم","اسم مستلم الشحنة","هاتف الشحن","عنوان الشحن"][n]??"",["Display name","Shipping recipient","Shipping phone","Shipping address"][n]??"")}</Label>{key==="shipping_address"?<Textarea id={key} value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/>:<Input id={key} value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/>}</div>)}<p className="text-sm text-muted-foreground">{l.t("البلد واللغة والعملة","Country, language & currency")}: {l.country} · {l.language} · {l.currency}</p><Button>{l.t("حفظ البيانات","Save details")}</Button></form></TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ text }: { text: string }) {
 const {t}=useLocale();
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
      {text} <Link to="/books" className="text-primary">{t("تصفّح المتجر","Browse books")}</Link>
    </div>
  );
}
