import { supabase } from "@/integrations/supabase/client";

export type PlanStatus = "pending" | "active" | "rejected";

export type AuthorPlanRequest = {
  id: string;
  userId: string;
  userEmail: string;
  authorName: string;
  planId: string;
  planTitle: string;
  booksCount: number;
  price: number;
  priceDisplay: string;
  status: PlanStatus;
  walletSender: string;
  reference: string;
  notes?: string;
  rejectionReason?: string;
  requestedAt: string;
  activatedAt?: string;
};

const STORAGE_KEY = "unibook_author_plan_requests";
const ADMIN_WALLET_KEY = "unibook_admin_wallet_number";
const DEFAULT_ADMIN_WALLET = "01024567890"; // Admin e-wallet (Vodafone Cash / InstaPay / STC Pay)

export function getAdminWalletNumber(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ADMIN_WALLET_KEY) || DEFAULT_ADMIN_WALLET;
  }
  return DEFAULT_ADMIN_WALLET;
}

export function setAdminWalletNumber(num: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_WALLET_KEY, num.trim());
  }
}

export function getLocalRequests(): AuthorPlanRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRequests(reqs: AuthorPlanRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
}

/**
 * Fetch all plan requests for the admin
 * Aggregates both local state and Supabase publishers metadata
 */
export async function getAllPlanRequests(): Promise<AuthorPlanRequest[]> {
  const localList = getLocalRequests();

  try {
    const { data: pubs, error } = await supabase
      .from("publishers")
      .select("id, store_name, bio, created_at, author_code");

    if (!error && pubs) {
      pubs.forEach((p) => {
        if (!p.bio) return;
        try {
          const parsed = JSON.parse(p.bio);
          if (parsed && parsed.plan_id) {
            const existingIdx = localList.findIndex((r) => r.userId === p.id);
            const reqObj: AuthorPlanRequest = {
              id: parsed.request_id || p.id,
              userId: p.id,
              userEmail: parsed.user_email || `${p.store_name}@author.unibook`,
              authorName: p.store_name,
              planId: parsed.plan_id,
              planTitle: parsed.plan_title,
              booksCount: parsed.books_count || 1,
              price: parsed.price || 0,
              priceDisplay: parsed.price_display || (parsed.price === 0 ? "مجاناً" : `${parsed.price} ر.س`),
              status: parsed.status || "pending",
              walletSender: parsed.wallet_sender || "—",
              reference: parsed.reference || p.author_code || "—",
              notes: parsed.notes || "",
              rejectionReason: parsed.rejection_reason || "",
              requestedAt: parsed.requested_at || p.created_at,
              activatedAt: parsed.activated_at,
            };

            if (existingIdx >= 0) {
              localList[existingIdx] = { ...localList[existingIdx], ...reqObj };
            } else {
              localList.unshift(reqObj);
            }
          }
        } catch {
          // bio is plain text
        }
      });
      saveLocalRequests(localList);
    }
  } catch {
    // offline fallback
  }

  return localList;
}

/**
 * Get plan request for a specific user
 */
export async function getUserPlanRequest(userId: string): Promise<AuthorPlanRequest | null> {
  const localList = getLocalRequests();
  const found = localList.find((r) => r.userId === userId);

  try {
    const { data: pub } = await supabase
      .from("publishers")
      .select("id, store_name, bio, created_at, author_code")
      .eq("id", userId)
      .maybeSingle();

    if (pub?.bio) {
      try {
        const parsed = JSON.parse(pub.bio);
        if (parsed && parsed.plan_id) {
          const reqObj: AuthorPlanRequest = {
            id: parsed.request_id || pub.id,
            userId: pub.id,
            userEmail: parsed.user_email || "",
            authorName: pub.store_name,
            planId: parsed.plan_id,
            planTitle: parsed.plan_title,
            booksCount: parsed.books_count || 1,
            price: parsed.price || 0,
            priceDisplay: parsed.price_display || (parsed.price === 0 ? "مجاناً" : `${parsed.price} ر.س`),
            status: parsed.status || "pending",
            walletSender: parsed.wallet_sender || "",
            reference: parsed.reference || pub.author_code || "",
            notes: parsed.notes || "",
            rejectionReason: parsed.rejection_reason || "",
            requestedAt: parsed.requested_at || pub.created_at,
            activatedAt: parsed.activated_at,
          };
          return reqObj;
        }
      } catch {
        // regular bio
      }
    }
  } catch {
    // fallback
  }

  return found || null;
}

export function hasUsedFreePlan(userId: string | undefined, metadata?: Record<string, unknown>): boolean {
  if (!userId) return false;
  if (metadata?.["free_plan_used"] === true) return true;
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem(`unibook_free_plan_used_${userId}`) === "1") return true;
    } catch {
      /* ignore */
    }
  }
  return getLocalRequests().some((r) => r.userId === userId && r.price === 0);
}

/**
 * Submit a new plan request with wallet transfer details
 */
export async function submitPlanRequest(params: {
  userId: string;
  userEmail: string;
  authorName: string;
  planId: string;
  planTitle: string;
  booksCount: number;
  price: number;
  priceDisplay: string;
  walletSender: string;
  reference: string;
  notes?: string;
}): Promise<AuthorPlanRequest> {
  const isFree = params.price === 0;
  if (isFree && hasUsedFreePlan(params.userId)) {
    throw new Error("FREE_PLAN_ALREADY_USED");
  }
  const nowIso = new Date().toISOString();
  const newReq: AuthorPlanRequest = {
    id: crypto.randomUUID(),
    userId: params.userId,
    userEmail: params.userEmail,
    authorName: params.authorName,
    planId: params.planId,
    planTitle: params.planTitle,
    booksCount: params.booksCount,
    price: params.price,
    priceDisplay: params.priceDisplay,
    status: isFree ? "active" : "pending",
    walletSender: params.walletSender,
    reference: params.reference,
    notes: params.notes || "",
    requestedAt: nowIso,
    ...(isFree ? { activatedAt: nowIso } : {}),
  };

  if (isFree && typeof window !== "undefined") {
    try {
      window.localStorage.setItem("unibook_selected_plan_title", params.planTitle);
      window.localStorage.setItem(`unibook_free_plan_used_${params.userId}`, "1");
    } catch {
      /* ignore */
    }
  }

  // 1. Save locally
  const list = getLocalRequests().filter((r) => r.userId !== params.userId);
  list.unshift(newReq);
  saveLocalRequests(list);

  // 2. Persist into publishers table if user can insert/update
  const bioPayload = JSON.stringify({
    request_id: newReq.id,
    user_email: params.userEmail,
    plan_id: params.planId,
    plan_title: params.planTitle,
    books_count: params.booksCount,
    price: params.price,
    price_display: params.priceDisplay,
    status: isFree ? "active" : "pending",
    wallet_sender: params.walletSender,
    reference: params.reference,
    notes: params.notes || "",
    requested_at: newReq.requestedAt,
    ...(isFree ? { activated_at: nowIso } : {}),
  });

  try {
    const { data: existing } = await supabase
      .from("publishers")
      .select("id")
      .eq("id", params.userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("publishers")
        .update({
          store_name: params.authorName,
          bio: bioPayload,
        })
        .eq("id", params.userId);
    } else {
      await supabase.from("publishers").insert({
        id: params.userId,
        store_name: params.authorName,
        bio: bioPayload,
      });
    }
  } catch (err) {
    console.error("Could not sync plan request to publishers table:", err);
  }

  if (isFree) {
    try {
      await supabase.auth.updateUser({ data: { free_plan_used: true } });
    } catch {
      /* ignore */
    }
  }

  return newReq;
}

/**
 * Admin action: Activate plan request
 */
export async function activatePlanRequest(requestId: string): Promise<boolean> {
  const list = getLocalRequests();
  const req = list.find((r) => r.id === requestId);
  if (!req) return false;

  req.status = "active";
  req.activatedAt = new Date().toISOString();
  saveLocalRequests(list);

  try {
    const { data: pub } = await supabase
      .from("publishers")
      .select("id, bio")
      .eq("id", req.userId)
      .maybeSingle();

    let bioObj: Record<string, unknown> = {};
    if (pub?.bio) {
      try {
        bioObj = JSON.parse(pub.bio);
      } catch {
        bioObj = { original_bio: pub.bio };
      }
    }

    bioObj["status"] = "active";
    bioObj["activated_at"] = req.activatedAt;
    bioObj["plan_id"] = req.planId;
    bioObj["plan_title"] = req.planTitle;
    bioObj["books_count"] = req.booksCount;

    if (pub) {
      await supabase
        .from("publishers")
        .update({ bio: JSON.stringify(bioObj) })
        .eq("id", req.userId);
    } else {
      await supabase.from("publishers").insert({
        id: req.userId,
        store_name: req.authorName,
        bio: JSON.stringify(bioObj),
      });
    }
  } catch (err) {
    console.error("Could not activate in publishers table:", err);
  }

  return true;
}

/**
 * Admin action: Reject plan request
 */
export async function rejectPlanRequest(requestId: string, reason?: string): Promise<boolean> {
  const list = getLocalRequests();
  const req = list.find((r) => r.id === requestId);
  if (!req) return false;

  req.status = "rejected";
  req.rejectionReason = reason || "تعذر تأكيد استلام تحويل المحفظة";
  saveLocalRequests(list);

  try {
    const { data: pub } = await supabase
      .from("publishers")
      .select("id, bio")
      .eq("id", req.userId)
      .maybeSingle();

    if (pub?.bio) {
      try {
        const bioObj = JSON.parse(pub.bio);
        bioObj.status = "rejected";
        bioObj.rejection_reason = req.rejectionReason;
        await supabase
          .from("publishers")
          .update({ bio: JSON.stringify(bioObj) })
          .eq("id", req.userId);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.error("Could not sync rejection:", err);
  }

  return true;
}
