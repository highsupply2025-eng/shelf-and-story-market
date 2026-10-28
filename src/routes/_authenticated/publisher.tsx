import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PenLine, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Book } from "@/components/BookCard";

export const Route = createFileRoute("/_authenticated/publisher")({
  head: () => ({
    meta: [
      { title: "لوحة الناشر — رفوف" },
      { name: "description", content: "انشر كتبك الرقمية والورقية وتابع مبيعاتك." },
      { property: "og:title", content: "لوحة الناشر — رفوف" },
      { property: "og:description", content: "انشر كتبك الرقمية والورقية وتابع مبيعاتك." },
    ],
  }),
  component: PublisherPage,
});

const statusLabel: Record<string, { t: string; c: string }> = {
  pending: { t: "قيد المراجعة", c: "bg-accent text-accent-foreground" },
  approved: { t: "منشور", c: "bg-primary text-primary-foreground" },
  rejected: { t: "مرفوض", c: "bg-destructive text-destructive-foreground" },
};

function PublisherPage() {
  const { isPublisher, loading } = useAuth();
  if (loading) return null;
  return isPublisher ? <Dashboard /> : <BecomePublisher />;
}

function BecomePublisher() {
  const { session, refresh } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("publishers").insert({ id: session!.user.id, store_name: name, bio });
    if (error) return void toast.error(error.message);
    toast.success("تم تفعيل حساب الناشر");
    await refresh();
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="animate-rise rounded-3xl border border-border bg-card p-8 shadow-book">
        <PenLine className="h-10 w-10 text-primary" />
        <h1 className="mt-4 text-4xl font-bold">فعّل حساب الناشر</h1>
        <p className="mt-2 text-muted-foreground">أنشئ اسم دار النشر أو اسمك ككاتب، ثم ابدأ برفع كتبك. كل كتاب يُراجع قبل النشر.</p>
        <form onSubmit={create} className="mt-6 space-y-4">
          <div><Label>اسم الناشر / الكاتب</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>نبذة</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <Button className="w-full rounded-full" size="lg">تفعيل</Button>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const qc = useQueryClient();
  const { data: books = [] } = useQuery({
    queryKey: ["pub-books", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").eq("publisher_id", uid).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Book[];
    },
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["pub-sales", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,format,quantity,unit_price,created_at,books!inner(title,publisher_id)")
        .eq("books.publisher_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as { id: string; format: string; quantity: number; unit_price: number; created_at: string; books: { title: string } }[];
    },
  });
  const revenue = sales.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  async function del(id: string) {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) return void toast.error("لا يمكن حذف كتاب له مبيعات");
    qc.invalidateQueries({ queryKey: ["pub-books"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold">لوحة الناشر</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["كتبي", books.length],
          ["المبيعات", sales.length],
          ["الإيرادات", formatPrice(revenue)],
        ].map(([t, v]) => (
          <div key={t} className="animate-rise rounded-2xl border border-border bg-card p-6">
            <div className="text-sm text-muted-foreground">{t}</div>
            <div className="mt-1 font-display text-3xl font-bold">{v}</div>
          </div>
        ))}
      </div>
      <Tabs defaultValue="books" className="mt-8">
        <TabsList>
          <TabsTrigger value="books">كتبي</TabsTrigger>
          <TabsTrigger value="new">إضافة كتاب</TabsTrigger>
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-6 space-y-3">
          {books.length === 0 && <p className="text-muted-foreground">لم تضف كتباً بعد.</p>}
          {books.map((b) => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              {b.cover_url && <img src={b.cover_url} alt="" className="h-20 w-14 rounded object-cover" />}
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">{b.title}</div>
                <div className="text-sm text-muted-foreground">{b.author}</div>
                {b.status === "rejected" && b.rejection_reason && (
                  <div className="text-sm text-destructive">السبب: {b.rejection_reason}</div>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${statusLabel[b.status]!.c}`}>{statusLabel[b.status]!.t}</span>
              <button onClick={() => del(b.id)} className="p-2 text-muted-foreground hover:text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="new" className="mt-6"><NewBookForm uid={uid} /></TabsContent>
        <TabsContent value="sales" className="mt-6">
          {sales.length === 0 ? <p className="text-muted-foreground">لا مبيعات بعد.</p> : (
            <ul className="divide-y rounded-xl border bg-card">
              {sales.map((s) => (
                <li key={s.id} className="flex justify-between p-4 text-sm">
                  <span>{s.books.title} — {s.format === "digital" ? "رقمي" : `ورقي × ${s.quantity}`}</span>
                  <span>{formatPrice(s.unit_price * s.quantity)} · {new Date(s.created_at).toLocaleDateString("ar")}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewBookForm({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const empty = { title: "", author: "", description: "", category: "", format: "digital", price_digital: "", price_physical: "", pages: "", stock: "" };
  const [f, setF] = useState(empty);
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const hasDigital = f.format !== "physical";
  const hasPhysical = f.format !== "digital";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let cover_url: string | null = null;
      if (cover) {
        const p = `${uid}/${crypto.randomUUID()}-${cover.name.replace(/[^\w.]/g, "")}`;
        const up = await supabase.storage.from("covers").upload(p, cover);
        if (up.error) throw up.error;
        const { data } = await supabase.storage.from("covers").createSignedUrl(p, 60 * 60 * 24 * 365 * 10);
        cover_url = data?.signedUrl ?? null;
      }
      let file_path: string | null = null;
      if (file && hasDigital) {
        file_path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
        const up = await supabase.storage.from("book-files").upload(file_path, file);
        if (up.error) throw up.error;
      }
      const { error } = await supabase.from("books").insert({
        publisher_id: uid,
        title: f.title, author: f.author, description: f.description, category: f.category || "عام",
        format: f.format as "digital" | "physical" | "both",
        price_digital: hasDigital ? Number(f.price_digital) : null,
        price_physical: hasPhysical ? Number(f.price_physical) : null,
        pages: f.pages ? Number(f.pages) : null,
        stock: hasPhysical ? Number(f.stock || 0) : 0,
        cover_url, file_path,
      });
      if (error) throw error;
      toast.success("أُرسل الكتاب للمراجعة");
      setF(empty); setCover(null); setFile(null);
      qc.invalidateQueries({ queryKey: ["pub-books"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
      <div><Label>العنوان</Label><Input required value={f.title} onChange={set("title")} /></div>
      <div><Label>المؤلف</Label><Input required value={f.author} onChange={set("author")} /></div>
      <div className="md:col-span-2"><Label>الوصف</Label><Textarea required value={f.description} onChange={set("description")} /></div>
      <div><Label>التصنيف</Label><Input placeholder="روايات، علوم…" value={f.category} onChange={set("category")} /></div>
      <div>
        <Label>الصيغة</Label>
        <select value={f.format} onChange={set("format")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="digital">رقمي</option><option value="physical">ورقي</option><option value="both">رقمي وورقي</option>
        </select>
      </div>
      {hasDigital && <div><Label>سعر النسخة الرقمية (ر.س)</Label><Input type="number" min="0" step="0.01" required value={f.price_digital} onChange={set("price_digital")} /></div>}
      {hasPhysical && <div><Label>سعر النسخة الورقية (ر.س)</Label><Input type="number" min="0" step="0.01" required value={f.price_physical} onChange={set("price_physical")} /></div>}
      {hasPhysical && <div><Label>الكمية المتوفرة</Label><Input type="number" min="0" required value={f.stock} onChange={set("stock")} /></div>}
      <div><Label>عدد الصفحات</Label><Input type="number" min="1" value={f.pages} onChange={set("pages")} /></div>
      <div><Label>صورة الغلاف</Label><Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></div>
      {hasDigital && <div><Label>ملف الكتاب (PDF / EPUB)</Label><Input type="file" accept=".pdf,.epub" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>}
      <div className="md:col-span-2"><Button className="rounded-full px-10" size="lg" disabled={busy}>{busy ? "جارٍ الرفع…" : "إرسال للمراجعة"}</Button></div>
    </form>
  );
}
