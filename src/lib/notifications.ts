export type NotifCounts = {
  projects: number;
  invoices: number;
  books: number;
  earnings: number;
  orders: number;
};

export type NotifKey = keyof NotifCounts;

const EMPTY_COUNTS: NotifCounts = {
  projects: 0,
  invoices: 0,
  books: 0,
  earnings: 0,
  orders: 0,
};

function storageKey(uid: string): string {
  return `unibook_seen_notif_${uid}`;
}

export function getSeenCounts(uid: string | undefined): NotifCounts {
  if (!uid || typeof window === "undefined") return { ...EMPTY_COUNTS };
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return { ...EMPTY_COUNTS };
    return { ...EMPTY_COUNTS, ...(JSON.parse(raw) as Partial<NotifCounts>) };
  } catch {
    return { ...EMPTY_COUNTS };
  }
}

export function markNotifSeen(uid: string | undefined, key: NotifKey, currentCount: number): void {
  if (!uid || typeof window === "undefined") return;
  const seen = getSeenCounts(uid);
  seen[key] = currentCount;
  try {
    window.localStorage.setItem(storageKey(uid), JSON.stringify(seen));
    window.dispatchEvent(new Event("unibook_notif_seen"));
  } catch {
    /* ignore */
  }
}

export function getUnseenCounts(uid: string | undefined, current: NotifCounts | undefined): NotifCounts {
  if (!current) return { ...EMPTY_COUNTS };
  const seen = getSeenCounts(uid);
  return {
    projects: Math.max(0, current.projects - seen.projects),
    invoices: Math.max(0, current.invoices - seen.invoices),
    books: Math.max(0, current.books - seen.books),
    earnings: Math.max(0, current.earnings - seen.earnings),
    orders: Math.max(0, current.orders - seen.orders),
  };
}
