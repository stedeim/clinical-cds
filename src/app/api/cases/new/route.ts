import { NextResponse } from "next/server";
import { saveCase } from "@/lib/store";
import { CaseIntakeSchema, caseFromIntake } from "@/lib/case-intake";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordPrescribingEvents } from "@/lib/regional/record";
import { detectFramework } from "@/lib/geo";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = await rateLimit(`cases:${clientIp(req)}`, { max: 20, windowMs: 60_000, label: "cases" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // Case intake stores PHI — same verified-clinician gate as /api/note and
  // /api/query (previously any authenticated user could create cases).
  let user: { id: string };
  try {
    const userId = await currentUserIdFromCookies();
    user = await requireEntitledClinician(userId);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[cases/new] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CaseIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const caseContext = caseFromIntake(parsed.data, user.id);
    const record = await saveCase(caseContext, user.id);

    // Append-only audit row: who created a case, when, and which encounter it
    // links to. No PHI beyond the encounter id (matches the /api/query pattern).
    void recordAudit({
      clinicianId: user.id,
      action: "case_create",
      encounterId: record.encounter.id,
    }).catch(() => {});

    // Fire-and-forget: de-identified prescribing events for the regional
    // peer-stats loop (no-op in stub mode; never blocks or fails the request).
    const framework = detectFramework(req.headers);
    void recordPrescribingEvents({ caseContext, framework }).catch(() => {});

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error("[cases/new]", err);
    return NextResponse.json({ error: "Failed to create case." }, { status: 500 });
  }
}
