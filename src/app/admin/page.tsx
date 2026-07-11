import { notFound } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { getCurrentClinician } from "@/lib/clinician";
import { createServiceClient } from "@/lib/supabase/server";
import { ReviewActions } from "@/components/admin/ReviewActions";

// Admin review queue: pending clinicians with the license details they gave
// at signup, plus a link to the licensing body's public register to check
// against. Approve/reject writes the decision and audits it. Admins only —
// everyone else gets a 404, not a hint.

export const metadata = { title: "Review queue — Pabaid" };

// Public register search pages for common licensing bodies — a convenience
// link for the reviewer, not an integration.
const REGISTER_LINKS: Record<string, string> = {
  CPSO: "https://doctors.cpso.on.ca/",
  CPSBC: "https://www.cpsbc.ca/public/registrant-directory",
  CPSA: "https://search.cpsa.ca/",
  GMC: "https://www.gmc-uk.org/registration-and-licensing/the-medical-register",
  AHPRA: "https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx",
  MCNZ: "https://www.mcnz.org.nz/registration/register-of-doctors/",
  IMC: "https://www.medicalcouncil.ie/public-information/check-the-register/",
  NPPES: "https://npiregistry.cms.hhs.gov/",
};

interface PendingRow {
  id: string;
  full_name: string;
  credential: string;
  country: string;
  npi: string | null;
  license_number: string | null;
  license_body: string | null;
  created_at: string;
}

export default async function AdminPage() {
  const user = await getServerUser();
  const me = user ? await getCurrentClinician(user.id) : null;
  if (!me || me.role !== "admin") notFound();

  const admin = createServiceClient();
  const { data } = await admin
    .from("clinicians")
    .select("id, full_name, credential, country, npi, license_number, license_body, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });
  const pending = (data ?? []) as PendingRow[];

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div>
        <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink">
          Review queue
        </h1>
        <p className="mt-1 text-[14px] text-[#6b665a]">
          {pending.length === 0
            ? "No clinicians waiting — the queue is clear."
            : `${pending.length} clinician${pending.length === 1 ? "" : "s"} waiting for verification. Check the register, then decide.`}
        </p>
      </div>

      {pending.map((p) => {
        const registerUrl = p.license_body
          ? REGISTER_LINKS[p.license_body.toUpperCase().replace(/[^A-Z]/g, "")]
          : undefined;
        return (
          <div
            key={p.id}
            className="rounded-[14px] bg-white p-5 shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[15.5px] font-semibold text-ink">
                {p.full_name}
                <span className="ml-2 text-[13px] font-normal text-[#6b665a]">{p.credential}</span>
                <span className="ml-2 rounded bg-[#EEF2EE] px-1.5 py-0.5 font-mono text-[10.5px] text-[#3c5646]">
                  {p.country}
                </span>
              </div>
              <span className="text-[12px] text-[#948d7c]">
                signed up {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-[13.5px] text-[#3c3a33]">
              {p.npi && (
                <div>
                  NPI: <span className="font-mono">{p.npi}</span>{" "}
                  <a className="text-clinical underline" href={REGISTER_LINKS.NPPES} target="_blank" rel="noreferrer">
                    check NPPES ↗
                  </a>
                </div>
              )}
              {p.license_number ? (
                <div>
                  License: <span className="font-mono">{p.license_number}</span>
                  {p.license_body && <> · {p.license_body}</>}{" "}
                  {registerUrl && (
                    <a className="text-clinical underline" href={registerUrl} target="_blank" rel="noreferrer">
                      open register ↗
                    </a>
                  )}
                </div>
              ) : (
                !p.npi && <div className="text-[#948d7c]">No registration details provided.</div>
              )}
            </div>
            <div className="mt-4">
              <ReviewActions clinicianId={p.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
