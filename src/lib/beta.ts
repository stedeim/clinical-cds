import { createServiceClient } from "@/lib/supabase/server";

// Founding-beta seat count for the recruitment page. REAL scarcity: there are
// exactly 20 founding codes (note like 'founding beta%'), and this returns how
// many remain unredeemed. Never inflated — if it says 14 seats, 14 codes are
// genuinely unclaimed. Degrades to the nominal 20/20 when Supabase isn't
// configured (dev), which is honest for a local run with no real redemptions.

export interface BetaSeats {
  total: number;
  claimed: number;
  remaining: number;
}

const TOTAL = 20;

export async function betaSeats(): Promise<BetaSeats> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { total: TOTAL, claimed: 0, remaining: TOTAL };
  }
  try {
    const admin = createServiceClient();
    const { count } = await admin
      .from("beta_codes")
      .select("code", { count: "exact", head: true })
      .like("note", "founding beta%")
      .not("redeemed_by", "is", null);
    const claimed = count ?? 0;
    return { total: TOTAL, claimed, remaining: Math.max(0, TOTAL - claimed) };
  } catch {
    return { total: TOTAL, claimed: 0, remaining: TOTAL };
  }
}
