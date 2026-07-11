import { EncounterView } from "@/components/encounter/EncounterView";
import { sampleCase } from "@/lib/sample-case";

// Public sample encounter — value before the signup wall. A visiting clinician
// gets the real product on a synthetic patient: the dose flag, the allergy
// conflict, transcript grounding, and the Q&A engine all work here without an
// account. Fully interactive on purpose (the IKEA effect: trying it beats a
// screenshot tour); nothing they do here is persisted.
export const metadata = { title: "Sample encounter — Pabaid" };

export default function SamplePage() {
  return (
    <div>
      <div className="mx-auto mb-1 mt-5 flex max-w-[1240px] px-4 flex-wrap items-center gap-3 rounded-xl border border-[#CFDCD2] bg-[#EEF2EE] px-4 py-3">
        <p className="min-w-[260px] flex-1 text-[13.5px] leading-snug text-[#3c5646]">
          <b className="font-semibold">This is a sample encounter — synthetic patient, fully
          interactive.</b>{" "}
          Try it: correct the flagged dose, resolve the allergy conflict, add a transcript,
          ask the assistant a question. Nothing here is saved.
        </p>
        <a
          href="/auth/signup"
          className="rounded-[10px] bg-clinical px-4 py-[9px] text-[13px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)]"
        >
          Try it for free for 14 days →
        </a>
      </div>
      <EncounterView record={sampleCase} sample />
    </div>
  );
}
