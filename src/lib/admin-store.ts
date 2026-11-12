// Administrative state management for site control, approvals, and AI production

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
  return getStorageItem<AccountApproval[]>(APPROVALS_KEY, [
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
}

export function getUserApprovalStatus(
  userId?: string | null,
  email?: string | null,
  role?: "reader" | "author" | "publisher" | "admin"
): "pending" | "approved" | "rejected" {
  const normalizedEmail = email?.trim().toLowerCase() || "";
  if (normalizedEmail === "highsupply2025@gmail.com" || role === "admin") return "approved";
  if (role === "reader") return "approved";

  const approvals = getAccountApprovals();
  const found = approvals.find(
    (a) =>
      (userId && a.userId === userId) ||
      (normalizedEmail && a.email && a.email.trim().toLowerCase() === normalizedEmail)
  );
  if (found) {
    if (found.role === "reader" && found.status === "pending") {
      return "approved";
    }
    return found.status;
  }
  return "pending";
}

export function ensureAccountApprovalRecord(params: {
  userId: string;
  role: "reader" | "author" | "publisher";
  name: string;
  email: string;
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
    if (params.role && existing.role !== params.role) {
      existing.role = params.role;
      changed = true;
    }
    if (params.role === "reader" && existing.status === "pending") {
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
    }
    return existing;
  }

  const isReader = params.role === "reader";
  const created: AccountApproval = {
    userId: params.userId,
    role: params.role,
    name: params.name || normalizedEmail.split("@")[0] || "مستخدم المنصة",
    email: normalizedEmail,
    status: isReader ? "approved" : "pending",
    appliedAt: new Date().toISOString(),
    approvedAt: isReader ? new Date().toISOString() : undefined,
  };
  current.unshift(created);
  setStorageItem(APPROVALS_KEY, current);
  return created;
}

export function updateAccountApprovalStatus(
  userId: string,
  status: "approved" | "rejected" | "pending",
  notes?: string,
  meta?: { role?: "reader" | "author" | "publisher"; name?: string; email?: string }
): void {
  const normalizedEmail = meta?.email?.trim().toLowerCase() || "";
  const current = getAccountApprovals();
  const index = current.findIndex(
    (a) =>
      a.userId === userId ||
      (normalizedEmail && a.email && a.email.trim().toLowerCase() === normalizedEmail)
  );
  const existing = index >= 0 ? current[index] : undefined;
  if (existing) {
    existing.status = status;
    if (meta?.role) existing.role = meta.role;
    if (meta?.name) existing.name = meta.name;
    if (normalizedEmail) existing.email = normalizedEmail;
    if (notes) existing.notes = notes;
    if (status === "approved") existing.approvedAt = new Date().toISOString();
  } else {
    current.unshift({
      userId,
      role: meta?.role || "reader",
      name: meta?.name || "مستخدم المنصة",
      email: normalizedEmail || "user@unibook.store",
      status,
      appliedAt: new Date().toISOString(),
      approvedAt: status === "approved" ? new Date().toISOString() : undefined,
      notes,
    });
  }
  setStorageItem(APPROVALS_KEY, current);
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
