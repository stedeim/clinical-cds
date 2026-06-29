import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { QAPanel } from "@/components/QAPanel";
import { getServerUser } from "@/lib/server-user";
import type { Problem, Medication, Allergy, Vital, Lab } from "@/lib/types";

// Encounter-native view (Moat 2): the case panel and the Q&A live side by side.
// The clinician never leaves the patient context to ask a question.
export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  const { id } = await params;
  const record = await getCase(id, user?.id);
  if (!record) notFound();

  const { patient, encounter } = record;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Case panel — the live encounter context. */}
      <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <a href="/" className="text-sm text-clinical">
            ← All cases
          </a>
          <h2 className="mt-2 text-lg font-semibold">
            {patient.ageYears}
            {patient.sex === "female" ? "F" : patient.sex === "male" ? "M" : ""} patient
          </h2>
          <p className="text-sm text-slate-500">{encounter.chiefComplaint}</p>
        </div>

        {encounter.hpi && (
          <Section title="HPI">
            <p className="text-sm leading-relaxed text-slate-700">{encounter.hpi}</p>
          </Section>
        )}

        <Section title="Problems">
          <ChipList items={encounter.problems.map((p: Problem) => p.label)} empty="None listed" />
        </Section>

        <Section title="Medications">
          <ChipList
            items={encounter.medications.map((m: Medication) => [m.name, m.dose].filter(Boolean).join(" "))}
            empty="None listed"
          />
        </Section>

        <Section title="Allergies">
          <ChipList items={encounter.allergies.map((a: Allergy) => a.substance)} empty="NKDA" />
        </Section>

        <Section title="Vitals">
          <ChipList
            items={encounter.vitals.map((v: Vital) => `${v.name} ${v.value}${v.unit ? " " + v.unit : ""}`)}
            empty="None recorded"
          />
        </Section>

        <Section title="Labs">
          <ChipList
            items={encounter.labs.map((l: Lab) => `${l.name} ${l.value ?? l.valueText}${l.unit ? " " + l.unit : ""}`)}
            empty="None recorded"
          />
        </Section>
      </aside>

      {/* Q&A — contextual to THIS patient. */}
      <QAPanel encounterId={encounter.id} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-sm text-slate-700">
          {it}
        </span>
      ))}
    </div>
  );
}
