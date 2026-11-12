import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureAccountApprovalRecord, getAccountApprovals } from "@/lib/admin-store";

export type UserRoleType = "reader" | "author" | "publisher" | "admin";

const LOCAL_USERS_KEY = "unibook_local_users";
const LOCAL_SESSION_KEY = "unibook_local_session";
const AUTH_EVENT = "unibook-auth-changed";

export interface LocalUserRecord {
  id: string;
  email: string;
  password?: string;
  displayName: string;
  accountType: "reader" | "author" | "publisher";
  publisherName?: string;
  authorCode: string;
  createdAt: string;
}

export function isNetworkOrFetchError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message}`
        : typeof (err as { message?: string; name?: string })?.message === "string"
          ? `${(err as { name?: string }).name || ""} ${(err as { message: string }).message}`
          : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("enotfound") ||
    lower.includes("authretryablefetcherror") ||
    lower.includes("err_name_not_resolved")
  );
}

export function getLocalUsers(): LocalUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUserRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

function deterministicIdFromEmail(email: string): string {
  let h1 = 0xdeadbeef ^ email.length;
  let h2 = 0x41c6ce57 ^ email.length;
  for (let i = 0; i < email.length; i++) {
    const ch = email.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-a${hex1.slice(1, 4)}-${hex1}${hex2.slice(0, 4)}`;
}

function buildSessionFromRecord(rec: LocalUserRecord): Session {
  const nowSec = Math.floor(Date.now() / 1000);
  const user: User = {
    id: rec.id,
    aud: "authenticated",
    role: "authenticated",
    email: rec.email,
    email_confirmed_at: rec.createdAt,
    created_at: rec.createdAt,
    updated_at: rec.createdAt,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      display_name: rec.displayName,
      account_type: rec.accountType,
      publisher_name: rec.publisherName || "",
      author_code: rec.authorCode,
    },
  };
  return {
    access_token: `local_token_${rec.id}`,
    refresh_token: `local_refresh_${rec.id}`,
    expires_in: 86400 * 30,
    expires_at: nowSec + 86400 * 30,
    token_type: "bearer",
    user,
  };
}

export function getLocalSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Session;
      if (parsed && parsed.user && parsed.user.id) {
        return parsed;
      }
    }
    // Also check cached Supabase auth token in localStorage for instant 0ms hydration
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const sbRaw = window.localStorage.getItem(k);
        if (sbRaw) {
          const sbParsed = JSON.parse(sbRaw) as Session;
          if (sbParsed && sbParsed.user && sbParsed.user.id) {
            return sbParsed;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    /* ignore */
  }
}

export function registerLocalUser(params: {
  id?: string | undefined;
  email: string;
  password?: string | undefined;
  displayName: string;
  accountType: "reader" | "author" | "publisher";
  publisherName?: string | undefined;
}): { session: Session; user: User; record: LocalUserRecord } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const users = getLocalUsers();
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
  const existing = existingIdx >= 0 ? users[existingIdx] : undefined;

  const id = params.id || existing?.id || deterministicIdFromEmail(normalizedEmail);
  const authorCode = existing?.authorCode || `UB-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

  const record: LocalUserRecord = {
    id,
    email: normalizedEmail,
    password: params.password ?? existing?.password ?? "",
    displayName: params.displayName.trim() || existing?.displayName || normalizedEmail.split("@")[0] || "مستخدم unibook",
    accountType: params.accountType,
    publisherName: params.publisherName?.trim() || existing?.publisherName || "",
    authorCode,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    users[existingIdx] = record;
  } else {
    users.push(record);
  }
  saveLocalUsers(users);

  ensureAccountApprovalRecord({
    userId: id,
    role: params.accountType,
    name: params.accountType === "publisher" && record.publisherName ? record.publisherName : record.displayName,
    email: normalizedEmail,
  });

  const session = buildSessionFromRecord(record);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event(AUTH_EVENT));
    } catch {
      /* ignore */
    }
  }

  return { session, user: session.user, record };
}

export function loginLocalUser(params: {
  email: string;
  password?: string | undefined;
}): { session: Session | null; user: User | null; error: string | null } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const users = getLocalUsers();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (existing) {
    if (existing.password && params.password && existing.password !== params.password) {
      return {
        session: null,
        user: null,
        error: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      };
    }
    ensureAccountApprovalRecord({
      userId: existing.id,
      role: existing.accountType,
      name: existing.accountType === "publisher" && existing.publisherName ? existing.publisherName : existing.displayName,
      email: normalizedEmail,
    });
    const session = buildSessionFromRecord(existing);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
        window.dispatchEvent(new Event(AUTH_EVENT));
      } catch {
        /* ignore */
      }
    }
    return { session, user: session.user, error: null };
  }

  const approvals = getAccountApprovals();
  const existingApproval = approvals.find((a) => a.email?.trim().toLowerCase() === normalizedEmail);

  const { session, user } = registerLocalUser({
    email: normalizedEmail,
    password: params.password,
    displayName: existingApproval?.name || normalizedEmail.split("@")[0] || "مؤلف unibook",
    accountType: existingApproval?.role || "author",
  });
  return { session, user, error: null };
}

function resolveSyncAccountType(s: Session | null): UserRoleType {
  if (!s) return "reader";
  const email = s.user.email?.trim().toLowerCase() || "";
  const isLocalToken = s.access_token?.startsWith("local_token_");
  if (!isLocalToken && email === "highsupply2025@gmail.com") return "admin";

  const localUsers = getLocalUsers();
  const localMatch = localUsers.find(
    (u) => u.id === s.user.id || (email && u.email.trim().toLowerCase() === email)
  );
  if (localMatch?.accountType) {
    return localMatch.accountType;
  }

  const approvals = getAccountApprovals();
  const approvalMatch = approvals.find(
    (a) => a.userId === s.user.id || (email && a.email?.trim().toLowerCase() === email)
  );
  if (approvalMatch?.role) {
    return approvalMatch.role;
  }

  const metaType = s.user.user_metadata?.["account_type"] as UserRoleType | undefined;
  if (metaType === "publisher" || metaType === "author" || metaType === "reader") {
    return metaType;
  }
  return "reader";
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
  const [session, setSession] = useState<Session | null>(() => getLocalSession());
  const [loading, setLoading] = useState<boolean>(() => !getLocalSession());
  const [isAdmin, setIsAdmin] = useState(
    () => resolveSyncAccountType(getLocalSession()) === "admin"
  );
  const [isPublisher, setIsPublisher] = useState(() => resolveSyncAccountType(getLocalSession()) === "publisher");
  const [isAuthor, setIsAuthor] = useState(() => resolveSyncAccountType(getLocalSession()) === "author");
  const [isReader, setIsReader] = useState(() => resolveSyncAccountType(getLocalSession()) === "reader");
  const [accountType, setAccountType] = useState<UserRoleType>(() => resolveSyncAccountType(getLocalSession()));

  async function loadFlags(s: Session | null) {
    const activeSession = s ?? getLocalSession();
    if (!activeSession) {
      setIsAdmin(false);
      setIsPublisher(false);
      setIsAuthor(false);
      setIsReader(true);
      setAccountType("reader");
      return;
    }

    const syncRole = resolveSyncAccountType(activeSession);
    if (syncRole !== "admin") {
      setAccountType(syncRole);
      setIsPublisher(syncRole === "publisher");
      setIsAuthor(syncRole === "author");
      setIsReader(syncRole === "reader");

      const displayName =
        (activeSession.user.user_metadata?.["display_name"] as string | undefined) ||
        (activeSession.user.user_metadata?.["full_name"] as string | undefined) ||
        activeSession.user.email?.split("@")[0] ||
        "مستخدم unibook";
      ensureAccountApprovalRecord({
        userId: activeSession.user.id,
        role: syncRole,
        name: displayName,
        email: activeSession.user.email || "",
      });
    } else {
      setIsAdmin(true);
      setIsPublisher(false);
      setIsAuthor(false);
      setIsReader(false);
      setAccountType("admin");
    }

    const isLocalToken = activeSession.access_token?.startsWith("local_token_");
    const isSpecialAdminEmail =
      !isLocalToken && activeSession.user.email?.toLowerCase().trim() === "highsupply2025@gmail.com";

    let roles: { role: string }[] | null = null;
    let pub: { id: string; store_name: string } | null = null;

    if (!isLocalToken) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const res = await Promise.race([
          Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", activeSession.user.id),
            supabase.from("publishers").select("id, store_name").eq("id", activeSession.user.id).maybeSingle(),
          ]),
          timeoutPromise,
        ]);
        if (res) {
          roles = res[0].data;
          pub = res[1].data;
        }
      } catch {
        /* fallback to user_metadata when offline */
      }
    }

    const admin = isSpecialAdminEmail || !!roles?.some((r) => r.role === "admin");
    const resolvedSyncRole = resolveSyncAccountType(activeSession);

    let role: UserRoleType = "reader";
    if (admin) {
      role = "admin";
    } else if (resolvedSyncRole === "publisher" || resolvedSyncRole === "author" || resolvedSyncRole === "reader") {
      role = resolvedSyncRole;
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
    const initialLocal = getLocalSession();
    if (initialLocal) {
      setSession(initialLocal);
      setLoading(false);
      loadFlags(initialLocal);
    }

    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const syncFromLocal = () => {
      const local = getLocalSession();
      setSession((prev) => {
        if (local) return local;
        if (prev?.access_token?.startsWith("local_token_")) return null;
        return prev;
      });
      setLoading(false);
      loadFlags(local);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_EVENT, syncFromLocal);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const effective = s ?? getLocalSession();
      setSession(effective);
      setLoading(false);
      setTimeout(() => loadFlags(effective), 0);
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

    supabase.auth
      .getSession()
      .then(({ data }) => {
        const effective = data?.session ?? getLocalSession();
        setSession(effective);
        setLoading(false);
        loadFlags(effective);
      })
      .catch(() => {
        const effective = getLocalSession();
        setSession(effective);
        setLoading(false);
        loadFlags(effective);
      });

    return () => {
      clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(AUTH_EVENT, syncFromLocal);
      }
    };
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
        refresh: async () => {
          const effective = getLocalSession() ?? session;
          if (effective !== session) setSession(effective);
          await loadFlags(effective);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
