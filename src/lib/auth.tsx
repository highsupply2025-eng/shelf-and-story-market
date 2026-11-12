import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRoleType = "reader" | "author" | "publisher" | "admin";

// Keys left behind by the old browser-only account fallback. They never
// reached the database, so they are removed on load and on sign-out.
const LEGACY_LOCAL_KEYS = [
  "unibook_local_users",
  "unibook_local_session",
  "unibook_fix_local_user_role_v2",
  "unibook_fix_author_role_v2",
  "admin_login_pending",
];

export function isNetworkOrFetchError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message}`
        : typeof (err as { message?: string })?.message === "string"
          ? `${(err as { name?: string }).name || ""} ${(err as { message: string }).message}`
          : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("authretryablefetcherror") ||
    lower.includes("err_name_not_resolved")
  );
}

/** Removes leftovers of the old browser-only accounts (never real accounts). */
export function clearLocalSession(): void {
  if (typeof window === "undefined") return;
  try {
    for (const k of LEGACY_LOCAL_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Account type chosen at sign-up, stored on the auth user. */
export function metadataAccountType(session: Session | null): "reader" | "author" | "publisher" | null {
  const t = session?.user.user_metadata?.["account_type"];
  return t === "reader" || t === "author" || t === "publisher" ? t : null;
}

type AuthState = {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isPublisher: boolean;
  isAuthor: boolean;
  isReader: boolean;
  accountType: UserRoleType;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  loading: true,
  isAdmin: false,
  isPublisher: false,
  isAuthor: false,
  isReader: true,
  accountType: "reader",
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<UserRoleType>("reader");

  async function loadFlags(s: Session | null) {
    if (!s) {
      setAccountType("reader");
      return;
    }
    const meta = metadataAccountType(s);
    // Show the sign-up choice immediately; the database decides admin.
    setAccountType(meta ?? "reader");
    try {
      const [{ data: roles }, { data: pub }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", s.user.id),
        supabase.from("publishers").select("id").eq("id", s.user.id).maybeSingle(),
      ]);
      if (roles?.some((r) => r.role === "admin")) {
        setAccountType("admin");
        return;
      }
      setAccountType(meta ?? (pub ? "publisher" : "reader"));
    } catch {
      /* keep the metadata role when the backend is unreachable */
    }
  }

  useEffect(() => {
    clearLocalSession();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      setTimeout(() => void loadFlags(s), 0);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        return loadFlags(data.session);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        isAdmin: accountType === "admin",
        isPublisher: accountType === "publisher",
        isAuthor: accountType === "author",
        isReader: accountType === "reader",
        accountType,
        refresh: async () => {
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          await loadFlags(data.session);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
