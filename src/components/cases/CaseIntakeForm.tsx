"use client";

import { useState, FormEvent } from "react";
import type { Problem, Medication } from "@/lib/types";
import { ProblemsField, MedicationsField } from "@/components/intake/CodedFields";

const DEFAULTS = {
  externalRef: "",
  ageYears: "",
  sex: "unknown",
  chiefComplaint: "",
  hpi: "",
  allergies: "",
  vitals: "",
  labs: "",
  framework: "US",
};

export function CaseIntakeForm() {
  const [form, setForm] = useState(DEFAULTS);
  // Structured entries from the ICD-10/RxTerms pickers (free text still
  // possible inside each picker) — sent as arrays, codes and doses intact.
  const [problems, setProblems] = useState<Problem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedId(null);

    const body = {
      ...form,
      problems,
      medications,
      ageYears: form.ageYears ? Number(form.ageYears) : undefined,
    };

    const res = await fetch("/api/cases/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to create case.");
      setLoading(false);
      return;
    }

    setCreatedId(data.record?.encounter?.id);
    setForm(DEFAULTS);
    setProblems([]);
    setMedications([]);
    setLoading(false);
  }

  if (createdId) {
    return (
      <div className="rounded-[14px] border border-[#CFDCD2] bg-[#EEF2EE] p-5 text-sm text-[#3c5646]">
        <p className="font-medium">Case created.</p>
        <a href={`/cases/${createdId}`} className="font-semibold text-clinical underline">
          Open case →
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_22px_-14px_rgba(50,42,26,.35)]"
    >
      {/* Step 1 — who */}
      <div className="border-b border-[#FBFAF6] px-[22px] py-[18px]">
        <StepHead n={1} title="Who is this?" aside="pseudonymous — no name, no DOB" />
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Field
              label="Patient ref"
              labelAside="· your own MRN / chart no."
              value={form.externalRef}
              onChange={(v) => update("externalRef", v)}
            />
            <p className="mt-1 text-[12px] leading-snug text-[#6b665a]">
              Reuse the same ref for a returning patient — visit history and known allergies
              link automatically.
            </p>
          </div>
          <Field label="Age" type="number" value={form.ageYears} onChange={(v) => update("ageYears", v)} />
          <div>
            <label className="mb-[5px] block text-xs font-semibold text-ink">Sex</label>
            <select
              value={form.sex}
              onChange={(e) => update("sex", e.target.value)}
              className="w-full rounded-[10px] border border-[#E6E4DB] bg-white px-3 py-[10px] text-[14.5px] text-ink outline-none focus:border-[#CFDCD2]"
            >
              <option value="unknown">Unknown</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="intersex">Intersex</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 2 — why */}
      <div className="border-b border-[#FBFAF6] px-[22px] py-[18px]">
        <StepHead n={2} title="Why are they here?" />
        <div className="space-y-[13px]">
          <Field
            label="Chief complaint"
            required
            value={form.chiefComplaint}
            onChange={(v) => update("chiefComplaint", v)}
          />
          <Area
            label="History"
            labelAside="· optional"
            value={form.hpi}
            onChange={(v) => update("hpi", v)}
            rows={2}
          />
        </div>
      </div>

      {/* Step 3 — the chart */}
      <div className="px-[22px] py-[18px]">
        <StepHead n={3} title="The chart" aside="coded entries power the safety checks" />
        <div className="space-y-[13px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProblemsField problems={problems} onChange={setProblems} />
            <MedicationsField medications={medications} onChange={setMedications} />
          </div>
          <p className="-mt-1 text-[12px] leading-snug text-[#6b665a]">
            Doses feed the safety net: reference ceilings, FDA boxed warnings, allergy classes.
          </p>
          <Area
            label="Allergies"
            labelAside="· substance and reaction, comma-separated"
            value={form.allergies}
            onChange={(v) => update("allergies", v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Area
              label="Vitals"
              labelAside="· optional"
              value={form.vitals}
              onChange={(v) => update("vitals", v)}
              hint="e.g. BP 128/82 mmHg; HR 74 bpm"
            />
            <Area
              label="Labs"
              labelAside="· optional"
              value={form.labs}
              onChange={(v) => update("labs", v)}
              hint="e.g. Cr 0.9 mg/dL; WBC 6.2"
            />
          </div>
        </div>
      </div>

      {error && <p className="px-[22px] pb-2 text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3 bg-[#FBFAF6] px-[22px] py-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-[10px] bg-clinical px-[22px] py-3 text-[14.5px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(78,107,87,.55)] disabled:opacity-40"
        >
          {loading ? "Saving…" : "Create case"}
        </button>
        <span className="text-[12.5px] leading-snug text-[#6b665a]">
          Opens the encounter screen — notes, safety checks, and guideline cards build
          themselves from this chart.
        </span>
      </div>
    </form>
  );
}

function StepHead({ n, title, aside }: { n: number; title: string; aside?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-[9px]">
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#EEF2EE] font-mono text-[12px] font-semibold text-[#3c5646]">
        {n}
      </span>
      <h2 className="font-serif text-base font-semibold text-ink">{title}</h2>
      {aside && <span className="text-[12px] text-[#948d7c]">{aside}</span>}
    </div>
  );
}

function Field({
  label,
  labelAside,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  labelAside?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-[5px] block text-xs font-semibold text-ink">
        {label}
        {required && <span className="text-danger">*</span>}
        {labelAside && <span className="ml-1 font-medium text-[#948d7c]">{labelAside}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-[10px] border border-[#E6E4DB] bg-white px-3 py-[10px] text-[14.5px] text-ink outline-none focus:border-[#CFDCD2] focus:shadow-[0_0_0_3px_#F5F7F4]"
      />
    </div>
  );
}

function Area({
  label,
  labelAside,
  value,
  onChange,
  rows = 2,
  hint,
}: {
  label: string;
  labelAside?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-[5px] block text-xs font-semibold text-ink">
        {label}
        {labelAside && <span className="ml-1 font-medium text-[#948d7c]">{labelAside}</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-none rounded-[10px] border border-[#E6E4DB] bg-white px-3 py-[10px] text-[14.5px] leading-relaxed text-ink outline-none focus:border-[#CFDCD2] focus:shadow-[0_0_0_3px_#F5F7F4]"
      />
      {hint && <p className="mt-1 text-[12px] text-[#948d7c]">{hint}</p>}
    </div>
  );
}
