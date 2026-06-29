import { NextResponse } from "next/server";
import { saveCase } from "@/lib/store";
import { CaseIntakeSchema, caseFromIntake } from "@/lib/case-intake";
import { getServerUser } from "@/lib/server-user";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
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
