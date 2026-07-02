// US clinician verification against the NPPES NPI Registry.
//
// The registry API (npiregistry.cms.hhs.gov) is public, free, and keyless —
// so US verification can be REAL, not a database flag someone sets. Flow:
//   1. offline checksum (Luhn over 80840 + 9 digits) catches typos for free;
//   2. registry lookup: must be an INDIVIDUAL provider (NPI-1) with active
//      status;
//   3. conservative name match between the registry record and the signup
//      name — mismatches are NOT rejected, they go to "pending" for manual
//      review. Auto-verification only ever says yes; a human says no.
// Non-US clinicians (no comparable free registry) stay "pending" for manual
// review — stated honestly in the UI.
//
// Privacy: NPI + name are public provider directory data — no PHI involved.

export interface NpiRegistryRecord {
  enumerationType: string; // "NPI-1" individual, "NPI-2" organization
  firstName: string;
  lastName: string;
  credential: string | null;
  status: string; // "A" = active
}

export interface VerificationDecision {
  verdict: "verified" | "pending";
  reason: string;
}

// NPI checksum: Luhn over the 10 digits with the "80840" health-industry
// prefix (per CMS). Pure and offline.
export function isValidNpiFormat(npi: string): boolean {
  const digits = npi.trim();
  if (!/^\d{10}$/.test(digits)) return false;
  const full = "80840" + digits;
  let sum = 0;
  // Luhn: rightmost digit is the check digit; double every second digit
  // moving left from it.
  for (let i = 0; i < full.length; i++) {
    let d = parseInt(full[full.length - 1 - i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// Conservative name match: the registry's first AND last name tokens must
// both appear in the name the clinician signed up with (case/punctuation
// insensitive). Middle names and extra credentials in either are fine.
export function matchesName(registryFirst: string, registryLast: string, signupFullName: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, " ")
      .split(/[\s'-]+/)
      .filter(Boolean);
  const signupTokens = new Set(norm(signupFullName));
  const first = norm(registryFirst);
  const last = norm(registryLast);
  if (first.length === 0 || last.length === 0) return false;
  return first.every((t) => signupTokens.has(t)) && last.every((t) => signupTokens.has(t));
}

export async function lookupNpi(npi: string): Promise<NpiRegistryRecord | null> {
  const base = process.env.NPI_REGISTRY_BASE_URL ?? "https://npiregistry.cms.hhs.gov/api/";
  const res = await fetch(`${base}?version=2.1&number=${encodeURIComponent(npi)}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`NPI registry responded ${res.status}`);
  const data = (await res.json()) as {
    result_count?: number;
    results?: {
      enumeration_type?: string;
      basic?: { first_name?: string; last_name?: string; credential?: string; status?: string };
    }[];
  };
  const r = data.results?.[0];
  if (!data.result_count || !r?.basic) return null;
  return {
    enumerationType: r.enumeration_type ?? "",
    firstName: r.basic.first_name ?? "",
    lastName: r.basic.last_name ?? "",
    credential: r.basic.credential ?? null,
    status: r.basic.status ?? "",
  };
}

// The decision. Auto-verification can only say "verified" on a full match;
// every ambiguity lands in "pending" (manual review), never auto-reject.
export async function verifyClinicianNpi(args: {
  npi: string;
  fullName: string;
}): Promise<VerificationDecision> {
  if (!isValidNpiFormat(args.npi)) {
    return { verdict: "pending", reason: "NPI failed checksum — check for a typo; held for manual review." };
  }

  let record: NpiRegistryRecord | null;
  try {
    record = await lookupNpi(args.npi);
  } catch {
    return { verdict: "pending", reason: "NPI registry unreachable — held for manual review." };
  }

  if (!record) {
    return { verdict: "pending", reason: "NPI not found in the NPPES registry — held for manual review." };
  }
  if (record.enumerationType !== "NPI-1") {
    return { verdict: "pending", reason: "NPI belongs to an organization, not an individual — held for manual review." };
  }
  if (record.status !== "A") {
    return { verdict: "pending", reason: "NPI is not active in the registry — held for manual review." };
  }
  if (!matchesName(record.firstName, record.lastName, args.fullName)) {
    return { verdict: "pending", reason: "Name does not match the NPPES record — held for manual review." };
  }

  return { verdict: "verified", reason: "Matched active individual provider in the NPPES registry." };
}
