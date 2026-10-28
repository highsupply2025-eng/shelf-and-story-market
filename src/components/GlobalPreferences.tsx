import { Globe2 } from "lucide-react";
import { countries, useLocale } from "@/lib/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function GlobalPreferences(){
 const l=useLocale();
 return <div className="border-t border-border bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-xs">
 <Globe2 className="h-4 w-4 text-primary"/>
 <Select value={l.language} onValueChange={language=>l.set({language})}><SelectTrigger aria-label="Language" className="h-8 w-28"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>
 <Select value={l.country} onValueChange={country=>l.set({country,currency:countries.find(c=>c[0]===country)?.[3]??"USD"})}><SelectTrigger aria-label={l.t("بلد القارئ","Reader country")} className="h-8 w-40"><SelectValue/></SelectTrigger><SelectContent>{countries.map(c=><SelectItem key={c[0]} value={c[0]}>{l.language==="ar"?c[1]:c[2]}</SelectItem>)}</SelectContent></Select>
 <Select value={l.currency} onValueChange={currency=>l.set({currency})}><SelectTrigger aria-label={l.t("العملة","Currency")} className="h-8 w-24"><SelectValue/></SelectTrigger><SelectContent>{["EGP","USD","EUR","GBP","SAR","AED"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
 <span className="ms-auto text-muted-foreground">{l.t("التحصيل غير مفعّل · الأسعار المحوّلة تقديرية","Payments not connected · Converted prices are estimates")}</span>
 {l.updated&&<span className="w-full text-muted-foreground">{l.t("آخر تحديث للصرف:","Exchange rates updated:")} {new Date(l.updated).toLocaleDateString(l.language)}</span>}
 </div></div>;
}