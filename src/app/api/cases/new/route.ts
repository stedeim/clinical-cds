import { NextResponse } from "next/server";
import { saveCase } from "@/lib/store";
import { CaseIntakeSchema, caseFromIntake } from "@/lib/case-intake";
import { requireVerifiedClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = rateLimit(`cases:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
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
    user = await requireVerifiedClinician(userId);
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
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error("[cases/new]", err);
    return NextResponse.json({ error: "Failed to create case." }, { status: 500 });
  }
}
