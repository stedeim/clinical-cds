import { NextResponse } from "next/server";
import { z } from "zod";
import { FollowUpCreate } from "@/lib/followup/schema";
import { createFollowUp, listFollowUps, getFollowUp, setFollowUpStatus } from "@/lib/followup/store";
import { dispatchReminder } from "@/lib/followup/dispatch";
import { getCase } from "@/lib/store";
import { recordAudit } from "@/lib/audit";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { composedRateLimit } from "@/lib/rate-limit";

// Follow-up reminders endpoint. Same posture as the other PHI routes: verified
// clinician required, rate-limited, encounter ownership checked before any
// read/write (the browser only ever sends ids).
//
// POST {op:"create", ...FollowUpCreate}  → create a follow-up
// POST {op:"send", followUpId}           → dispatch its reminder (stub channel)
// GET  ?encounterId=                     → list this clinician's follow-ups

export const runtime = "nodejs";

const Body = z.discriminatedUnion("op", [
  FollowUpCreate.extend({ op: z.literal("create") }),
  z.object({ op: z.literal("send"), followUpId: z.string().min(1) }),
  z.object({ op: z.literal("complete"), followUpId: z.string().min(1) }),
]);

async function authedClinician(): Promise<{ id: string }> {
  const userId = await currentUserIdFromCookies();
  return requireEntitledClinician(userId);
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let clinicianId: string;
  try {
    clinicianId = (await authedClinician()).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[followups] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const rl = await composedRateLimit(req, {
    userIdentifier: clinicianId,
    userConfig: { max: 30, windowMs: 60_000, label: "followups" },
    ipConfig: { max: 60, windowMs: 60_000, label: "followups" },
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (body.op === "create") {
    // Ownership gate: the encounter must be this clinician's.
    const record = await getCase(body.encounterId, clinicianId);
    if (!record) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    const followUp = createFollowUp(
      { encounterId: body.encounterId, action: body.action, dueAt: body.dueAt, recipients: body.recipients },
      clinicianId,
    );
    await recordAudit({
      clinicianId,
      action: "followup_create",
      encounterId: body.encounterId,
      detail: { followUpId: followUp.id, recipients: followUp.recipients, dueAt: followUp.dueAt },
    });
    return NextResponse.json({ followUp }, { status: 201 });
  }

  if (body.op === "complete") {
    // The patient reported back (or the loop closed another way) — done.
    const updated = setFollowUpStatus(body.followUpId, clinicianId, "completed");
    if (!updated) {
      return NextResponse.json({ error: "Follow-up not found." }, { status: 404 });
    }
    return NextResponse.json({ followUp: updated });
  }

  // op === "send"
  const followUp = getFollowUp(body.followUpId, clinicianId);
  if (!followUp) {
    return NextResponse.json({ error: "Follow-up not found." }, { status: 404 });
  }
  const dispatch = await dispatchReminder(followUp);
  return NextResponse.json({
    dispatch: {
      recipients: dispatch.recipients,
      channel: dispatch.channel,
      delivered: dispatch.delivered,
      detail: dispatch.detail,
    },
  });
}

export async function GET(req: Request) {
  let clinicianId: string;
  try {
    clinicianId = (await authedClinician()).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[followups] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const rl = await composedRateLimit(req, {
    userIdentifier: clinicianId,
    userConfig: { max: 60, windowMs: 60_000, label: "followups" },
    ipConfig: { max: 90, windowMs: 60_000, label: "followups" },
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const encounterId = new URL(req.url).searchParams.get("encounterId");
  if (!encounterId) {
    return NextResponse.json({ error: "encounterId is required." }, { status: 400 });
  }
  return NextResponse.json({ followUps: listFollowUps(encounterId, clinicianId) });
}
