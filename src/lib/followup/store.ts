import type { FollowUp, FollowUpCreateT, FollowUpStatusT } from "./schema";

// In-memory follow-up store (stub mode).
//
// Mirrors memory-store.ts for cases: module-level state that keeps `npm run
// dev` fully working with zero keys, wiped on restart. When Supabase is
// connected, this becomes the fallback and a db/followups.ts path takes over
// (table + RLS ship in supabase/migrations/0004_follow_ups.sql) — same seam
// store.ts uses for cases.

// Anchored on globalThis: in `next dev`, route handlers and server components
// can end up with separate instances of this module across recompiles, which
// would silently fork/reset a plain module-level Map. One process, one store.
const g = globalThis as unknown as { __pabaidFollowUps?: Map<string, FollowUp> };
const followUps = (g.__pabaidFollowUps ??= new Map<string, FollowUp>());

export function createFollowUp(input: FollowUpCreateT, clinicianId: string): FollowUp {
  const item: FollowUp = {
    id: crypto.randomUUID(),
    encounterId: input.encounterId,
    clinicianId,
    action: input.action,
    dueAt: input.dueAt,
    recipients: input.recipients,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  followUps.set(item.id, item);
  return item;
}

export function listFollowUps(encounterId: string, clinicianId: string): FollowUp[] {
  return [...followUps.values()]
    .filter((f) => f.encounterId === encounterId && f.clinicianId === clinicianId)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// All of a clinician's open follow-ups across cases — the dashboard's feed.
// "Open" = pending or sent (a sent reminder still awaits the report-back);
// completed/cancelled items leave the list.
export function listOpenFollowUps(clinicianId: string): FollowUp[] {
  return [...followUps.values()]
    .filter((f) => f.clinicianId === clinicianId && (f.status === "pending" || f.status === "sent"))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function getFollowUp(id: string, clinicianId: string): FollowUp | undefined {
  const f = followUps.get(id);
  return f && f.clinicianId === clinicianId ? f : undefined;
}

export function setFollowUpStatus(
  id: string,
  clinicianId: string,
  status: FollowUpStatusT,
): FollowUp | undefined {
  const f = getFollowUp(id, clinicianId);
  if (!f) return undefined;
  const next = { ...f, status };
  followUps.set(id, next);
  return next;
}

// Test-only reset.
export function _resetFollowUps(): void {
  followUps.clear();
}
