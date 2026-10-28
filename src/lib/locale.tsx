import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getExchangeRates } from "@/lib/exchange.functions";

export const countries: [string,string,string,string][] = [
  ["EG","مصر","Egypt","EGP"], ["SA","السعودية","Saudi Arabia","SAR"], ["AE","الإمارات","United Arab Emirates","AED"],
  ["US","الولايات المتحدة","United States","USD"], ["GB","المملكة المتحدة","United Kingdom","GBP"], ["FR","فرنسا","France","EUR"],
  ["DE","ألمانيا","Germany","EUR"], ["OTHER","بلد آخر","Other country","USD"],
];
type Preferences = { language: string; country: string; currency: string };
type LocaleState = Preferences & { t: (ar: string,en: string)=>string; set: (next: Partial<Preferences>)=>void; price:(n:number|null|undefined,base?:string)=>string; updated: string|null; };
const Ctx = createContext<LocaleState>({ language:"ar",country:"EG",currency:"SAR",t:(ar)=>ar,set:()=>{},price:(n)=>`${n ?? "—"} SAR`,updated:null });
export function LocaleProvider({children}:{children:ReactNode}) {
  const {session}=useAuth();
  const [prefs,setPrefs]=useState<Preferences>({language:"ar",country:"EG",currency:"SAR"});
  const {data}=useQuery({queryKey:["exchange-rates"],queryFn:()=>getExchangeRates(),staleTime:3600000});
  useEffect(()=> { try { const saved=JSON.parse(localStorage.getItem("rafoof-locale")||"null"); if(saved) setPrefs(saved); } catch {} },[]);
  useEffect(()=> { if(!session) return; supabase.from("profiles").select("language,country,currency").eq("id",session.user.id).maybeSingle().then(({data})=>{if(data) setPrefs(data);}); },[session?.user.id]);
  useEffect(()=>{document.documentElement.lang=prefs.language;document.documentElement.dir=prefs.language==="ar"?"rtl":"ltr";},[prefs.language]);
  const set=(next:Partial<Preferences>)=>{const value={...prefs,...next};setPrefs(value);localStorage.setItem("rafoof-locale",JSON.stringify(value));if(session) supabase.from("profiles").update(value).eq("id",session.user.id).then(({error})=>{if(error) console.error("Preference save failed");});};
  const price=(n:number|null|undefined,base="SAR")=>{
    if(n==null) return "—";
    const rate=data?.rates[prefs.currency];const baseRate=data?.rates[base];
    const converted=rate && baseRate ? n*rate/baseRate : n;
    const currency=rate && baseRate ? prefs.currency : base;
    return `${currency!==base?"≈ ":""}${new Intl.NumberFormat(prefs.language==="ar"?"ar-EG":"en-US",{style:"currency",currency,maximumFractionDigits:2}).format(converted)}`;
  };
  return <Ctx.Provider value={{...prefs,set,price,t:(ar,en)=>prefs.language==="ar"?ar:en,updated:data?.updated??null}}>{children}</Ctx.Provider>;
}
export const useLocale=()=>useContext(Ctx);