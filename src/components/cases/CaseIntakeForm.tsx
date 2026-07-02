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
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <p className="font-medium">Case created.</p>
        <a href={`/cases/${createdId}`} className="text-clinical underline">
          Open case →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">New case</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="External ref" value={form.externalRef} onChange={(v) => update("externalRef", v)} />
        <Field label="Age" type="number" value={form.ageYears} onChange={(v) => update("ageYears", v)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Sex</label>
        <select
          value={form.sex}
          onChange={(e) => update("sex", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="unknown">Unknown</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="intersex">Intersex</option>
        </select>
      </div>

      <Field label="Chief complaint" required value={form.chiefComplaint} onChange={(v) => update("chiefComplaint", v)} />
      <Area label="HPI" value={form.hpi} onChange={(v) => update("hpi", v)} rows={3} />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProblemsField problems={problems} onChange={setProblems} />
        <MedicationsField medications={medications} onChange={setMedications} />
      </div>
      <Area label="Allergies (comma-separated)" value={form.allergies} onChange={(v) => update("allergies", v)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Area
          label="Vitals"
          value={form.vitals}
          onChange={(v) => update("vitals", v)}
          hint="e.g. BP 128/82 mmHg; HR 74 bpm"
        />
        <Area
          label="Labs"
          value={form.labs}
          onChange={(v) => update("labs", v)}
          hint="e.g. Cr 0.9 mg/dL; WBC 6.2"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-clinical px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "Saving…" : "Create case"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-clinical focus:outline-none"
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 2,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-clinical focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
