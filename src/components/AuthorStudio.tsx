import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Download, PenLine, Wallet, BookOpen, Plus, ArrowUpRight, Clock, AlertCircle, ShieldAlert, RefreshCw, Copy, CheckCircle2, Smartphone } from "lucide-react";
import { getUserPlanRequest, getAdminWalletNumber } from "@/lib/author-plans";
import { markNotifSeen, getUnseenCounts } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { isPayoutDay } from "@/lib/author-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlurbGenerator } from "@/components/BlurbGenerator";
import { AuthorProfileForm, isAuthorProfileComplete, loadAuthorProfile } from "@/components/AuthorProfileForm";
import type { Tables } from "@/integrations/supabase/types";

export function Stage({value}:{value:string}){
 const {t}=useLocale();const labels:Record<string,[string,string]>={review:["قيد المراجعة","In review"],revision:["تعديلات مطلوبة","Revision requested"],accepted:["تمت المراجعة","Accepted"],invoiced:["بانتظار الدفع","Awaiting payment"],production:["قيد الإنتاج","In production"],ready:["النسخة النهائية جاهزة","Final copy ready"],published:["منشور","Published"],requested:["طلب سحب قيد المراجعة","Withdrawal requested"],paid:["مدفوع","Paid"],unpaid:["غير مدفوع","Unpaid"],rejected:["مرفوض","Rejected"],refunded:["مسترد","Refunded"]};const label=labels[value];
 return <span className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">{label?t(label[0],label[1]):value}</span>;
}
export async function downloadAuthorFile(path:string){const {data,error}=await supabase.storage.from("author-documents").createSignedUrl(path,60);if(error||!data){toast.error("تعذر تنزيل الملف / Download unavailable");return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");}
export function AuthorStudio(){
 const {session,isPublisher:isPub,isAuthor,loading,refresh}=useAuth();const isPublisher=isPub||isAuthor;const l=useLocale();const qc=useQueryClient();const uid=session?.user.id;
 const [name,setName]=useState("");const [bio,setBio]=useState("");const [busy,setBusy]=useState(false);
 const {data:author}=useQuery({queryKey:["author",uid],enabled:!!uid,queryFn:async()=>{if(!uid)return null;const fallback={id:uid,store_name:String(session?.user.user_metadata?.["display_name"]||session?.user.email?.split("@")[0]||"مؤلف unibook"),author_code:String(session?.user.user_metadata?.["author_code"]||"UB-"+uid.slice(0,6).toUpperCase()),bio:"",created_at:new Date().toISOString()};try{const {data,error}=await supabase.from("publishers").select("*").eq("id",uid).maybeSingle();if(error||!data)return fallback;return data;}catch{return fallback;}}});
 const {data:planRequest,isLoading:planLoading,refetch:refetchPlan}=useQuery({queryKey:["author-plan-request",uid],enabled:!!uid,queryFn:()=>getUserPlanRequest(uid!)});
 const {data:projects=[],isError}=useQuery({queryKey:["manuscripts",uid],enabled:!!uid&&isPublisher,queryFn:async()=>{try{const {data,error}=await supabase.from("manuscripts").select("*,manuscript_versions(*),production_invoices(*),production_events(*)").order("created_at",{ascending:false});if(error||!data)return [];return data;}catch{return [];}}});
 const {data:books=[]}=useQuery({queryKey:["author-books",uid],enabled:!!uid&&isPublisher,queryFn:async()=>{if(!uid)return [];try{const {data,error}=await supabase.from("books").select("*").eq("publisher_id",uid);if(error)return [];return data??[];}catch{return [];}}});
 const {data:earnings=[]}=useQuery({queryKey:["earnings",uid],enabled:!!uid&&isPublisher,queryFn:async()=>{if(!uid)return [];try{const {data,error}=await supabase.from("author_earnings").select("*").eq("author_id",uid).order("created_at",{ascending:false});if(error)return [];return data??[];}catch{return [];}}});
 const {data:payouts=[]}=useQuery({queryKey:["payouts",uid],enabled:!!uid&&isPublisher,queryFn:async()=>{if(!uid)return [];try{const {data,error}=await supabase.from("author_payouts").select("*").eq("author_id",uid).order("created_at",{ascending:false});if(error)return [];return data??[];}catch{return [];}}});
 const [tab,setTab]=useState<string>(() => {
   if (typeof window !== "undefined") {
     const saved = window.sessionStorage.getItem("unibook_author_tab");
     if (saved) return saved;
   }
   return "projects";
 });
 useEffect(() => {
   const onTab = (e: Event) => {
     const detail = (e as CustomEvent<string>).detail;
     if (detail) setTab(detail);
   };
   window.addEventListener("unibook_author_tab", onTab);
   return () => window.removeEventListener("unibook_author_tab", onTab);
 }, []);const [revision,setRevision]=useState<Tables<"manuscripts">|null>(null);const [currency,setCurrency]=useState("SAR");const [details,setDetails]=useState("");
 const balance=(c:string)=>earnings.filter(e=>e.currency===c&&!e.reversed).reduce((n,e)=>n+Number(e.amount),0)-payouts.filter(p=>p.currency===c&&p.status!=="rejected").reduce((n,p)=>n+Number(p.amount),0);
 const invoices=projects.flatMap(p=>(p.production_invoices ? [p.production_invoices] : []).map(i=>({...i,title:p.title})));
 async function activate(e:React.FormEvent){e.preventDefault();if(!uid)return;setBusy(true);const {error}=await supabase.from("publishers").insert({id:uid,store_name:name,bio});setBusy(false);if(error){toast.error(l.t("تعذر إنشاء حساب المؤلف","Could not create author account"));return;}await refresh();qc.invalidateQueries();}
 async function withdraw(){setBusy(true);const {error}=await supabase.rpc("request_author_payout",{_currency:currency,_details:details});setBusy(false);if(error){toast.error(l.t("السحب يوم 30 وآخر فبراير فقط، ويتطلب رصيداً متاحاً وبيانات تحويل","Withdrawals require an available balance, transfer details and an open withdrawal date"));return;}toast.success(l.t("أُرسل طلب السحب","Withdrawal requested"));qc.invalidateQueries();}

 if(loading||(uid&&planLoading))return <p className="p-12 text-center text-muted-foreground">{l.t("جارٍ التحقق من باقة المؤلف والحساب…","Verifying author plan & account…")}</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">{l.t("مساحة المؤلفين", "Author Studio")}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {l.t("يجب تسجيل الدخول بحسابك أولاً للوصول إلى مساحة المؤلف وإدارة مخطوطاتك.", "Please sign in to access the author studio and manage your manuscripts.")}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button asChild className="rounded-xl">
            <Link to="/login">{l.t("تسجيل الدخول", "Sign In")}</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link to="/register">{l.t("إنشاء حساب مؤلف", "Register")}</Link>
          </Button>
        </div>
      </div>
    );
  }

 const isPlanActive = planRequest?.status === "active";

 const authorProfile = loadAuthorProfile(uid, session?.user.user_metadata as Record<string, unknown> | undefined);
 const profileComplete = isAuthorProfileComplete(authorProfile);

 const invoicesSection = (
   <div className="space-y-4">
     {planRequest && (
       <article className="rounded-xl border bg-card p-6 space-y-3">
         <div className="flex flex-wrap items-center justify-between gap-3">
           <div>
             <p className="font-mono text-xs text-muted-foreground">{planRequest.reference || "PLAN-RECEIPT"}</p>
             <h3 className="mt-1 text-lg font-bold">{l.t("إيصال باقة النشر:", "Publishing Plan Receipt:")} {planRequest.planTitle}</h3>
           </div>
           <Stage value={planRequest.status === "active" ? "paid" : planRequest.status === "rejected" ? "rejected" : "review"} />
         </div>
         <div className="grid gap-2 text-xs sm:grid-cols-3 text-muted-foreground">
           <div>{l.t("القيمة:", "Amount:")} <strong className="text-foreground">{planRequest.priceDisplay}</strong></div>
           <div>{l.t("محفظة المحوّل:", "Sender Wallet:")} <strong className="text-foreground" dir="ltr">{planRequest.walletSender || "-"}</strong></div>
           <div>{l.t("عدد الكتب:", "Books Limit:")} <strong className="text-foreground">{planRequest.booksCount}</strong></div>
         </div>
       </article>
     )}
     {invoices.length===0 && !planRequest && <StudioEmpty text={l.t("لا توجد إيصالات دفع أو فواتير بعد","No payment receipts or invoices yet")}/>}
     {invoices.map(i=><article key={i.id} className="rounded-lg border bg-card p-6"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-mono text-xs">{i.invoice_number}</p><h2 className="mt-2 text-xl">{i.title}</h2></div><Stage value={i.status}/></div><ul className="mt-5 divide-y">{(Array.isArray(i.items)?i.items:[]).map((item,n)=>{const row=item as {label:string;amount:number};return <li key={n} className="flex justify-between py-3 text-sm"><span>{row.label}</span><span>{Number(row.amount).toFixed(2)} {i.currency}</span></li>;})}</ul><p className="border-t pt-4 text-end text-xl font-bold">{Number(i.amount).toFixed(2)} {i.currency}</p>{i.status==="unpaid"&&uid?<InvoicePaymentBox uid={uid} invoice={i} onSubmitted={()=>qc.invalidateQueries()}/>:<p className="mt-4 text-xs text-emerald-700 font-semibold">{l.t("تم تأكيد سداد الفاتورة","Invoice payment confirmed")}{i.payment_reference?` · ${i.payment_reference}`:""}</p>}</article>)}
   </div>
 );

 if (!isPlanActive && tab === "profile") {
   return (
     <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
       <div className="flex items-center justify-between gap-3">
         <h1 className="text-2xl font-bold">{l.t("بيانات المؤلف", "Author Profile")}</h1>
         <Button variant="outline" onClick={() => setTab("projects")}>{l.t("العودة لباقات التفعيل", "Back to Plan Activation")}</Button>
       </div>
       <AuthorProfileForm />
     </div>
   );
 }

 if (!isPlanActive && (tab === "contracts" || tab === "guidelines")) {
   return (
     <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
       <div className="flex items-center justify-between gap-3">
         <h1 className="text-2xl font-bold">{tab === "contracts" ? l.t("عقود النشر وحقوق الملكية", "Publishing Contracts & Rights") : l.t("إرشادات التجهيز والدعم", "Author Guidelines & Support")}</h1>
         <Button variant="outline" onClick={() => setTab("projects")}>{l.t("العودة لباقات التفعيل", "Back to Plan Activation")}</Button>
       </div>
       {tab === "contracts" ? (
         <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-5">
           <h2 className="text-xl font-bold">{l.t("اتفاقية النشر وحقوق المؤلف — unibook", "Author Publishing Agreement — unibook")}</h2>
           <div className="grid gap-4 sm:grid-cols-3 text-sm">
             <div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("حصة المؤلف (رقمي)", "Digital Royalty")}</p><p className="mt-1 text-2xl font-bold text-primary">70%</p></div>
             <div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("حصة المؤلف (ورقي)", "Print Royalty")}</p><p className="mt-1 text-2xl font-bold text-primary">30%</p></div>
             <div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("تكلفة الطباعة والشحن", "Printing & Shipping")}</p><p className="mt-1 text-base font-bold text-emerald-600">{l.t("على المنصة بالكامل", "Covered by unibook")}</p></div>
           </div>
           <ul className="space-y-2 text-sm text-muted-foreground list-disc ps-5">
             <li>{l.t("تظل الحقوق الفكرية والأدبية مملوكة بالكامل للمؤلف.", "Full intellectual property rights remain with the author.")}</li>
             <li>{l.t("تُصرف الأرباح المؤكدة يوم 30 من كل شهر وآخر يوم في فبراير بتوقيت القاهرة.", "Confirmed royalties are paid on the 30th of each month and the last day of February.")}</li>
             <li>{l.t("يتم إيداع النسخ الرقمية والورقية بعد مراجعة اللجنة العلمية والفنية واعتمادها.", "Digital and print editions are published after editorial and technical approval.")}</li>
           </ul>
         </div>
       ) : (
         <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-5">
           <h2 className="text-xl font-bold">{l.t("دليل إعداد الملفات ومراحل النشر", "File Preparation & Publishing Guide")}</h2>
           <div className="grid gap-4 sm:grid-cols-2 text-sm">
             <div className="rounded-xl border p-4 space-y-2"><h3 className="font-bold text-primary">{l.t("1. مواصفات ملف Word", "1. Word File Specs")}</h3><p className="text-muted-foreground text-xs leading-relaxed">{l.t("صيغة .doc أو .docx بخط واضح (مثل Traditional Arabic أو Sakkal Majalla) مع ترقيم الصفحات وفهرس محتويات مرتب.", "Upload .doc or .docx with clean typography, page numbering, and a structured table of contents.")}</p></div>
             <div className="rounded-xl border p-4 space-y-2"><h3 className="font-bold text-primary">{l.t("2. مراحل الاعتماد والإنتاج", "2. Review & Production")}</h3><p className="text-muted-foreground text-xs leading-relaxed">{l.t("يمر كل ملف بـ 6 مراحل: المراجعة الأولية، القبول، إصدار الفاتورة/الإيصال، التصميم والإنتاج، النسخة النهائية، ثم النشر بالمتجر.", "Each file passes through 6 stages: Review, Acceptance, Invoice/Receipt, Production, Final Copy, and Store Publication.")}</p></div>
           </div>
           <div className="pt-2"><Button asChild className="rounded-xl"><a href="https://wa.me/966563057356" target="_blank" rel="noopener noreferrer">{l.t("تواصل مع فريق دعم المؤلفين", "Contact Author Support")}</a></Button></div>
         </div>
       )}
     </div>
   );
 }
 if (!isPlanActive && tab === "invoices") {
   return (
     <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
       <div className="flex items-center justify-between gap-3">
         <h1 className="text-2xl font-bold">{l.t("إيصالات الدفع والفواتير", "Payment Receipts & Invoices")}</h1>
         <Button variant="outline" onClick={() => setTab("projects")}>{l.t("العودة لباقات التفعيل", "Back to Plan Activation")}</Button>
       </div>
       {invoicesSection}
     </div>
   );
 }

 if(!isPlanActive){
   return (
     <div className="mx-auto max-w-3xl px-4 py-16 space-y-6">
       <div className="text-center">
         <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
           {l.t("إنشاء الحساب مجاني 100%","Account creation is 100% free")}
         </span>
         <h1 className="mt-3 text-3xl md:text-4xl font-bold">
           {l.t("تفعيل باقة النشر مطلوب لاستخدام مساحة المؤلف","Author plan activation required to access the studio")}
         </h1>
         <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
           {l.t("لا يمكنك استعمال الحساب كمؤلف ورفع الملفات إلا بعد تفعيل الباقة وإتمام الدفع عبر تحويل المحفظة واعتمادها من الإدارة.","You cannot use the author account or submit manuscripts until your publishing plan is activated after wallet transfer approval by the Admin.")}
         </p>
       </div>

       {planRequest?.status === "pending" && (
         <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-6 md:p-8">
           <div className="flex items-start gap-4">
             <div className="rounded-full bg-amber-500/20 p-3 text-amber-600 dark:text-amber-400 shrink-0">
               <Clock className="h-7 w-7 animate-pulse" />
             </div>
             <div className="flex-1 space-y-3">
               <div className="flex flex-wrap items-center justify-between gap-2">
                 <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                   طلب تفعيل {planRequest.planTitle} قيد المراجعة
                 </h2>
                 <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                   بانتظار تأكيد الإدارة
                 </span>
               </div>
               <p className="text-sm text-muted-foreground leading-relaxed">
                 تم استلام بيانات تحويل المحفظة بنجاح، ويقوم فريق الإدارة حالياً بمطابقة التحويل وتفعيل باقتك من خلال لوحة الإدارة. يمكنك تحديث الحالة فوراً بالضغط على زر التحديث أدناه.
               </p>
               <div className="grid gap-2 rounded-xl border border-amber-500/20 bg-background/80 p-4 text-xs sm:grid-cols-2">
                 <div><span className="text-muted-foreground">الباقة:</span> <strong className="ms-1">{planRequest.planTitle} ({planRequest.booksCount} كتب)</strong></div>
                 <div><span className="text-muted-foreground">قيمة الباقة:</span> <strong className="ms-1">{planRequest.priceDisplay}</strong></div>
                 <div><span className="text-muted-foreground">محفظة المحوّل:</span> <strong className="ms-1" dir="ltr">{planRequest.walletSender}</strong></div>
                 <div><span className="text-muted-foreground">رقم المرجع:</span> <strong className="ms-1" dir="ltr">{planRequest.reference}</strong></div>
               </div>
               <div className="pt-2 flex flex-wrap items-center gap-3">
                 <Button variant="default" onClick={() => { refetchPlan(); toast.success("تم تحديث حالة الطلب"); }} className="gap-2">
                   <RefreshCw className="h-4 w-4" /> تحديث حالة التفعيل
                 </Button>
                 <Button variant="outline" asChild>
                   <Link to="/author" search={{view:"plans"}}>استعراض خطط النشر</Link>
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}

       {planRequest?.status === "rejected" && (
         <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/10 p-6 md:p-8">
           <div className="flex items-start gap-4">
             <div className="rounded-full bg-destructive/20 p-3 text-destructive shrink-0">
               <AlertCircle className="h-7 w-7" />
             </div>
             <div className="flex-1 space-y-3">
               <h2 className="text-lg font-bold text-destructive">
                 تعذر تفعيل الباقة السابقة
               </h2>
               <p className="text-sm text-muted-foreground">
                 {planRequest.rejectionReason || "تعذر التحقق من وصول مبلغ التحويل لمحفظة الإدارة. يرجى التأكد من بيانات التحويل وإعادة إرسال الطلب."}
               </p>
               <div className="pt-2">
                 <Button asChild>
                   <Link to="/author" search={{view:"plans"}}>اختيار باقة وإعادة إرسال بيانات التحويل</Link>
                 </Button>
               </div>
             </div>
           </div>
         </div>
       )}

       {(!planRequest || (planRequest.status !== "pending" && planRequest.status !== "rejected")) && (
         <div className="rounded-2xl border bg-card p-6 md:p-10 text-center shadow-sm space-y-6">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
             <ShieldAlert className="h-8 w-8" />
           </div>
           <div className="space-y-2">
             <h2 className="text-xl md:text-2xl font-bold">
               اختر باقتك من بين 6 باقات نشر معتمدة
             </h2>
             <p className="text-muted-foreground text-sm max-w-lg mx-auto">
               تبدأ الباقات من الخطة المجانية (كتاب واحد)، والباقات المدفوعة تبدأ من 3 كتب (999 ر.س) حتى 12 كتاباً (8,500 ر.س). الدفع عبر تحويل المحفظة المباشر.
             </p>
           </div>
           <div className="rounded-xl border bg-muted/40 p-4 text-start text-xs space-y-2 max-w-md mx-auto">
             <div className="font-semibold text-foreground">آلية العمل:</div>
             <div>1. إنشاء الحساب مجاني بالكامل.</div>
             <div>2. اختيار إحدى خطط النشر الـ 6 في صفحة الحساب.</div>
             <div>3. تحويل رسوم الباقة لمحفظة الإدارة وإرفاق رقم المرجع.</div>
             <div>4. تفعيل حسابك من خلال لوحة الإدارة لفتح مساحة رفع الملفات فوراً.</div>
           </div>
           <Button size="lg" asChild className="rounded-xl px-8 font-bold">
             <Link to="/author" search={{view:"plans"}}>
               <Wallet className="me-2 h-4 w-4" />
               اختيار باقة النشر والتحويل
             </Link>
           </Button>
         </div>
       )}
     </div>
   );
 }

 if(!isPublisher)return <div className="mx-auto max-w-2xl px-4 py-16"><p className="text-sm text-primary">{l.t("دار عبيد · مساحة المؤلف","Dar Obaid · Author studio")}</p><h1 className="mt-3 text-4xl font-bold">{l.t("ابدأ رحلتك كمؤلف","Your next chapter starts here")}</h1><form onSubmit={activate} className="mt-10 space-y-5"><Label htmlFor="author-name">{l.t("اسم المؤلف","Author name")}</Label><Input id="author-name" required value={name} onChange={e=>setName(e.target.value)}/><Label htmlFor="author-bio">{l.t("نبذة عنك","About you")}</Label><Textarea id="author-bio" value={bio} onChange={e=>setBio(e.target.value)}/><Button disabled={busy} size="lg"><PenLine className="me-2 h-4 w-4"/>{l.t("إنشاء حساب المؤلف","Create author account")}</Button></form></div>;
 const projectUpdatesCount = projects.filter((p) => p.stage === "revision" || p.stage === "invoiced" || p.stage === "ready" || p.stage === "accepted").length;
 const unpaidInvoicesCount = invoices.filter((i) => i.status === "unpaid").length;
 const publishedBooksCount = books.filter((b) => b.status === "approved").length;
 const confirmedEarningsCount = earnings.filter((e) => !e.reversed).length;
 const unseenTab = getUnseenCounts(uid, { projects: projectUpdatesCount, invoices: unpaidInvoicesCount, books: publishedBooksCount, earnings: confirmedEarningsCount, orders: 0 });
 const maxBooksAllowed = planRequest?.booksCount || 1;
 const usedBooksCount = projects.length;
 const remainingBooksCount = Math.max(0, maxBooksAllowed - usedBooksCount);
 const bookLimitReached = usedBooksCount >= maxBooksAllowed;
 const {data:signedContractFiles=[],refetch:refetchContracts}=useQuery({
   queryKey:["author-signed-contracts",uid],
   enabled:!!uid&&isPublisher,
   queryFn:async()=>{
     if(!uid)return [] as string[];
     try{
       const {data}=await supabase.storage.from("author-documents").list(uid);
       return (data||[]).filter(f=>f.name.startsWith("contract-")).map(f=>f.name);
     }catch{return [] as string[];}
   }
 });
 const isContractSigned=(manuscriptId:string)=>{
   if(signedContractFiles.includes(`contract-${manuscriptId}.json`))return true;
   try{return Boolean(typeof window!=="undefined"&&window.localStorage.getItem(`unibook_contract_signed_${manuscriptId}`));}catch{return false;}
 };
 const unsignedProjectsCount=projects.filter(p=>["review","accepted","invoiced"].includes(p.stage)&&!isContractSigned(p.id)).length;
 const activePlanTitle = planRequest?.planTitle || (typeof window !== "undefined" ? localStorage.getItem("unibook_selected_plan_title") : null);
 return <div className="mx-auto max-w-7xl px-4 py-10">
 <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-8"><div><p className="text-sm text-primary">{l.t("unibook · مساحة المؤلف والنشر","unibook · Author & Publishing Studio")}</p><h1 className="mt-2 text-4xl font-bold">{l.t("مساحة المؤلف","Author studio")}</h1><div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground"><span>{author?.store_name}</span><span>·</span><span dir="ltr" className="font-mono text-xs">{author?.author_code}</span>{activePlanTitle && (<><span className="mx-1">·</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-0.5 text-xs font-bold border border-emerald-500/30">الباقة المفعلة: {activePlanTitle} ({usedBooksCount} / {maxBooksAllowed} كتب)</span></>)}<Link to="/author" search={{view:"plans"}} className="text-xs text-primary underline hover:text-primary/80 ms-2">{l.t("تغيير الخطة", "Change plan")}</Link></div></div><div className="flex items-center gap-3"><Button variant="outline" asChild className="rounded-xl"><Link to="/author" search={{view:"plans"}}>{l.t("خطط النشر (6 خطط)", "Publishing Plans")}</Link></Button><Button onClick={()=>{setRevision(null);setTab("new");if(typeof window!=="undefined"){window.sessionStorage.setItem("unibook_author_tab","new");setTimeout(()=>document.getElementById("author-studio-tabs")?.scrollIntoView({behavior:"smooth",block:"start"}),50);}}} className="rounded-xl font-bold"><Plus className="me-2 h-4 w-4"/>{l.t("إرسال ملف Word","Submit manuscript")}</Button></div></div>

 <div className="grid grid-cols-2 gap-4 py-8 lg:grid-cols-4">{[[FileText,l.t("مشروعاتي","Projects"),projects.length],[BookOpen,l.t("كتب منشورة","Published books"),books.filter(b=>b.status==="approved").length],[ArrowUpRight,l.t("نسخ مباعة مؤكدة","Confirmed copies sold"),earnings.filter(e=>!e.reversed).reduce((n,e)=>n+e.quantity,0)],[Wallet,l.t("حصتي الرقمية / الورقية","Digital / print share"),"70% / 30%"]].map(([Icon,label,value])=>{const I=Icon as typeof FileText;return <div key={String(label)} className="rounded-lg border bg-card p-5"><I className="h-5 w-5 text-primary"/><p className="mt-4 text-sm text-muted-foreground">{String(label)}</p><p className="mt-1 text-3xl font-semibold" dir="auto">{String(value)}</p></div>;})}</div>
 <Tabs id="author-studio-tabs" value={tab} onValueChange={(v)=>{setTab(v);if(typeof window!=="undefined")window.sessionStorage.setItem("unibook_author_tab",v);if(v==="projects")markNotifSeen(uid,"projects",projectUpdatesCount);if(v==="invoices")markNotifSeen(uid,"invoices",unpaidInvoicesCount);if(v==="books")markNotifSeen(uid,"books",publishedBooksCount);if(v==="earnings")markNotifSeen(uid,"earnings",confirmedEarningsCount);}} dir={l.language==="ar"?"rtl":"ltr"}> {!profileComplete && (
   <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
     <div className="text-sm text-amber-900 dark:text-amber-100">
       <strong>{l.t("تنبيه مهم:", "Important:")}</strong>{" "}
       {l.t("يرجى إكمال بيانات المؤلف (الشهادة الجامعية، الهوية، رقم الجوال، العنوان، المؤهل، وما سبق من التأليف).", "Please complete your author profile and required documents.")}
     </div>
     <Button size="sm" onClick={() => setTab("profile")} className="rounded-xl font-bold">
       {l.t("إكمال بيانات المؤلف الآن", "Complete Profile Now")}
     </Button>
   </div>
 )}
 <TabsList className="h-auto flex-wrap justify-start gap-1"><TabsTrigger value="projects" className="gap-1.5">{l.t("المؤلفات ومراحل الإنتاج","Book projects")}{unseenTab.projects>0&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white animate-pulse">{unseenTab.projects}</span>}</TabsTrigger><TabsTrigger value="new">{l.t("رفع ملف (Word)","Upload Word")}</TabsTrigger><TabsTrigger value="invoices" className="gap-1.5">{l.t("إيصالات الدفع والفواتير","Receipts & Invoices")}{unseenTab.invoices>0&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white animate-pulse">{unseenTab.invoices}</span>}</TabsTrigger><TabsTrigger value="books" className="gap-1.5">{l.t("كتبي","My books")}{unseenTab.books>0&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{unseenTab.books}</span>}</TabsTrigger><TabsTrigger value="earnings" className="gap-1.5">{l.t("المبيعات والأرباح","Sales & earnings")}{unseenTab.earnings>0&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">{unseenTab.earnings}</span>}</TabsTrigger><TabsTrigger value="blurb">{l.t("نبذة تسويقية بالذكاء الاصطناعي","AI marketing blurb")}</TabsTrigger><TabsTrigger value="profile" className="gap-1.5">{l.t("بيانات المؤلف","Author Profile")}{!profileComplete&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">!</span>}</TabsTrigger><TabsTrigger value="contracts" className="gap-1.5">{l.t("العقود والحقوق","Contracts")}{unsignedProjectsCount>0&&<span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white animate-pulse">{unsignedProjectsCount}</span>}</TabsTrigger><TabsTrigger value="guidelines">{l.t("دليل النشر والدعم","Guidelines")}</TabsTrigger></TabsList>
 <TabsContent value="projects" className="mt-8 space-y-5">{isError&&<p className="text-destructive">{l.t("تعذر تحميل المشروعات","Could not load projects")}</p>}{projects.length===0&&<StudioEmpty text={l.t("لا توجد ملفات بعد","No manuscripts yet")}/>} {projects.map(p=><article key={p.id} className="rounded-lg border bg-card p-6"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold">{p.title}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString(l.language)}</p></div><Stage value={p.stage}/></div><div className="mt-6 grid grid-cols-3 gap-2 border-y py-4 text-xs sm:grid-cols-6">{["review","accepted","invoiced","production","ready","published"].map((s,i)=><div key={s} className="space-y-2"><span className={`grid h-7 w-7 place-items-center rounded-full ${["review","accepted","invoiced","production","ready","published"].indexOf(p.stage)>=i?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{i+1}</span><Stage value={s}/></div>)}</div>{p.review_note&&<p className="mt-4 border-s-2 border-primary ps-3 text-sm">{p.review_note}</p>}<div className="mt-4 flex flex-wrap gap-2">{p.manuscript_versions.map(v=><Button key={v.id} variant="outline" size="sm" onClick={()=>downloadAuthorFile(v.file_path)}><Download className="me-2 h-4 w-4"/><span className="max-w-48 truncate">{v.file_name}</span></Button>)}{!isContractSigned(p.id)&&["review","accepted","invoiced"].includes(p.stage)&&<Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-500/10" onClick={()=>setTab("contracts")}>{l.t("توقيع عقد النشر (مطلوب قبل الإنتاج)","Sign Contract (Required)")}</Button>}{p.stage==="revision"&&<Button size="sm" onClick={()=>{setRevision(p);setTab("new");}}>{l.t("رفع التعديل","Upload revision")}</Button>}{p.final_path&&<Button onClick={()=>downloadAuthorFile(p.final_path??"")}><Download className="me-2 h-4 w-4"/>{l.t("نسختي النهائية","My final copy")}</Button>}</div><details className="mt-5 text-xs text-muted-foreground"><summary className="cursor-pointer">{l.t("سجل المشروع","Project history")}</summary><ul className="mt-3 space-y-2">{[...p.production_events].sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(e=><li key={e.id}><Stage value={e.stage}/> · {new Date(e.created_at).toLocaleString(l.language)} {e.note}</li>)}</ul></details></article>)}</TabsContent>
 <TabsContent value="new" className="mt-8">{!revision&&bookLimitReached?(<div className="max-w-2xl rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-4"><h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">{l.t(`تم استهلاك حد الباقة (${usedBooksCount} من ${maxBooksAllowed} كتب)`,`Plan limit reached (${usedBooksCount} of ${maxBooksAllowed} books)`)}</h2><p className="text-sm text-muted-foreground">{l.t("تسمح باقتك الحالية برفع العدد المحدد من الكتب فقط. لاختيار باقة أكبر ورفع كتب إضافية، قم باختيار باقة نشر جديدة.","Your active plan allows uploading only its included number of books. Choose a new publishing plan to upload more.")}</p><div className="flex flex-wrap gap-3"><Button asChild className="rounded-xl font-bold"><Link to="/author" search={{view:"plans"}}>{l.t("اختيار / ترقية الباقة الآن","Choose / Upgrade Plan")}</Link></Button><Button variant="outline" onClick={()=>setTab("projects")}>{l.t("العودة لمشروعاتي","Back to Projects")}</Button></div></div>):(uid&&<ManuscriptForm uid={uid} revision={revision} remaining={remainingBooksCount} maxBooks={maxBooksAllowed} done={()=>{setRevision(null);setTab("projects");qc.invalidateQueries();}}/>)}</TabsContent>
 <TabsContent value="invoices" className="mt-8 space-y-4">{invoicesSection}</TabsContent>
 <TabsContent value="books" className="mt-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map(b=><article key={b.id} className="flex gap-4 rounded-lg border bg-card p-4">{b.cover_url?<img src={b.cover_url} alt={b.title} className="h-28 w-20 rounded object-cover"/>:<BookOpen className="h-12 w-12 text-primary"/>}<div><h2 className="text-lg font-semibold">{b.title}</h2><p className="mt-2 text-xs">{l.t(b.status==="approved"?"منشور":"قيد المراجعة",b.status==="approved"?"Published":"In review")}</p><p className="mt-3 font-mono text-xs">{author?.author_code}</p></div></article>)}</div>{books.length===0&&<StudioEmpty text={l.t("لا توجد كتب منشورة بعد","No published books yet")}/>}</TabsContent>
 <TabsContent value="earnings" className="mt-8"><div className="grid gap-8 lg:grid-cols-[1fr_320px]"><div><h2 className="text-2xl font-semibold">{l.t("كشف المبيعات المؤكدة","Confirmed sales statement")}</h2><p className="mt-2 text-sm text-muted-foreground">{l.t("70% رقمي · 30% ورقي · الشحن خارج الحسبة · الطباعة على دار عبيد","70% digital · 30% print · Shipping excluded · Printing by Dar Obaid")}</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-start text-sm"><thead className="border-y bg-muted"><tr>{[l.t("الكتاب","Book"),l.t("الكمية","Copies"),l.t("المبيعات","Sales"),l.t("حصتي","My share"),l.t("الحالة","Status")].map(h=><th key={h} className="p-3 text-start font-medium">{h}</th>)}</tr></thead><tbody>{earnings.map(e=><tr key={e.id} className="border-b"><td className="p-3">{e.book_title}<p className="text-xs text-muted-foreground">{e.format}</p></td><td>{e.quantity}</td><td>{e.gross} {e.currency}</td><td>{e.amount} {e.currency}</td><td>{l.t(e.reversed?"مسترد":"مؤكد",e.reversed?"Reversed":"Confirmed")}</td></tr>)}</tbody></table></div>{earnings.length===0&&<StudioEmpty text={l.t("لم تصل مبيعات مدفوعة مؤكدة بعد","No confirmed paid sales yet")}/>}<h3 className="mt-8 text-xl">{l.t("طلبات السحب","Withdrawal history")}</h3>{payouts.map(p=><div key={p.id} className="mt-3 flex flex-wrap justify-between gap-3 border-b pb-3 text-sm"><span>{p.amount} {p.currency}</span><Stage value={p.status}/><span>{p.reference}</span></div>)}</div><aside className="border-s ps-6"><Wallet className="h-7 w-7 text-primary"/><h3 className="mt-4 text-xl font-semibold">{l.t("رصيدي المتاح","Available balance")}</h3><Select value={currency} onValueChange={setCurrency}><SelectTrigger className="mt-4"><SelectValue/></SelectTrigger><SelectContent>{["SAR","EGP","USD","EUR","GBP","AED"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><p className="my-6 text-3xl font-semibold">{balance(currency).toFixed(2)} <span className="text-base">{currency}</span></p><Label htmlFor="transfer-details">{l.t("بيانات التحويل","Transfer details")}</Label><Textarea id="transfer-details" className="mt-2" value={details} onChange={e=>setDetails(e.target.value)}/><Button className="mt-4 w-full" disabled={busy||balance(currency)<=0||!isPayoutDay(new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()))} onClick={withdraw}>{l.t("طلب سحب الأرباح","Request withdrawal")}</Button><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{l.t("يوم 30 من كل شهر وآخر يوم في فبراير، بتوقيت مصر. تخضع الطلبات للمراجعة والتحويل؛ الطلب ليس تحويلاً تلقائياً.","Open on day 30 and February’s last day, Cairo time. Requests are reviewed before transfer; submission is not an automatic transfer.")}</p></aside></div></TabsContent>
 <TabsContent value="blurb" className="mt-8"><BlurbGenerator/></TabsContent>
 <TabsContent value="profile" className="mt-8"><AuthorProfileForm/></TabsContent>
 <TabsContent value="contracts" className="mt-8"><div className="rounded-2xl border bg-card p-6 md:p-8 space-y-6"><div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4"><div><h2 className="text-xl font-bold">{l.t("عقد النشر والتوزيع الإلكتروني — دار عبيد / unibook", "Electronic Publishing & Distribution Contract — Dar Obaid / unibook")}</h2><p className="text-xs text-muted-foreground mt-1">{l.t("الطرف الثاني: محمد السيد محمود عبيد — مالك ومدير دار عبيد للنشر والتوزيع والطباعة (عضو اتحاد الناشرين المصريين)", "Second Party: Mohamed El-Sayed Mahmoud Obaid — Dar Obaid Publishing & Distribution")}</p></div><span className="font-mono text-xs rounded-full bg-primary/10 text-primary px-3 py-1">{author?.author_code || "UB-AUTHOR"}</span></div><div className="grid gap-3 sm:grid-cols-4 text-sm"><div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("حصة المؤلف (رقمي)", "Author Digital Share")}</p><p className="mt-1 text-2xl font-bold text-primary">70%</p><p className="text-[11px] text-muted-foreground">{l.t("30% لدار النشر", "30% Publisher")}</p></div><div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("حصة المؤلف (ورقي)", "Author Print Share")}</p><p className="mt-1 text-2xl font-bold text-primary">30%</p><p className="text-[11px] text-muted-foreground">{l.t("70% لدار النشر", "70% Publisher")}</p></div><div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("مدة عقد الكتاب", "Contract Duration")}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{l.t("5 سنوات", "5 Years")}</p></div><div className="rounded-xl border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{l.t("موعد التحاسب", "Settlement Cycle")}</p><p className="mt-1 text-lg font-bold text-foreground">{l.t("نهاية كل شهر", "End of Month")}</p></div></div><div className="rounded-2xl border bg-muted/20 p-5 space-y-2.5 text-xs sm:text-sm leading-relaxed text-foreground"><p className="font-bold text-primary">{l.t("بنود العقد الإلكتروني الملزم بين الطرفين:", "Binding Electronic Contract Clauses:")}</p><ol className="space-y-2 list-decimal ps-5 text-muted-foreground"><li><strong className="text-foreground">{l.t("أولاً (التكليف والنشر):", "1. Grant of Rights:")}</strong> {l.t("يعهد الطرف الأول (المؤلف) للطرف الثاني (دار عبيد للنشر والتوزيع / منصة unibook) بنشر وتوزيع كتابه رقمياً وورقياً عبر المنصة وشبكة التوزيع.", "Author grants Dar Obaid / unibook rights to publish and distribute the book digitally and in print.")}</li><li><strong className="text-foreground">{l.t("ثانياً (نسب الأرباح):", "2. Revenue Split:")}</strong> {l.t("يحصل المؤلف على 70% من صافي مبيعات النسخة الرقمية (و30% للدار)، وعلى 30% من مبيعات النسخة الورقية (و70% للدار لتغطية جودة الطباعة والتوزيع والشحن).", "Author receives 70% digital / 30% print; Publisher receives 30% digital / 70% print.")}</li><li><strong className="text-foreground">{l.t("ثالثاً (مدة العقد):", "3. Term:")}</strong> {l.t("مدة هذا العقد 5 سنوات ميلادية تبدأ من تاريخ التوقيع الإلكتروني والاعتماد.", "Contract term is 5 years from electronic signature.")}</li><li><strong className="text-foreground">{l.t("رابعاً (التحاسب المالي):", "4. Monthly Settlement:")}</strong> {l.t("يتم التحاسب وصرف المستحقات في نهاية كل شهر (يوم 30 من كل شهر وآخر يوم في فبراير بتوقيت القاهرة) بعد استقطاع أي ضرائب أو رسوم قانونية إن وجدت.", "Settlement occurs at the end of every month (Cairo time).") }</li><li><strong className="text-foreground">{l.t("خامساً (حماية الشعار):", "5. Brand Protection:")}</strong> {l.t("عند انتهاء مدة العقد ورغبة الطرف الأول في نشر الكتاب بمعرفته أو لدى ناشر آخر لا يجوز له استخدام شعار أو هوية الطرف الثاني.", "Upon expiration, the publisher logo/trademark may not be reused elsewhere.")}</li><li><strong className="text-foreground">{l.t("سادساً (المسؤولية القانونية والملكية الفكرية):", "6. IP & Legal Liability:")}</strong> {l.t("مضمون الكتاب مسؤولية الطرف الأول وحده، ويقر بأنه لا يخالف القانون أو النظام العام دون أدنى مسؤولية على الطرف الثاني، ولا يجوز للغير النقل أو الاقتباس إلا بإذن مكتوب من المؤلف.", "Content legality is solely the author's responsibility; IP remains with the author.")}</li><li><strong className="text-foreground">{l.t("سابعاً (حجية التوقيع الإلكتروني):", "7. Electronic Execution:")}</strong> {l.t("توقيع هذا العقد إلكترونياً ملزم للطرفين بعد استلام ملف الكتاب وقبل بدء الإنتاج والنشر، وله نفس قوة النفاذ القانونية.", "Electronic signature is legally binding prior to production and publication.")}</li></ol></div>{uid&&<ContractSigningSection uid={uid} projects={projects} authorName={author?.store_name||""} authorCode={author?.author_code||""} isContractSigned={isContractSigned} onSigned={()=>{refetchContracts();qc.invalidateQueries();}}/>}</div></TabsContent>
 <TabsContent value="guidelines" className="mt-8"><div className="rounded-2xl border bg-card p-6 md:p-8 space-y-5"><h2 className="text-xl font-bold">{l.t("دليل تجهيز الملفات والدعم الفني للمؤلف", "Author File Guidelines & Support")}</h2><div className="grid gap-4 sm:grid-cols-2 text-sm"><div className="rounded-xl border p-4 space-y-2"><h3 className="font-bold text-primary">{l.t("1. شروط ملف الكتاب (Word)", "1. Word File Requirements")}</h3><p className="text-muted-foreground text-xs leading-relaxed">{l.t("رفع ملف بصيغة .doc أو .docx منسقاً بالعناوين والفصول ومزوداً بنبذة تعريفية دقيقة.", "Upload a clean .doc or .docx file with formatted headings and an accurate synopsis.")}</p></div><div className="rounded-xl border p-4 space-y-2"><h3 className="font-bold text-primary">{l.t("2. دورة الموافقة والإنتاج", "2. Approval & Production Cycle")}</h3><p className="text-muted-foreground text-xs leading-relaxed">{l.t("يتابع المؤلف حالة ملفه لحظياً من تبويب (المؤلفات ومراحل الإنتاج) حتى صدوره في المتجر.", "Track your file live from the Book Projects tab through production until store release.")}</p></div></div><div className="pt-2"><Button asChild className="rounded-xl"><a href="https://wa.me/966563057356" target="_blank" rel="noopener noreferrer">{l.t("تواصل مباشر مع دعم المؤلفين", "Contact Author Support")}</a></Button></div></div></TabsContent>
 </Tabs></div>;
}
function StudioEmpty({text}:{text:string}){return <p className="border-b py-14 text-center text-muted-foreground">{text}</p>;}
function InvoicePaymentBox({uid,invoice,onSubmitted}:{uid:string;invoice:{id:string;invoice_number:string;amount:number;currency:string;payment_reference?:string|null};onSubmitted:()=>void}){
 const {t}=useLocale();
 const wallet=getAdminWalletNumber();
 const [open,setOpen]=useState(false);
 const [sender,setSender]=useState("");
 const [ref,setRef]=useState("");
 const [receipt,setReceipt]=useState<File|null>(null);
 const [saving,setSaving]=useState(false);
 const [sent,setSent]=useState(()=>{
   if(invoice.payment_reference) return true;
   try{return Boolean(typeof window!=="undefined"&&window.localStorage.getItem(`unibook_inv_paid_${invoice.id}`));}catch{return false;}
 });

 async function submitProof(e:React.FormEvent){
  e.preventDefault();
  if(!sender.trim()||!ref.trim()){toast.error(t("يرجى إدخال رقم المحفظة المحوّل منها ورقم المرجع","Enter sender wallet and transfer reference"));return;}
  setSaving(true);
  try{
   let receiptPath="";
   if(receipt){
    const ext=receipt.name.split(".").pop()?.toLowerCase()||"jpg";
    const p=`${uid}/invoice-receipt-${invoice.id}.${ext}`;
    const {error:upErr}=await supabase.storage.from("author-documents").upload(p,receipt,{upsert:true});
    if(!upErr) receiptPath=p;
   }
   const proofText=`اتصالات كاش (مصر) | من: ${sender.trim()} | مرجع: ${ref.trim()}${receiptPath?` | إيصال: ${receiptPath}`:""}`;
   await supabase.from("production_invoices").update({payment_reference:proofText}).eq("id",invoice.id);
   if(typeof window!=="undefined") window.localStorage.setItem(`unibook_inv_paid_${invoice.id}`,proofText);
   setSent(true);
   setOpen(false);
   toast.success(t("تم إرسال تأكيد التحويل عبر اتصالات كاش للإدارة بنجاح","Etisalat Cash transfer confirmation sent to admin"));
   onSubmitted();
  }catch{
   toast.error(t("تعذر إرسال تأكيد الدفع، حاول مجدداً","Failed to submit payment confirmation"));
  }finally{
   setSaving(false);
  }
 }

 return <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="space-y-1">
    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
     <Smartphone className="h-4 w-4"/>{t("طريقة السداد: محفظة اتصالات كاش — مصر (Etisalat Cash)","Payment Method: Etisalat Cash Wallet (Egypt)")}
    </p>
    <p className="text-xs text-muted-foreground">
     {t("قم بتحويل مبلغ","Transfer")} <strong>{Number(invoice.amount).toFixed(2)} {invoice.currency}</strong> {t("إلى رقم محفظة اتصالات كاش المعتمدة:","to the approved Etisalat Cash wallet:")}{" "}
     <span dir="ltr" className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">{wallet}</span>
    </p>
   </div>
   <div className="flex items-center gap-2">
    <Button type="button" size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={()=>{navigator.clipboard?.writeText(wallet);toast.success(t("تم نسخ رقم المحفظة","Wallet number copied"));}}>
     <Copy className="h-3.5 w-3.5 me-1"/>{t("نسخ الرقم","Copy")}
    </Button>
    {!sent&&(
     <Button type="button" size="sm" className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={()=>setOpen(!open)}>
      <Wallet className="h-3.5 w-3.5 me-1"/>{t("تأكيد الدفع عبر اتصالات كاش","Confirm Etisalat Cash Payment")}
     </Button>
    )}
   </div>
  </div>
  {sent&&(
   <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2 font-semibold">
    <CheckCircle2 className="h-4 w-4 shrink-0"/>
    <span>{t("تم إرسال بيانات التحويل للإدارة وبانتظار مراجعة وتأكيد الاستلام لبدء الإنتاج.","Transfer details sent to admin. Production will begin once verified.")}{invoice.payment_reference?` (${invoice.payment_reference})`:""}</span>
   </div>
  )}
  {open&&!sent&&(
   <form onSubmit={submitProof} className="grid gap-3 sm:grid-cols-2 border-t border-emerald-500/20 pt-3">
    <div>
     <Label className="text-xs">{t("رقم محفظة اتصالات المحوّل منها","Sender Etisalat Cash Number")}</Label>
     <Input dir="ltr" required placeholder="011XXXXXXXX" className="mt-1 h-9 text-xs" value={sender} onChange={e=>setSender(e.target.value)}/>
    </div>
    <div>
     <Label className="text-xs">{t("رقم مرجع التحويل / العملية","Transfer Reference Number")}</Label>
     <Input dir="ltr" required placeholder="REF-123456" className="mt-1 h-9 text-xs" value={ref} onChange={e=>setRef(e.target.value)}/>
    </div>
    <div className="sm:col-span-2">
     <Label className="text-xs">{t("صورة إيصال التحويل (اختياري)","Transfer Screenshot (Optional)")}</Label>
     <Input type="file" accept="image/*,.pdf" className="mt-1 h-9 text-xs" onChange={e=>setReceipt(e.target.files?.[0]??null)}/>
    </div>
    <div className="sm:col-span-2 flex justify-end gap-2">
     <Button type="button" size="sm" variant="outline" onClick={()=>setOpen(false)}>{t("إلغاء","Cancel")}</Button>
     <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">{saving?t("جارٍ الإرسال…","Sending…"):t("إرسال تأكيد التحويل","Submit Transfer Proof")}</Button>
    </div>
   </form>
  )}
 </div>;
}
function ContractSigningSection({uid,projects,authorName,authorCode,isContractSigned,onSigned}:{uid:string;projects:{id:string;title:string;stage:string}[];authorName:string;authorCode:string;isContractSigned:(id:string)=>boolean;onSigned:()=>void}){
 const {t}=useLocale();
 const [signer,setSigner]=useState(authorName);
 const [idNumber,setIdNumber]=useState("");
 const [agreed,setAgreed]=useState(false);
 const [signingId,setSigningId]=useState<string|null>(null);

 async function signContract(project:{id:string;title:string}){
  if(!agreed){toast.error(t("يرجى الموافقة على بنود العقد أولاً","Please agree to the contract terms first"));return;}
  if(!signer.trim()){toast.error(t("يرجى كتابة الاسم الكامل للتوقيع","Please enter your full name to sign"));return;}
  setSigningId(project.id);
  try{
   if(!idNumber.trim()){toast.error(t("يرجى إدخال رقم البطاقة الشخصية أو جواز السفر","Please enter National ID or Passport number"));return;}const payload={manuscriptId:project.id,title:project.title,authorName,authorCode,signedBy:signer.trim(),idNumber:idNumber.trim(),durationYears:5,authorDigitalShare:"70%",publisherDigitalShare:"30%",authorPrintShare:"30%",publisherPrintShare:"70%",settlement:"نهاية كل شهر",signedAt:new Date().toISOString(),status:"signed"};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
   const {error}=await supabase.storage.from("author-documents").upload(`${uid}/contract-${project.id}.json`,blob,{upsert:true,contentType:"application/json"});
   if(error)throw error;
   if(typeof window!=="undefined")window.localStorage.setItem(`unibook_contract_signed_${project.id}`,JSON.stringify(payload));
   toast.success(t(`تم توقيع عقد النشر لكتاب (${project.title}) بنجاح`,`Publishing contract signed for (${project.title})`));
   onSigned();
  }catch{
   toast.error(t("تعذر حفظ توقيع العقد، حاول مجدداً","Could not save contract signature"));
  }finally{
   setSigningId(null);
  }
 }

 return <div className="border-t pt-5 space-y-4">
  <h3 className="text-base font-bold text-foreground">{t("توقيع عقد النشر الإلكتروني (مطلوب بعد استلام الملف وقبل الإنتاج)","Electronic Contract Signing (Required Before Production)")}</h3>
  {projects.length===0?(
   <p className="text-xs text-muted-foreground">{t("قم برفع ملف الكتاب أولاً لتتمكن من توقيع عقد النشر الخاص به.","Upload your book file first to sign its publishing contract.")}</p>
  ):(
   <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-3">
     <div>
      <Label className="text-xs">{t("الاسم الكامل للتوقيع الإلكتروني","Full Name for E-Signature")}</Label>
      <Input className="mt-1 h-9 text-xs" value={signer} onChange={e=>setSigner(e.target.value)} placeholder={t("اكتب اسمك الكامل","Enter full name")}/>
     </div>
     <div>
      <Label className="text-xs">{t("رقم البطاقة الشخصية / جواز السفر","National ID / Passport No.")}</Label>
      <Input dir="ltr" className="mt-1 h-9 text-xs font-mono" value={idNumber} onChange={e=>setIdNumber(e.target.value)} placeholder="2900XXXXXXXXXX"/>
     </div>
     <div className="flex items-end">
      <label className="flex items-center gap-2 text-xs cursor-pointer select-none pb-2">
       <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="h-4 w-4 accent-primary rounded"/>
       <span>{t("أقر بمراجعة بنود عقد النشر وحقوق الملكية والموافقة عليها","I agree to the publishing contract terms & IP rights")}</span>
      </label>
     </div>
    </div>
    <div className="space-y-2">
     {projects.map(p=>{
      const signed=isContractSigned(p.id);
      return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3 text-xs">
       <div>
        <span className="font-bold text-sm text-foreground">{p.title}</span>
        <span className="ms-2"><Stage value={p.stage}/></span>
       </div>
       {signed?(
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1 font-bold">
         <CheckCircle2 className="h-3.5 w-3.5"/>{t("تم توقيع العقد","Contract Signed")}
        </span>
       ):(
        <Button size="sm" disabled={signingId===p.id} onClick={()=>signContract(p)} className="h-8 rounded-lg font-bold">
         {signingId===p.id?t("جارٍ التوقيع…","Signing…"):t("توقيع العقد الآن","Sign Contract Now")}
        </Button>
       )}
      </div>;
     })}
    </div>
   </div>
  )}
 </div>;
}
function ManuscriptForm({uid,revision,remaining,maxBooks,done}:{uid:string;revision:Tables<"manuscripts">|null;remaining:number;maxBooks:number;done:()=>void}){
 const {t}=useLocale();const [title,setTitle]=useState("");const [name,setName]=useState("");const [synopsis,setSynopsis]=useState("");const [format,setFormat]=useState<"digital"|"physical"|"both">("both");const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();if(!revision&&remaining<=0){toast.error(t(`وصلت للحد الأقصى للباقة (${maxBooks} كتب). يرجى ترقية الباقة.`,`Plan limit reached (${maxBooks} books). Please upgrade.`));return;}if(!file||!/\.(docx?|pdf)$/i.test(file.name)){toast.error(t("يرجى اختيار ملف بصيغة Word أو PDF","Please choose a Word or PDF file"));return;}setBusy(true);try{const path=`${uid}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;const {error:up}=await supabase.storage.from("author-documents").upload(path,file,{upsert:true});if(up)throw up;const {error}=await supabase.rpc("submit_manuscript",{_title:revision?.title??title,_author_name:revision?.author_name??name,_synopsis:revision?.synopsis??synopsis,_format:revision?.format??format,_path:path,_filename:file.name,...(revision?{_id:revision.id}:{})});if(error)throw error;toast.success(t("أُرسل الملف للمراجعة","Manuscript sent for review"));done();}catch(err){console.error("Manuscript submit error:",err);const msg=(err as {message?:string})?.message||"";toast.error(t(`تعذر إرسال الملف${msg?`: ${msg}`:"، تحقق منه وحاول مجدداً"}`,`Could not submit manuscript${msg?`: ${msg}`:". Check your file and retry."}`));}finally{setBusy(false);}}
 return <form onSubmit={submit} className="max-w-3xl space-y-5"><h2 className="text-2xl font-semibold">{revision?t(`تعديل: ${revision.title}`,`Revision: ${revision.title}`):t("رفع ملف مؤلف جديد","Upload New Author File")}</h2>{!revision&&<><div><Label htmlFor="manuscript-title">{t("عنوان الكتاب","Book title")}</Label><Input id="manuscript-title" required value={title} onChange={e=>setTitle(e.target.value)}/></div><div><Label htmlFor="manuscript-author">{t("اسم المؤلف على الكتاب","Author name on book")}</Label><Input id="manuscript-author" required value={name} onChange={e=>setName(e.target.value)}/></div><div><Label htmlFor="manuscript-synopsis">{t("نبذة عن الكتاب","Synopsis")}</Label><Textarea id="manuscript-synopsis" required value={synopsis} onChange={e=>setSynopsis(e.target.value)}/></div><div><Label>{t("صيغة النشر","Publishing format")}</Label><Select value={format} onValueChange={v=>{if(v==="digital"||v==="physical"||v==="both")setFormat(v);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="both">{t("رقمي وورقي","Digital & print")}</SelectItem><SelectItem value="digital">{t("رقمي","Digital")}</SelectItem><SelectItem value="physical">{t("ورقي","Print")}</SelectItem></SelectContent></Select></div></>}<div><Label htmlFor="word-file">{t("ملف الكتاب (Word أو PDF)","Book file (Word or PDF)")}</Label><Input id="word-file" type="file" accept=".doc,.docx,.pdf" required onChange={e=>setFile(e.target.files?.[0]??null)}/></div><Button disabled={busy} size="lg"><FileText className="me-2 h-4 w-4"/>{busy?t("جارٍ الإرسال…","Submitting…"):t("إرسال للمراجعة","Submit for review")}</Button></form>;
}