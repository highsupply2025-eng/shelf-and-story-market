// Administrative state management for site control, approvals, and AI production
import { supabase } from "@/integrations/supabase/client";

export interface SiteBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  linkText: string;
  linkUrl: string;
  active: boolean;
  color: string;
}

export interface BookDiscount {
  bookId: string;
  discountPercent: number; // e.g. 20 for 20% off
  originalPriceDigital?: number | undefined;
  originalPricePhysical?: number | undefined;
  badgeText?: string; // e.g. "عرض خاص", "خصم 25%"
  endsAt?: string;
}

export interface AccountApproval {
  userId: string;
  role: "reader" | "author" | "publisher";
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: string;
  approvedAt?: string | undefined;
  notes?: string | undefined;
}

const CATEGORIES_KEY = "unibook_admin_categories";
const DISCOUNTS_KEY = "unibook_admin_discounts";
const APPROVALS_KEY = "unibook_admin_approvals";
const BANNERS_KEY = "unibook_admin_banners";
const MARQUEE_KEY = "unibook_admin_marquee";

const DEFAULT_CATEGORIES = [
  "كتب أجنبية (English & International)",
  "طب وعلوم صحية (Medicine & Health)",
  "حاسوب وذكاء اصطناعي (Computer Science & AI)",
  "هندسة وتكنولوجيا (Engineering & Tech)",
  "إدارة واقتصاد دولي (Business & Economics)",
  "قانون وعلوم سياسية (Law & Politics)",
  "علوم طبيعية وفيزياء (Sciences & Physics)",
  "علم النفس والاجتماع (Psychology & Social Sciences)",
  "لغات وآداب عالمية (World Literature)",
  "كتب أكاديمية ومراجع جامعية (Academic References)",
  "روايات عالمية (World Fiction)",
  "تطوير الذات والقيادة (Self-Development)",
  "فلسفة وفكر (Philosophy)",
  "تاريخ وحضارات (History)",
  "دراسات إسلامية (Islamic Studies)",
];

const DEFAULT_BANNERS: SiteBanner[] = [
  {
    id: "banner-1",
    title: "موسم القراءة والكتب الحصرية من دار عبيد",
    subtitle: "خصومات حصرية حتى 30% على كافة الإصدارات الورقية مع شحن فوري لكافة الدول.",
    badge: "عرض خاص",
    linkText: "تصفح العروض الآن",
    linkUrl: "/books",
    active: true,
    color: "from-amber-600 to-primary",
  },
];

// Helper for safe localStorage access
function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("unibook_admin_update"));
  } catch {
    // ignore storage errors
  }
}

// 1. Categories Management
export function getAdminCategories(): string[] {
  return getStorageItem<string[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES);
}

export function addAdminCategory(category: string): string[] {
  const cat = category.trim();
  if (!cat) return getAdminCategories();
  const current = getAdminCategories();
  if (current.includes(cat)) return current;
  const updated = [...current, cat];
  setStorageItem(CATEGORIES_KEY, updated);
  return updated;
}

export function removeAdminCategory(category: string): string[] {
  const current = getAdminCategories();
  const updated = current.filter((c) => c !== category);
  setStorageItem(CATEGORIES_KEY, updated);
  return updated;
}

// 2. Book Discounts & Offers
export function getAdminDiscounts(): Record<string, BookDiscount> {
  return getStorageItem<Record<string, BookDiscount>>(DISCOUNTS_KEY, {});
}

export function setBookDiscount(discount: BookDiscount): void {
  const current = getAdminDiscounts();
  current[discount.bookId] = discount;
  setStorageItem(DISCOUNTS_KEY, current);
}

export function removeBookDiscount(bookId: string): void {
  const current = getAdminDiscounts();
  delete current[bookId];
  setStorageItem(DISCOUNTS_KEY, current);
}

// 3. Reader, Author & Publisher Approvals
export function getAccountApprovals(): AccountApproval[] {
  const list = getStorageItem<AccountApproval[]>(APPROVALS_KEY, [
    {
      userId: "demo-author-1",
      role: "author",
      name: "د. إبراهيم الفقي",
      email: "ibrahim@unibook.online",
      status: "approved",
      appliedAt: "2026-11-01T10:00:00Z",
      approvedAt: "2026-11-01T11:00:00Z",
      notes: "مؤلف وباحث معتمد في العلوم الإنسانية",
    },
    {
      userId: "demo-publisher-1",
      role: "publisher",
      name: "دار عبيد للنشر والتوزيع",
      email: "darobaid@unigates.online",
      status: "approved",
      appliedAt: "2026-10-15T09:00:00Z",
      approvedAt: "2026-10-15T09:30:00Z",
      notes: "المؤسسة الرئيسية الرسمية المعتمدة",
    },
  ]);

  // One-time repair for author accounts that were accidentally overwritten as reader on login
  if (typeof window !== "undefined" && !window.localStorage.getItem("unibook_fix_author_role_v2")) {
    let modified = false;
    for (const item of list) {
      if (item.email?.trim().toLowerCase() === "foodk663@gmail.com" && item.role === "reader") {
        item.role = "author";
        item.status = "pending";
        delete item.approvedAt;
        modified = true;
      }
    }
    window.localStorage.setItem("unibook_fix_author_role_v2", "1");
    if (modified) {
      setStorageItem(APPROVALS_KEY, list);
    }
  }

  return list;
}

export function getUserApprovalStatus(
  userId?: string | null,
  email?: string | null,
  role?: "reader" | "author" | "publisher" | "admin"
): "pending" | "approved" | "rejected" {
  const normalizedEmail = email?.trim().toLowerCase() || "";
  if (normalizedEmail === "highsupply2025@gmail.com" || role === "admin") return "approved";

  const approvals = getAccountApprovals();
  const found = approvals.find(
    (a) =>
      (userId && a.userId === userId) ||
      (normalizedEmail && a.email && a.email.trim().toLowerCase() === normalizedEmail)
  );
  if (found) {
    // If the stored record is an author or publisher, strictly use its approval status
    if (found.role === "author" || found.role === "publisher") {
      return found.status === "rejected" ? "rejected" : "approved";
    }
    if (found.role === "reader" && found.status !== "rejected") {
      return "approved";
    }
    return found.status === "rejected" ? "rejected" : "approved";
  }

  if (role === "reader") return "approved";
  return "approved";
}

export function ensureAccountApprovalRecord(params: {
  userId: string;
  role: "reader" | "author" | "publisher";
  name: string;
  email: string;
  forceRoleChange?: boolean;
}): AccountApproval {
  const normalizedEmail = params.email.trim().toLowerCase();
  const current = getAccountApprovals();
  const idx = current.findIndex(
    (a) =>
      (params.userId && a.userId === params.userId) ||
      (normalizedEmail && a.email && a.email.trim().toLowerCase() === normalizedEmail)
  );
  const existing = idx >= 0 ? current[idx] : undefined;
  if (existing) {
    let changed = false;
    if (params.userId && existing.userId !== params.userId) {
      existing.userId = params.userId;
      changed = true;
    }
    // Never downgrade an existing author/publisher record to reader unless forceRoleChange is true
    const canChangeRole =
      params.forceRoleChange ||
      params.role !== "reader" ||
      (existing.role !== "author" && existing.role !== "publisher");

    if (params.role && existing.role !== params.role && canChangeRole) {
      existing.role = params.role;
      if (params.role === "author" || params.role === "publisher") {
        existing.status = "approved";
        existing.approvedAt = new Date().toISOString();
      }
      changed = true;
    }
    if (existing.status === "pending") {
      existing.status = "approved";
      existing.approvedAt = new Date().toISOString();
      changed = true;
    }
    if (params.name && existing.name !== params.name) {
      existing.name = params.name;
      changed = true;
    }
    if (normalizedEmail && existing.email !== normalizedEmail) {
      existing.email = normalizedEmail;
      changed = true;
    }
    if (changed) {
      setStorageItem(APPROVALS_KEY, current);
      void persistMyApprovalToDb(existing);
    }
    return existing;
  }


  const created: AccountApproval = {
    userId: params.userId,
    role: params.role,
    name: params.name || normalizedEmail.split("@")[0] || "مستخدم المنصة",
    email: normalizedEmail,
    status: "approved",
    appliedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  };
  current.unshift(created);
  setStorageItem(APPROVALS_KEY, current);
  void persistMyApprovalToDb(created);
  return created;
}

function mergeApprovalsIntoCache(incoming: AccountApproval[]): AccountApproval[] {
  if (incoming.length === 0) return getAccountApprovals();
  const current = getAccountApprovals();
  let changed = false;

  for (const row of incoming) {
    const normEmail = row.email?.trim().toLowerCase() || "";
    const idx = current.findIndex(
      (a) =>
        (row.userId && a.userId === row.userId) ||
        (normEmail && a.email && a.email.trim().toLowerCase() === normEmail)
    );
    if (idx >= 0) {
      const existing = current[idx]!;
      if (
        existing.status !== row.status ||
        existing.role !== row.role ||
        (row.name && existing.name !== row.name) ||
        (row.userId && existing.userId !== row.userId) ||
        (row.notes && existing.notes !== row.notes)
      ) {
        current[idx] = {
          ...existing,
          ...row,
          email: normEmail || existing.email,
          name: row.name || existing.name,
        };
        changed = true;
      }
    } else {
      current.unshift({ ...row, email: normEmail });
      changed = true;
    }
  }

  if (changed) {
    setStorageItem(APPROVALS_KEY, current);
  }
  return current;
}

async function persistMyApprovalToDb(record: AccountApproval): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;

    const { error: rpcErr } = await supabase.rpc("upsert_my_account_approval", {
      _user_id: record.userId,
      _email: record.email,
      _name: record.name,
      _role: record.role,
    });

    if (rpcErr) {
      await supabase.from("account_approvals").upsert(
        {
          user_id: record.userId,
          email: record.email.trim().toLowerCase(),
          name: record.name,
          role: record.role,
          status: record.status,
          applied_at: record.appliedAt,
          approved_at: record.approvedAt ?? null,
        },
        { onConflict: "user_id" }
      );
      if (record.role === "author" || record.role === "publisher") {
        await supabase.from("publishers").upsert(
          {
            id: record.userId,
            store_name: record.name,
            email: record.email.trim().toLowerCase(),
            account_type: record.role,
            approval_status: record.status,
          },
          { onConflict: "id" }
        );
      }
    }
  } catch {
    /* offline fallback: local cache already saved */
  }
}

export async function syncAccountApprovalsFromDb(): Promise<AccountApproval[]> {
  try {
    const collected: AccountApproval[] = [];

    const { data: rows, error } = await supabase
      .from("account_approvals")
      .select("*")
      .order("applied_at", { ascending: false });

    if (!error && rows) {
      for (const r of rows) {
        collected.push({
          userId: r.user_id,
          role: (r.role as AccountApproval["role"]) || "reader",
          name: r.name || "مستخدم المنصة",
          email: r.email || "",
          status: (r.status as AccountApproval["status"]) || "pending",
          appliedAt: r.applied_at,
          approvedAt: r.approved_at ?? undefined,
          notes: r.notes ?? undefined,
        });
      }
    }

    const { data: pubs, error: pubErr } = await supabase
      .from("publishers")
      .select("id, store_name, email, account_type, approval_status, approval_notes, approved_at, created_at")
      .order("created_at", { ascending: false });

    if (!pubErr && pubs) {
      for (const p of pubs) {
        if (!collected.some((c) => c.userId === p.id)) {
          collected.push({
            userId: p.id,
            role: p.account_type === "publisher" ? "publisher" : "author",
            name: p.store_name || "مؤلف unibook",
            email: p.email || "",
            status: (p.approval_status as AccountApproval["status"]) || "pending",
            appliedAt: p.created_at,
            approvedAt: p.approved_at ?? undefined,
            notes: p.approval_notes ?? undefined,
          });
        }
      }
    }

    return mergeApprovalsIntoCache(collected);
  } catch {
    return getAccountApprovals();
  }
}

export async function syncMyApprovalFromDb(
  userId?: string | null,
  email?: string | null
): Promise<AccountApproval | null> {
  const normEmail = email?.trim().toLowerCase() || "";
  if (!userId && !normEmail) return null;

  try {
    const collected: AccountApproval[] = [];
    let query = supabase.from("account_approvals").select("*");
    if (userId && normEmail) {
      query = query.or(`user_id.eq.${userId},email.ilike.${normEmail}`);
    } else if (userId) {
      query = query.eq("user_id", userId);
    } else if (normEmail) {
      query = query.ilike("email", normEmail);
    }

    const { data: rows, error } = await query;
    if (!error && rows && rows.length > 0) {
      for (const r of rows) {
        collected.push({
          userId: r.user_id,
          role: (r.role as AccountApproval["role"]) || "reader",
          name: r.name || "مستخدم المنصة",
          email: r.email || normEmail,
          status: (r.status as AccountApproval["status"]) || "pending",
          appliedAt: r.applied_at,
          approvedAt: r.approved_at ?? undefined,
          notes: r.notes ?? undefined,
        });
      }
    } else if (userId) {
      const { data: pub } = await supabase
        .from("publishers")
        .select("id, store_name, email, account_type, approval_status, approval_notes, approved_at, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (pub) {
        collected.push({
          userId: pub.id,
          role: pub.account_type === "publisher" ? "publisher" : "author",
          name: pub.store_name || "مؤلف unibook",
          email: pub.email || normEmail,
          status: (pub.approval_status as AccountApproval["status"]) || "pending",
          appliedAt: pub.created_at,
          approvedAt: pub.approved_at ?? undefined,
          notes: pub.approval_notes ?? undefined,
        });
      }
    }

    if (collected.length > 0) {
      mergeApprovalsIntoCache(collected);
      return collected[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateAccountApprovalStatus(
  userId: string,
  status: "approved" | "rejected" | "pending",
  notes?: string,
  meta?: { role?: "reader" | "author" | "publisher"; name?: string; email?: string }
): Promise<boolean> {
  const normalizedEmail = meta?.email?.trim().toLowerCase() || "";
  const current = getAccountApprovals();
  const index = current.findIndex(
    (a) =>
      a.userId === userId ||
      (normalizedEmail && a.email && a.email.trim().toLowerCase() === normalizedEmail)
  );
  const existing = index >= 0 ? current[index] : undefined;
  const resolvedRole = meta?.role || existing?.role || "reader";
  const resolvedName = meta?.name || existing?.name || "مستخدم المنصة";
  const resolvedEmail = normalizedEmail || existing?.email || "user@unibook.store";
  const nowIso = new Date().toISOString();

  if (existing) {
    existing.status = status;
    if (meta?.role) existing.role = meta.role;
    if (meta?.name) existing.name = meta.name;
    if (normalizedEmail) existing.email = normalizedEmail;
    if (notes) existing.notes = notes;
    if (status === "approved") existing.approvedAt = nowIso;
  } else {
    current.unshift({
      userId,
      role: resolvedRole,
      name: resolvedName,
      email: resolvedEmail,
      status,
      appliedAt: nowIso,
      approvedAt: status === "approved" ? nowIso : undefined,
      notes,
    });
  }
  setStorageItem(APPROVALS_KEY, current);

  try {
    const { error: rpcErr } = await supabase.rpc("admin_set_account_approval", {
      _user_id: userId,
      _email: resolvedEmail,
      _name: resolvedName,
      _role: resolvedRole,
      _status: status,
      _notes: notes ?? null,
    });

    if (!rpcErr) return true;

    const { error: upsertErr } = await supabase.from("account_approvals").upsert(
      {
        user_id: userId,
        email: resolvedEmail,
        name: resolvedName,
        role: resolvedRole,
        status,
        notes: notes ?? null,
        approved_at: status === "approved" ? nowIso : null,
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

    if (resolvedRole === "author" || resolvedRole === "publisher") {
      await supabase
        .from("publishers")
        .update({
          approval_status: status,
          approval_notes: notes ?? null,
          approved_at: status === "approved" ? nowIso : null,
          account_type: resolvedRole,
          email: resolvedEmail,
        })
        .eq("id", userId);
    }

    return !upsertErr;
  } catch {
    return false;
  }
}

// 4. Site Banners & Content
export function getAdminBanners(): SiteBanner[] {
  return getStorageItem<SiteBanner[]>(BANNERS_KEY, DEFAULT_BANNERS);
}

export function setAdminBanners(banners: SiteBanner[]): void {
  setStorageItem(BANNERS_KEY, banners);
}

export function getAdminMarqueeText(): string {
  return getStorageItem<string>(
    MARQUEE_KEY,
    "دار عبيد للنشر والتوزيع والطباعة • منصة unibook العالمية • شحن ورقي لكافة الدول • قراءة رقمية فورية • استوديو نشر متكامل للمؤلفين • دعم 24/7"
  );
}

export function setAdminMarqueeText(text: string): void {
  setStorageItem(MARQUEE_KEY, text);
}
