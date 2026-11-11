import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRoleType = "reader" | "author" | "publisher" | "admin";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPublisher, setIsPublisher] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReader, setIsReader] = useState(true);
  const [accountType, setAccountType] = useState<UserRoleType>("reader");

  async function loadFlags(s: Session | null) {
    if (!s) {
      setIsAdmin(false);
      setIsPublisher(false);
      setIsAuthor(false);
      setIsReader(true);
      setAccountType("reader");
      return;
    }
    const isSpecialAdminEmail = s.user.email?.toLowerCase().trim() === "highsupply2025@gmail.com";
    const [{ data: roles }, { data: pub }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
      supabase.from("publishers").select("id, store_name").eq("id", s.user.id).maybeSingle(),
    ]);

    const admin = isSpecialAdminEmail || !!roles?.some((r) => r.role === "admin");
    const metaType = s.user.user_metadata?.["account_type"] as UserRoleType | undefined;

    let role: UserRoleType = "reader";
    if (admin) {
      role = "admin";
    } else if (metaType === "publisher") {
      role = "publisher";
    } else if (metaType === "author") {
      role = "author";
    } else if (metaType === "reader") {
      role = "reader";
    } else if (pub) {
      role = "publisher";
    }

    setIsAdmin(admin);
    setIsPublisher(role === "publisher" || (!admin && !!pub && role !== "author"));
    setIsAuthor(role === "author");
    setIsReader(role === "reader");
    setAccountType(role);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => loadFlags(s), 0);
      // Admin magic-link sign-in: always land on the admin dashboard
      if (s && typeof window !== "undefined") {
        try {
          const pending = Number(window.localStorage.getItem("admin_login_pending") || 0);
          const isAdminEmail = s.user.email?.toLowerCase().trim() === "highsupply2025@gmail.com";
          if (pending && isAdminEmail) {
            window.localStorage.removeItem("admin_login_pending");
            if (Date.now() - pending < 2 * 60 * 60 * 1000 && !window.location.pathname.startsWith("/admin")) {
              window.location.assign("/admin");
            }
          }
        } catch {
          /* ignore storage errors */
        }
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadFlags(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        isAdmin,
        isPublisher,
        isAuthor,
        isReader,
        accountType,
        refresh: () => loadFlags(session),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
